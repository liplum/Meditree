import { loadConfigFromFile } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import path from "path"
import { pathToFileURL } from "url"
import commandLineArgs from "command-line-args"
import os from "os"
import { File as FileDelegate } from "./file.js"
import { createLogger } from "./logger.js"
import fs from "fs"

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  installSourceMap()
  const options = commandLineArgs([
    { name: "config", alias: "i", type: String, defaultOption: true },
  ])
  const log = createLogger("Bootstrap")
  // To try finding the config file in following locations:
  // 1. the specific path passed by command line arguments.
  // 2. the default path in user home: "~/.meditree/config.json"
  let configFi: FileDelegate
  if (options.config) {
    // load from cmd args
    configFi = new FileDelegate(options.config)
  } else {
    // load from home dir
    const home = os.homedir()
    const configPath = path.join(home, ".meditree", "config.json")
    configFi = new FileDelegate(configPath)
  }
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
