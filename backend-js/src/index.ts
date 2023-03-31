import { findConfig } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import path from "path"
import { fileURLToPath, pathToFileURL } from "url"
import commandLineArgs from "command-line-args"

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  installSourceMap()
  const optionDefinitions = [
    { name: "root", type: String, defaultOption: true },
    { name: "name", type: String },
    { name: "config", type: String },
  ]
  const options = commandLineArgs(optionDefinitions)
  const config = findConfig({
    rootDir: options.root ?? path.dirname(fileURLToPath(import.meta.url)),
    filename: options.config ?? "meditree.json",
  })
  if (options.name) {
    config.name = options.name
  }
  startServer(config)
}
