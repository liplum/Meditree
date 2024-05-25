import { createConfigFile } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import { LogLevel, LogLevels } from "@liplum/log"
import { appDir, resolveAppStoragePath } from "./env.js"
import esMain from "es-main"
import { cli } from '@liplum/cli'
import { MeditreeWorkspace } from "./workspace.js"

export interface ServeArgs {
  /**
   * The path of workspace directory
   */
  workspace?: string
  loglevel?: keyof LogLevel
}

export async function serve(args: ServeArgs): Promise<void> {
  installSourceMap()
  // To try finding the config file in following locations:
  // 1. the specific path passed by command line arguments.
  // 2. the default path in user home: "~/.meditree/config.json"
  const workspace = new MeditreeWorkspace({
    path: args.workspace ?? appDir,
    logLevel: args.loglevel ? LogLevels[args.loglevel?.toUpperCase()] : LogLevels.INFO,
  })
  await workspace.initLogger()
  await startServer(workspace)
}

export interface InitWorkspaceArgs {
  path?: string
}


export async function initConfig(args: InitWorkspaceArgs) {
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
        'meditree serve -w <workspace-path>',
      ],
      require: [],
      options: [{
        name: 'loglevel',
        alias: "l",
        description: `The log level: ${Object.keys(LogLevels)}.`
      }, {
        name: 'workspace',
        alias: "w",
        description: 'The workspace directory.'
      },],
    }, {
      name: "init",
      description: "Initialize a Meditree workspace.",
      examples: [
        'meditree init',
        'meditree init <workspace-path>',
      ],
      require: [],
      options: [{
        name: 'path',
        alias: "p",
        defaultOption: true,
        description: 'The path where to generate Meditree workspace.'
      },],
    }],
  })!
  switch (args._command) {
    case "serve":
      serve(args as ServeArgs)
      break
    case "initConfig":
      initConfig(args as InitWorkspaceArgs)
      break
  }
}
