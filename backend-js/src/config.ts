import fs from "fs"
import path from "path"
import nacl from "tweetnacl"
import { v4 as uuidv4 } from "uuid"
import { HLSMediaType } from "./plugin/hls.js"

export interface AsParentConfig {
  name: string
  port: number
  /**
   * The public key of node.
   */
  child: string[]
  publicKey: string
  privateKey: string
}

export interface AsChildConfig {
  name: string
  parent: string[]
  publicKey: string
  privateKey: string
  reconnectInterval?: number
}

export interface AppConfig extends AsParentConfig, AsChildConfig {
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
   * If an array of paths is given,a virtual file tree will be created with the given paths.
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
   * //TODO: Unused
   * The display name of the server.
   * If not specified, {@link name} will be used.
   */
  displayName?: string
  fileType: Record<string, string>
  plugin?: Record<string, Record<string, any>>
  ignore?: string[]
  /**
   * 7 days by default.
   */
  cacheMaxAge: number
  /**
   * The directory where the log files are located.
   */
  logDir?: string
  /**
   * The minimum log level for console logging.
   * Auto-capitalized.
   * "INFO" by default.
   */
  logLevel?: string
  [key: string]: any
}

const defaultConfig: Partial<AppConfig> = {
  port: 80,
  rebuildInterval: 3000,
  cacheMaxAge: 604800,
  fileType: {
    "**/*.mp4": "video/mp4",
    "**/*.svg": "image/svg+xml",
    "**/*.png": "image/png",
    "**/*.+(jpeg|jpg)": "image/jpeg",
    "**/*.mp3": "audio/mpeg",
    "**/*.md": "text/markdown",
    "**/*.txt": "text/plain",
    "**/*.gif": "image/gif",
    "**/*.webp": "image/webp",
    "**/*.m3u8": HLSMediaType,
    "**/*.ts": "video/mpeg", // TODO: conflict with typescript file
  },
  parent: [],
  child: [],
}

// default to ignore application on macOS
if (process.platform === "darwin") {
  defaultConfig.ignore = [
    "**/*.app",
    "**/*.DS_Store"
  ]
}

export function injectDefaultConfig(config?: AppConfig | Partial<AppConfig>): AppConfig {
  const newConfig: AppConfig = Object.assign({}, defaultConfig, config ?? {}) as AppConfig
  return newConfig
}

export function setupConfig(config?: AppConfig | Partial<AppConfig>): AppConfig {
  const newConfig = (config ? { ...config } : {}) as AppConfig
  if (newConfig.privateKey) {
    if (!newConfig.publicKey) {
      newConfig.publicKey = Buffer.from(nacl.box.keyPair.fromSecretKey(Uint8Array.from(Buffer.from(newConfig.privateKey))).publicKey).toString("base64")
    }
  } else if (!newConfig.publicKey) {
    const { publicKey, secretKey } = nacl.box.keyPair()
    newConfig.publicKey = Buffer.from(publicKey).toString("base64")
    newConfig.privateKey = Buffer.from(secretKey).toString("base64")
  }
  if (!newConfig.name) {
    newConfig.name = uuidv4()
  }
  if (!newConfig.fileType) {
    newConfig.fileType = defaultConfig.fileType as any
  }
  return newConfig
}

export function findConfig({ rootDir, filename }: { rootDir: string, filename: string }): AppConfig {
  let configFile = findFSOInTreeByName(rootDir, filename)
  if (configFile) {
    // if config file exists, read and load it
    const config = setupConfig(JSON.parse(fs.readFileSync(configFile, "utf8")) ?? {})
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
    return config
  } else {
    // if non-existing, try to create it and throw an Error to prompt users.
    const config: AppConfig = setupConfig(defaultConfig)
    // perfer the ancestor that has `package.json` file.
    const ancestors = listAncestors(rootDir)
    const dirHasPackageJson = ancestors.find((dir) =>
      fs.existsSync(path.join(dir, "package.json"))
    )
    if (dirHasPackageJson) {
      rootDir = dirHasPackageJson
    }
    configFile = path.join(rootDir, filename)
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
    throw new Error(`Configuration not found. ${configFile} is created.`)
  }
}

function findFSOInTreeByName(root: string, fileName: string): string | null {
  return findFSOInTree(root, (dir) => path.join(dir, fileName))
}

function findFSOInTree(root: string, attemp: (dir: string) => string | undefined | null): string | null {
  let dir = root
  let lastDir: string | null = null
  while (dir !== lastDir) {
    const configFile = attemp(dir)
    if (configFile && fs.existsSync(configFile)) {
      return configFile
    } else {
      lastDir = dir
      dir = path.dirname(dir)
    }
  }
  return null
}

/**
 * List the existing ancestor directories based on {@link root} given,
 * starting with the nearest ancestor,
 * and ending with the root directory of file system.

 * @param root the root directory path to search
 * @returns a list of all existing ancestors.
 */
function listAncestors(root: string): string[] {
  const ancestors: string[] = []
  let dir = root
  let lastDir: string | null = null
  while (dir !== lastDir) {
    if (fs.existsSync(dir)) {
      ancestors.push(dir)
    }
    lastDir = dir
    dir = path.dirname(dir)
  }
  return ancestors
}
