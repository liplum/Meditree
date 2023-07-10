import { findConfig } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import path from "path"
import { fileURLToPath, pathToFileURL } from "url"
import commandLineArgs from "command-line-args"
import os from "os"
import { File as FileDelegate } from "./file.js"

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  installSourceMap()
  const options = commandLineArgs([
    { name: "config", alias: "i", type: String, defaultOption: true },
  ])
  // To try finding the config file in following locations:
  // 1. the specific path passed by command line arguments.
  // 2. the default path in user home: "~/.meditree/config.json"
  let configFi: FileDelegate
  if (options.config) {
    configFi = new FileDelegate(options.config)
  } else {
    const home = os.homedir()
    const configPath = path.join(home, ".meditree", "config.json")
    configFi = new FileDelegate(configPath)
  }
  configFi.checkReadable()
  configFi.checkWritable()
  const config = findConfig({
    rootDir: path.dirname(fileURLToPath(import.meta.url)),
    filename: options.config ?? "meditree.json",
  })
  if (options.name) {
    config.name = options.name
  }
  startServer(config)
}
