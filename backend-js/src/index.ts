import { loadConfigFromFile } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import path from "path"
import { File as FileDelegate } from "./file.js"
import { createLogger } from "@liplum/log"
import fs from "fs"
import { existsOrNull, resolveAppStoragePath } from "./env.js"
import esMain from "es-main"
import { cli } from '@liplum/cli'

export interface MainArgs {
  /**
   * The config file path
   */
  config?: string
}

export async function main(args: MainArgs): Promise<void> {
  installSourceMap()
  const log = createLogger("Bootstrap")
  // To try finding the config file in following locations:
  // 1. the specific path passed by command line arguments.
  // 2. the default path in user home: "~/.meditree/config.json"
  const configFi = new FileDelegate(
    // load from cmd args
    args.config
    // load from home dir
    ?? existsOrNull(resolveAppStoragePath("config.yaml"))
    ?? existsOrNull(resolveAppStoragePath("config.yml"))
    ?? resolveAppStoragePath("config.json")
  )
  configFi.ensureParent()
  if (!fs.existsSync(configFi.path)) {
    fs.writeFileSync(configFi.path, "")
  }
  if (args.config && !await configFi.checkReadable()) {
    console.error(new Error(`Cannot read config from ${configFi.path}.`,
      { cause: configFi._lastReadableError }))
    process.exit(1)
  }
  const config = await loadConfigFromFile(configFi)
  log.info(`Config is loading from "${path.resolve(configFi.path)}".`)
  await startServer(config)
}


if (esMain(import.meta)) {
  const args = cli({
    name: 'Medtiree',
    description: 'Share your media anywhere in a tree.',
    examples: ['node dist/index.js -i <config-file>',],
    require: [],
    options: [{
      name: 'config',
      alias: "i",
      description: 'The config file path.'
    },],
  })!
  main(args as MainArgs)
}
