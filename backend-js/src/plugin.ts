import { type Server } from "http"
import { type Readable } from "stream"
import { type ResolvedFile, type FileTree, type LocalFileTree } from "./file.js"
import { type FileTreePlugin } from "./host.js"
import { type ReadStreamOptions, type MeditreeNode } from "./meditree.js"
import { type RequestHandler, type Express, type Request, type Response } from "express"
import fs from "fs"
import { pathToFileURL } from "url"
import { type Container } from "@owja/ioc"

export type PluginRegistry = Record<string, (config: any) => MeditreePlugin>

export interface PluginConfig {
  /**
   * An array of the names of plugins that this plugin depends on.
   */
  depends?: string[]
  /**
 * Any additional configuration options for the plugin.
 */
  [key: string]: any
}

export interface MeditreePlugin extends FileTreePlugin {
  registerService?(container: Container): void

  init?(): Promise<void>

  setupServer?(app: Express.Application, server: Server): Promise<void>

  setupMeditreeNode?(node: MeditreeNode): Promise<void>

  onExpressRegistering?(app: Express, ctx: ExpressRegisteringContext): Promise<void>

  onPostGenerated?(tree: LocalFileTree): void

  /**
   * @param tree the entire file tree will be sent to both clients and parent nodes.
   * @returns a new file tree or the same instance.
   */
  onEntireTreeUpdated?(tree: FileTree): FileTree

  /**
   * @param tree the entire file tree will be sent to clients soon.
   * @returns a new file tree or the same instance.
   */
  onEntireTreeForClient?(tree: FileTree): FileTree
  /**
   * The first plugin which returns a non-undefined value will be taken.
   * @returns undefined if not handled by this plugin.
   */
  onNodeCreateReadStream?(node: MeditreeNode, file: ResolvedFile, options?: ReadStreamOptions): Promise<Readable | null | undefined>

  /**
   * @returns whether to prevent streaming {@link file}.
   */
  onFileRequested?(req: Request, res: Response, file: ResolvedFile): Promise<void> | Promise<boolean | undefined>
  onExit?(): void
}
export interface ExpressRegisteringContext {
  passcodeHandler: RequestHandler
}

async function createPlugin(
  registry: PluginRegistry, name: string, config: PluginConfig
): Promise<MeditreePlugin | null> {
  const ctor = registry[name]
  if (ctor) {
    // for built-in plugins
    return ctor(typeof config === "object" ? config : {})
  } else if (fs.existsSync(name)) {
    // for external plugins
    const pluginModule = await importModule(name)
    // external plugins default export their constructors.
    return pluginModule.default(config)
  } else {
    return null
  }
}

/**
 * @author chatGPT
 * Resolves a list of plugins and their dependencies.
 * @param plugins A record of plugin configurations keyed by their names.
 * @returns An array of resolved plugins.
 */
export async function resolvePluginList(
  registry: PluginRegistry,
  plugins: Record<string, PluginConfig>,
  onFound?: (name: string, plugin: MeditreePlugin) => void,
  onNotFound?: (name: string) => void,
): Promise<MeditreePlugin[]> {
  const resolvedPlugins: MeditreePlugin[] = []

  /**
   * Recursive function to resolve the dependencies of a plugin and add it to the list of resolved plugins.
   * @param pluginName The name of the plugin to resolve.
   * @param seenPlugins A set of already resolved plugins to avoid infinite recursion.
   */
  async function resolvePluginDependencies(pluginName: string, seenPlugins: Set<string>): Promise<void> {
    // Check if this plugin has already been resolved to avoid infinite recursion.
    if (seenPlugins.has(pluginName)) {
      throw new Error(`Circular dependency detected for plugin '${pluginName}'`)
    }

    // Add this plugin to the set of resolved plugins.
    seenPlugins.add(pluginName)

    // Get the plugin configuration.
    const pluginConfig = plugins[pluginName]

    // Resolve the dependencies of this plugin before adding it to the list of resolved plugins.
    if (pluginConfig.depends) {
      for (const dependencyName of pluginConfig.depends) {
        resolvePluginDependencies(dependencyName, seenPlugins)
      }
    }

    // Create the plugin and add it to the list of resolved plugins.
    const plugin = await createPlugin(registry, pluginName, pluginConfig)
    if (plugin) {
      resolvedPlugins.push(plugin)
      onFound?.(pluginName, plugin)
    } else {
      onNotFound?.(pluginName)
    }
  }

  // Iterate over all the plugin configurations and resolve each one.
  for (const pluginName of Object.keys(plugins)) {
    await resolvePluginDependencies(pluginName, new Set())
  }

  return resolvedPlugins
}

async function importModule(filePath: string): Promise<any> {
  if (filePath.startsWith("file://")) {
    // If the filePath starts with "file://", assume it is a file URI
    const url = new URL(filePath)
    if (!fs.existsSync(url.pathname)) {
      throw new Error(`File not found: ${url.pathname}`)
    }
    return import(url.toString())
  } else {
    // Otherwise, assume it is a file path
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }
    return import(pathToFileURL(filePath).toString())
  }
}
