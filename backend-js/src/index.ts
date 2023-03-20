import { type AppConfig, findConfig } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import path from "path"
import { fileURLToPath } from "url"

installSourceMap()

const defaultConfig: AppConfig = {
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

const config = findConfig({
  rootDir: path.dirname(fileURLToPath(import.meta.url)),
  filename: "medimesh.json",
  defaultConfig,
})

startServer(config)
