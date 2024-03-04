import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { type File } from "./file.js"

export interface AppConfig {
  /** 
   * The network interface on which the application will listen for incoming connections.
   * 0.0.0.0(all interfaces) by default.
   */
  hostname?: string
  /** 
   * Port 80 is used by default.
   */
  port: number
  /**
   * The root directory to host.
   *
   * By default, no local file tree will be created.
   * 
   * If an array of paths is given, a virtual file tree will be created with the given paths.
   * 
   * If a map of name to path is given, a virtual file tree will be created with the specified names and paths.
   */
  root?: string | string[] | Record<string, string>
  /**
   * The unique name of hosted file tree.
   * If not specified, a uuid v4 will be generated.
   */
  name: string
  /**
   * Minimatch pattern to content type.
   */
  fileType: Record<string, string>
  /**
   * The included content type.
   * Including all files by default.
   */
  includes?: string[]
  /**
   * Plugin name/url to its configuration.
   */
  plugin?: Record<string, Record<string, any> | boolean>
  ignore: string[]
  /**
   * 7 days by default.
   */
  cacheMaxAge: number
  /**
   * The minimum log level for console logging.
   * Auto-capitalized.
   * "INFO" by default.
   */
  logLevel?: string
}

export function setupConfig(config: AppConfig | Partial<AppConfig> = {}): AppConfig {
  const newConfig = config as AppConfig
  if (!newConfig.name) {
    newConfig.name = uuidv4()
  }
  if (!newConfig.fileType) {
    newConfig.fileType = {
      "**/*.mp4": "video/mp4",
      "**/*.svg": "image/svg+xml",
      "**/*.+(mov|qt)": "video/quicktime",
      "**/*.png": "image/png",
      "**/*.+(jpeg|jpg)": "image/jpeg",
      "**/*.mp3": "audio/mpeg",
      "**/*.md": "text/markdown",
      "**/*.txt": "text/plain",
      "**/*.gif": "image/gif",
      "**/*.webp": "image/webp",
      "**/*.m3u8": "application/x-mpegURL",
      "**/*.ts": "video/mpeg",
    }
  }
  if (!newConfig.port) {
    newConfig.port = 8080
  }
  if (!newConfig.ignore) {
    newConfig.ignore = []
    // default to ignore application on macOS
    if (process.platform === "darwin") {
      newConfig.ignore.push(
        "**/*.app",
        "**/*.DS_Store"
      )
    }
  }
  if (newConfig.cacheMaxAge === undefined) {
    newConfig.cacheMaxAge = 604800
  }
  return newConfig
}

export function loadConfigFromFile(configFi: File): AppConfig {
  if (!configFi.readable) {
    return setupConfig()
  }
  const data = fs.readFileSync(configFi.path, "utf8")
  let json: any
  try {
    json = JSON.parse(data)
  } catch {
    json = {}
  }
  const config = setupConfig(json)
  if (configFi.writable) {
    fs.writeFileSync(configFi.path, JSON.stringify(config, null, 2))
  }
  return config
}
