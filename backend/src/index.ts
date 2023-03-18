import { findConfig } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import path from "path"
import { fileURLToPath } from "url"

installSourceMap()

export interface NodeConfig {
  url: string
}

export interface PolymorphismConfig extends Record<string, string> {
  type: string
}

export interface AppConfig {
  hostname: string
  port: number
  root: string
  name: string
  server?: NodeConfig
  authentication?: PolymorphismConfig
  rebuildInterval: number
  fileTypePatterns: Record<string, string>
}

const defaultConfig: AppConfig = {
  hostname: "127.0.0.1",
  port: 80,
  root: ".",
  name: "My Directory",
  rebuildInterval: 3000,
  fileTypePatterns: {
    "**/*.mp4": "video/mp4",
    "**/*.png": "image/png",
    "**/*.+(jpeg|jpg)": "image/jpeg"
  }
}

const configFileName = "homestreaming.config.json"
const config = findConfig(
  {
    rootDir: path.dirname(fileURLToPath(import.meta.url)),
    filename: configFileName,
    defaultConfig,
  }
)
startServer(config)
