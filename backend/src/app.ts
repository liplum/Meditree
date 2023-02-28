import * as fs from "fs"
import { findFileInFileTree } from "./file.js"
import { startServer } from "./server.js"
import * as path from "path"
import { fileURLToPath } from "url"
import { install as installSourceMap } from "source-map-support"

installSourceMap()

export let config = {
  hostname: "127.0.0.1",
  port: 80,
  root: ".",
  name: "My Directory",
  fileTypePatterns: {
    "**/*.mp4": "video/mp4",
    "**/*.png": "image/png",
    "**/*.+(jpeg|jpg)": "image/jpeg"
  }
}
const configFileName = "homestreaming-config.json"
function findConfig(): void {
  const _dirname = path.dirname(fileURLToPath(import.meta.url))
  const curDir = path.dirname(_dirname)
  let configFile: string | null = findFileInFileTree(curDir, configFileName)
  if (configFile == null) {
    configFile = path.join(curDir, configFileName)
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
    throw new Error(`Configuration not found. ${configFile} is created.`)
  }
  const rawdata = fs.readFileSync(configFile).toString()
  const configObj = JSON.parse(rawdata)
  config = Object.assign({}, config, configObj)
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
}

findConfig()
await startServer()
