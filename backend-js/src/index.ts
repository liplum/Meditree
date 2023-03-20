import { type AppConfig, findConfig, FileType } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import path from "path"
import { fileURLToPath } from "url"

installSourceMap()

const defaultConfig: AppConfig = {
  name: "My Directory",
  root: ".",
  port: 80,
  rebuildInterval: 3000,
  fileType: {
    "video/mp4": FileType.video,
    "image/png": FileType.image,
    "image/jpeg": FileType.image,
    "audio/mpeg": FileType.audio,
  },
  fileTypePattern: {
    "**/*.mp4": "video/mp4",
    "**/*.png": "image/png",
    "**/*.+(jpeg|jpg)": "image/jpeg",
    "**/*.mp3": "audio/mpeg",
  },
}

const config = findConfig({
  rootDir: path.dirname(fileURLToPath(import.meta.url)),
  filename: "medimesh.json",
  defaultConfig,
})

startServer(config)
