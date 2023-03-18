import fs from "fs"
import { findFileInFileTree } from "./file.js"
import { startServer } from "./server.js"
import path from "path"
import { fileURLToPath } from "url"
import { install as installSourceMap } from "source-map-support"
import { listenable, type ListenableValue } from "shared"
import chokidar from "chokidar"

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
function readConfig(configFile: string): AppConfig {
  const config = Object.assign({}, defaultConfig, JSON.parse(fs.readFileSync(configFile).toString()))
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
  return config
}
function findConfig(): ListenableValue<AppConfig> {
  const curDir = path.dirname(fileURLToPath(import.meta.url))
  let configFile = findFileInFileTree(curDir, configFileName)
  if (!configFile) {
    configFile = path.join(curDir, configFileName)
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2))
    throw new Error(`Configuration not found. ${configFile} is created.`)
  }
  const config = listenable(readConfig(configFile))
  chokidar.watch(configFile, {
    ignoreInitial: true,
  }).on("all", (event, filePath: string) => {
    console.log(`[${event}] Configuration was changed. ${filePath}`)
    try {
      config.value = readConfig(filePath)
    } catch (e) {
    }
  })

  return config
}

const config = findConfig()
startServer(config)
