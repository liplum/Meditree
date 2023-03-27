import fs from "fs"
import path from "path"

export enum FileType {
  video = "video",
  image = "image",
  audio = "audio",
  text = "text",
}

export interface AppConfig {
  /** 
   * The network interface on which the application will listen for incoming connections.
   * Default is for all interfaces.
   */
  hostname?: string
  /** 
   * Default is 80.
   */
  port: number
  /**
   * The root directory to host.
   * Default is ".".
   */
  root: string
  /**
   * The unique name of hosted file tree.
   * If not specified, a uuid v4 will be generated.
   */
  name: string
  /**
   * If set, requests need passcode in authentication headers, body or cookies.
   */
  passcode?: string
  rebuildInterval: number
  fileTypePattern: Record<string, string>
  fileType: Record<string, FileType>
  [key: string]: any
}

export interface FindConfigArgs<T> {
  rootDir: string
  filename: string
  defaultConfig: T
}

export function findConfig<T>(args: FindConfigArgs<T | Partial<T>>, setup?: (config: any) => void): T {
  const { rootDir, filename, defaultConfig } = args
  const curDir = rootDir
  let configFile = findFsEntryInTree(curDir, filename)
  if (configFile) {
    const config = Object.assign({}, defaultConfig, JSON.parse(fs.readFileSync(configFile).toString()))
    setup?.(config)
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
    return config
  } else {
    configFile = path.join(curDir, filename)
    const config = { ...defaultConfig }
    setup?.(config)
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
    throw new Error(`Configuration not found. ${configFile} is created.`)
  }
}

function findFsEntryInTree(dir: string, fileName: string): string | null {
  let lastDir: string | null = null
  while (dir !== lastDir) {
    const configFile = path.join(dir, fileName)
    if (fs.existsSync(configFile)) {
      return configFile
    } else {
      lastDir = dir
      dir = path.dirname(dir)
    }
  }
  return null
}
