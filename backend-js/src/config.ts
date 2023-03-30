import fs from "fs"
import path from "path"
import nacl from "tweetnacl"
import { v4 as uuidv4 } from "uuid"

export enum MediaType {
  video = "video",
  image = "image",
  audio = "audio",
  text = "text",
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
export interface AsCentralConfig {
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

export interface AsNodeConfig {
  name: string
  central: CentralConfig[]
  publicKey: string
  privateKey: string
  passcode?: string
}

export interface AppConfig extends AsCentralConfig, AsNodeConfig {
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
   * The display name of the server.
   * If not specified, {@link name} will be used.
   */
  displayName?: string
  /**
   * If set, requests need passcode in authentication headers, body or cookies.
   */
  passcode?: string
  rebuildInterval: number
  fileTypePattern: Record<string, string>
  mediaType: Record<string, MediaType>
  ignore?: string[]
  [key: string]: any
}

const defaultConfig: Partial<AppConfig> = {
  root: ".",
  port: 80,
  rebuildInterval: 3000,
  mediaType: {
    "video/mp4": MediaType.video,
    "image/png": MediaType.image,
    "image/jpeg": MediaType.image,
    "image/svg+xml": MediaType.image,
    "image/gif": MediaType.image,
    "image/webp": MediaType.image,
    "audio/mpeg": MediaType.audio,
    "text/markdown": MediaType.text,
    "text/plain": MediaType.text,
  },
  fileTypePattern: {
    "**/*.mp4": "video/mp4",
    "**/*.svg": "image/svg+xml",
    "**/*.png": "image/png",
    "**/*.+(jpeg|jpg)": "image/jpeg",
    "**/*.mp3": "audio/mpeg",
    "**/*.md": "text/markdown",
    "**/*.txt": "text/plain",
    "**/*.gif": "image/gif",
    "**/*.webp": "image/webp",
  },
  central: [],
  node: [],
}

// default to ignore application on macOS
if (process.platform === "darwin") {
  defaultConfig.ignore = [
    "**/*.app",
    "**/*.DS_Store"
  ]
}

export function setupConfig(config?: AppConfig | Partial<AppConfig>): AppConfig {
  const newConfig: AppConfig = Object.assign({}, defaultConfig, config ?? {}) as AppConfig
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
  return newConfig
}

export function findConfig({ rootDir, filename }: { rootDir: string, filename: string }): AppConfig {
  const curDir = rootDir
  let configFile = findFsEntryInTree(curDir, filename)
  if (configFile) {
    const config = setupConfig(JSON.parse(fs.readFileSync(configFile).toString()) ?? {})
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
    return config
  } else {
    configFile = path.join(curDir, filename)
    fs.writeFileSync(configFile, JSON.stringify(setupConfig(), null, 2))
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
