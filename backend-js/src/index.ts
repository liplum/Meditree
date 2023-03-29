import { type AppConfig, findConfig, FileType, setupConfig } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import path from "path"
import { fileURLToPath, pathToFileURL } from "url"

installSourceMap()

const defaultConfig: Partial<AppConfig> = {
  root: ".",
  port: 80,
  rebuildInterval: 3000,
  fileType: {
    "video/mp4": FileType.video,
    "image/png": FileType.image,
    "image/jpeg": FileType.image,
    "image/svg+xml": FileType.image,
    "image/gif": FileType.image,
    "image/webp": FileType.image,
    "audio/mpeg": FileType.audio,
    "text/markdown": FileType.text,
    "text/plain": FileType.text,
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
}

// default to ignore application on macOS
if (process.platform === "darwin") {
  defaultConfig.ignore = [
    "**/*.app"
  ]
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = findConfig({
    rootDir: path.dirname(fileURLToPath(import.meta.url)),
    filename: "meditree.json",
    defaultConfig,
  }, setupConfig)
  // module was not imported but called directly
  startServer(config)
}
