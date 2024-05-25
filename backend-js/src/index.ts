import { createConfigFile, loadConfigFromFile, setupConfig } from "./config.js"
import { startServer } from "./server.js"
import { install as installSourceMap } from "source-map-support"
import path from "path"
import { File as FileDelegate } from "./file.js"
import { createLogger } from "@liplum/log"
import { appDir, existsOrNull, resolveAppStoragePath } from "./env.js"
import esMain from "es-main"
import { cli } from '@liplum/cli'
import inquirer from 'inquirer'
import { MeditreeWorkspace } from "./workspace.js"

export interface ServeArgs {
  /**
   * The path of workspace directory
   */
  workspace?: string
}

export async function serve(args: ServeArgs): Promise<void> {
  installSourceMap()
  const log = createLogger("Bootstrap")
  // To try finding the config file in following locations:
  // 1. the specific path passed by command line arguments.
  // 2. the default path in user home: "~/.meditree/config.json"
  const workspace = new MeditreeWorkspace(args.workspace ?? appDir)
  log.info(`Config was loaded from "${path.resolve(configFi.path)}".`)
  await startServer(config)
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
