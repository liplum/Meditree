import { createConfigFile, loadConfigFromFile, setupConfig } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import path from "path"
import { File as FileDelegate } from "./file.js"
import { createLogger } from "@liplum/log"
import { existsOrNull, resolveAppStoragePath } from "./env.js"
import esMain from "es-main"
import { cli } from '@liplum/cli'
import inquirer from 'inquirer'

export interface ServeArgs {
  /**
   * The config file path
   */
  config?: string
}

export async function serve(args: ServeArgs): Promise<void> {
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
  if (args.config && !await configFi.checkReadable()) {
    console.error(new Error(`Cannot read config from ${configFi.path}.`,
      { cause: configFi._lastReadableError }))
    process.exit(1)
  }
  let config = await loadConfigFromFile(configFi.path)
  if (args.config && !config) {
    log.warn(`Failed to load config from "${path.resolve(configFi.path)}", so default config is used.`)
    process.exit(1)
  } else {
    config = setupConfig()
  }
  log.info(`Config was loaded from "${path.resolve(configFi.path)}".`)
  await startServer(config)
}

export interface InitConfigArgs {
  path?: string
}


export async function initConfig(args: InitConfigArgs) {
  const path = args.path ?? resolveAppStoragePath("config.json")
  await createConfigFile(path)
  console.log(`Config file created at ${path}`)
}

if (esMain(import.meta)) {
  const args = cli({
    name: 'Medtiree',
    description: 'Share your media anywhere in a tree.',
    commands: [{
      name: "serve",
      description: "Serve the Medtiree.",
      examples: [
        'meditree serve',
        'meditree serve -i <config-file>',
      ],
      require: [],
      options: [{
        name: 'config',
        alias: "i",
        description: 'The config file path.'
      },],
    }, {
      name: "initConfig",
      description: "Serve the Medtiree.",
      examples: [
        'meditree initConfig',
        'meditree initConfig <path>',
      ],
      require: [],
      options: [{
        name: 'path',
        alias: "p",
        defaultOption: true,
        description: 'The path where to generate config file.'
      },],
    }],
  })!
  switch (args._command) {
    case "serve":
      serve(args as ServeArgs)
      break
    case "initConfig":
      initConfig(args as InitConfigArgs)
      break
  }
}
