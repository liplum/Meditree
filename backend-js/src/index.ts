import { findConfig } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import path from "path"
import { fileURLToPath, pathToFileURL } from "url"

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  installSourceMap()
  const config = findConfig({
    rootDir: path.dirname(fileURLToPath(import.meta.url)),
    filename: "meditree.json",
  })
  // module was not imported but called directly
  startServer(config)
}
