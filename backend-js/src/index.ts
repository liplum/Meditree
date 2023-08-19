import { loadConfigFromFile } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import path from "path"
import { pathToFileURL } from "url"
import commandLineArgs from "command-line-args"
import { File as FileDelegate } from "./file.js"
import { createLogger } from "@liplum/log"
import fs from "fs"
import { resolveAppStoragePath } from "./env.js"

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  installSourceMap()
  const options = commandLineArgs([
    { name: "config", alias: "i", type: String, defaultOption: true },
  ])
  const log = createLogger("Bootstrap")
  // To try finding the config file in following locations:
  // 1. the specific path passed by command line arguments.
  // 2. the default path in user home: "~/.meditree/config.json"
  const configFi = new FileDelegate(
    options.config
      // load from cmd args
      ? options.config
      // load from home dir
      : resolveAppStoragePath("config.json")
  )
  configFi.ensureParent()
  if (!fs.existsSync(configFi.path)) {
    fs.writeFileSync(configFi.path, "")
  }
  const readableErr = configFi.checkReadable()
  if (readableErr) {
    console.error(new Error(`Cannot read config from ${configFi.path}.`,
      { cause: readableErr }))
    process.exit(1)
  }
  configFi.checkWritable()
  const config = loadConfigFromFile(configFi)
  log.info(`Config is loading from "${path.resolve(configFi.path)}".`)
  startServer(config)
}
