import fs from "fs"
import path from "path"

export enum ForwardType {
  socket = "socket",
  redirect = "redirect",
}

export interface CentralConfig {
  server: string
  forward: ForwardType
  [key: string]: string
}

type PublicKey = string
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
   * Default is 3000.
   */
  port: number
  /**
   * The root directory to host.
   * Default is ".".
   */
  root: string
  /**
   * The name of hosted file tree.
   * Default is "My Directory".
   */
  name: string
  /**
   * Default is none.
   */
  central?: CentralConfig
  /**
   * The public key of node.
   * Default is none.
   */
  node?: PublicKey[]
  /**
   * If set, requests need passcode in authentication headers, body or cookies.
   */
  passcode?: string
  rebuildInterval: number
  fileTypePattern: Record<string, string>
  fileType: Record<string, FileType>
}

export interface FindConfigArgs<T> {
  rootDir: string
  filename: string
  defaultConfig: T
}

export function findConfig<T>(args: FindConfigArgs<T>): T {
  const { rootDir, filename, defaultConfig } = args
  function readConfig(configFile: string): T {
    const config = Object.assign({}, defaultConfig, JSON.parse(fs.readFileSync(configFile).toString()))
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
    return config
  }
  const curDir = rootDir
  let configFile = findFsEntryInTree(curDir, filename)
  if (!configFile) {
    configFile = path.join(curDir, filename)
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2))
    throw new Error(`Configuration not found. ${configFile} is created.`)
  }
  return readConfig(configFile)
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
