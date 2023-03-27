import { type AppConfig, findConfig, FileType } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import path from "path"
import { fileURLToPath } from "url"
import nacl from "tweetnacl"
import { v4 as uuidv4 } from "uuid"

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

const config = findConfig({
  rootDir: path.dirname(fileURLToPath(import.meta.url)),
  filename: "meditree.json",
  defaultConfig,
}, (config) => {
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
})

startServer(config)
