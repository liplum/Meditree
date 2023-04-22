import fs from "fs"
import { pathToFileURL } from "url"

export type PluginRegistry<
  TPlugin,
  TConfig extends PluginConfig = any
> = Record<string, PluginProvider<TPlugin, TConfig>>

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

export type PluginConstructor<TPlugin, TConfig extends PluginConfig = any> = (config: TConfig) => TPlugin
export interface PluginMetaclass<TPlugin, TConfig extends PluginConfig = any> {
  preprocess?(name: string, config: TConfig, all: Record<string, PluginConfig>): void
  create: PluginConstructor<TPlugin, TConfig>
}
export type PluginProvider<
  TPlugin,
  TConfig extends PluginConfig = any
> = PluginConstructor<TPlugin, TConfig> | PluginMetaclass<TPlugin, TConfig>

async function createPlugin<TPlugin>(
  name: string, config: PluginConfig,
  ctor?: PluginConstructor<TPlugin>,
): Promise<TPlugin | null> {
  if (ctor) {
    // for built-in plugins
    return ctor(typeof config === "object" ? config : {})
  } else if (fs.existsSync(name)) {
    // for external plugins
    const pluginModule = await importModule(name)
    // external plugins should default export their constructors.
    return pluginModule.default(config)
  } else {
    return null
  }
}

function getCtor<TPlugin, TConfig extends PluginConfig = any>(
  maybe?: PluginConstructor<TPlugin, TConfig> | PluginMetaclass<TPlugin, TConfig>
): PluginConstructor<TPlugin, TConfig> | undefined {
  if (typeof maybe === "object") {
    return maybe.create
  }
  if (typeof maybe === "function") {
    return maybe
  }
  return
}

/**
 * Resolves a list of plugins and their dependencies.
 * @param plugins A record of plugin configurations keyed by their names.
 * @returns An array of resolved plugins.
 */
export async function resolvePluginList<TPlugin>(
  registry: PluginRegistry<TPlugin>,
  plugins: Record<string, PluginConfig>,
  onFound?: (name: string, plugin: TPlugin) => void,
  onNotFound?: (name: string) => void,
): Promise<TPlugin[]> {
  // clear duplicate dependencies
  for (const [pluginName, config] of Object.entries(plugins)) {
    const builtinPluginProvider = registry[pluginName]
    if (typeof builtinPluginProvider === "object") {
      builtinPluginProvider.preprocess?.(pluginName, config, plugins)
    }
    if (config.depends?.length) {
      config.depends = [...new Set(config.depends)]
    }
  }

  const name2Resolved = new Map<string, TPlugin>()

  /**
   * Recursive function to resolve the dependencies of a plugin and add it to the list of resolved plugins.
   * @param pluginName The name of the plugin to resolve.
   * @param seenPlugins A set of already resolved plugins to avoid infinite recursion.
   */
  async function resolvePluginDependencies(pluginName: string, seenPlugins: Set<string>): Promise<void> {
    // Check if this plugin has already been resolved to avoid infinite recursion.
    if (seenPlugins.has(pluginName)) {
      throw new Error(`Circular dependency detected for plugin[${pluginName}]`)
    }

    // Add this plugin to the set of resolved plugins.
    seenPlugins.add(pluginName)

    // Check if this plugin has already been created and return the existing instance.
    const pluginInstance = name2Resolved.get(pluginName)
    if (pluginInstance) {
      return
    }

    // Get the plugin configuration.
    const pluginConfig = plugins[pluginName]

    if (!pluginConfig) {
      throw new Error(`${pluginName} isn't enabled.`)
    }

    // Resolve the dependencies of this plugin before adding it to the list of resolved plugins.
    if (pluginConfig.depends?.length) {
      for (const dependencyName of pluginConfig.depends) {
        await resolvePluginDependencies(dependencyName, seenPlugins)
      }
    }

    const ctor = getCtor(registry[pluginName])
    // Create the plugin and add it to the list of resolved plugins.
    const plugin = await createPlugin(pluginName, pluginConfig, ctor)
    if (plugin) {
      name2Resolved.set(pluginName, plugin)
      onFound?.(pluginName, plugin)
    } else {
      onNotFound?.(pluginName)
    }
  }

  // Iterate over all the plugin configurations and resolve each one.
  for (const pluginName of Object.keys(plugins)) {
    await resolvePluginDependencies(pluginName, new Set())
  }

  return Array.from(name2Resolved.values())
}

async function importModule(filePath: string): Promise<any> {
  if (filePath.startsWith("file://")) {
    // If the filePath starts with "file://", assume it is a file URI
    const url = new URL(filePath)
    if (!fs.existsSync(url.pathname)) {
      throw new Error(`File not found: ${url.pathname}`)
    }
    return await import(url.toString())
  } else {
    // Otherwise, assume it is a file path
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }
    return await import(pathToFileURL(filePath).toString())
  }
}
