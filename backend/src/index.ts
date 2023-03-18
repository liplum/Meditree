import fs from "fs"
import { findConfig } from "shared"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"

installSourceMap()

const defaultConfig = {
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
export type AppConfig = typeof defaultConfig

const configFileName = "homestreaming.config.json"

const config = findConfig(configFileName, defaultConfig)
startServer(config)
