import fs from "fs"
import path from "path"
import nacl from "tweetnacl"
import { v4 as uuidv4 } from "uuid"

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

export enum ForwardType {
  socket = "socket",
  redirect = "redirect",
}

export type CentralConfig = {
  server: string
  forward: ForwardType
} & ForwardConfig

export type ForwardConfig = {
  forward: ForwardType.socket
} | {
  forward: ForwardType.redirect
  redirectTo: string
}

export interface MeshAsCentralConfig {
  name: string
  port: number
  /**
   * The public key of node.
   */
  node: string[]
  publicKey: string
  privateKey: string
  passcode?: string
}

export interface MeshAsNodeConfig {
  name: string
  central: CentralConfig[]
  publicKey: string
  privateKey: string
  passcode?: string
}

export interface FindConfigArgs<T> {
  rootDir: string
  filename: string
  defaultConfig: T
}

export function findConfig<T>(args: FindConfigArgs<T | Partial<T>>): T {
  const { rootDir, filename, defaultConfig } = args
  function readConfig(configFile: string): T {
    const config = Object.assign({}, defaultConfig, JSON.parse(fs.readFileSync(configFile).toString()))
    if (config.privateKey) {
      if (!config.publicKey) {
        config.publicKey = Buffer.from(nacl.box.keyPair.fromSecretKey(config.privateKey).publicKey).toString("base64")
      }
    } else if (!config.publicKey) {
      const { publicKey, secretKey } = nacl.box.keyPair()
      config.publicKey = Buffer.from(publicKey).toString("base64")
      config.privateKey = Buffer.from(secretKey).toString("base64")
    }
    if (!config.name) {
      config.name = uuidv4()
    }
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
