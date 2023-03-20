import fs from "fs"
import path from "path"

export enum ForwardType {
  socket = "socket",
  redirect = "redirect",
}

export interface CentralConfig {
  server: string
  forward: ForwardType
}
type PublicKey = string
export interface AppConfig {
  hostname?: string
  port: number
  root: string
  name: string
  central?: CentralConfig
  node?: PublicKey[]
  passcode?: string
  rebuildInterval: number
  fileTypePatterns: Record<string, string>
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
