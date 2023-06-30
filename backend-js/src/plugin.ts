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
  _depends?: string[]
  /**
   * Whether this plugin is disabled or not.
   * False by default.
   */
  _disabled?: boolean
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

async function resolvePluginProvider<TPlugin, TConfig extends PluginConfig = any>(
  builtin: PluginRegistry<TPlugin, TConfig>,
  name: string
): Promise<PluginProvider<TPlugin, TConfig> | undefined> {
  const ctor = builtin[name]
  if (ctor) {
    // for built-in plugins
    return ctor
  }
  if (fs.existsSync(name)) {
    // for external plugins
    return await importModule(name)
  }
}

function fliterDisabledPlugin(
  plugins: Record<string, PluginConfig | boolean>,
): Record<string, PluginConfig> {
  const res = {}
  for (const [pluginName, pluginConfig] of Object.entries(plugins)) {
    if (typeof pluginConfig === "boolean") {
      if (pluginConfig) {
        res[pluginName] = {}
      }
    } else if (pluginConfig._disabled !== true) {
      res[pluginName] = pluginConfig
    }
  }
  return res
}

/**
 * Resolves a list of plugins and their dependencies.
 * @param plugins A record of plugin configurations keyed by their names.
 * @returns An array of resolved plugins.
 */
export async function resolvePluginList<TPlugin>(
  builtin: PluginRegistry<TPlugin>,
  conf: Record<string, PluginConfig | boolean>,
  onFound?: (name: string, plugin: TPlugin) => void,
): Promise<TPlugin[]> {
  const name2Conf = fliterDisabledPlugin(conf)
  const name2PluginProvider = new Map<string, PluginProvider<TPlugin>>()
  /**
   * PluginProvider resolution has 3 phrases:
   * Phrase 1: resolve all PluginProviders. resolved should be cached.
   * Phrase 2: preprocess all plugins, and keep dependencies distinct.
   * Phrase 3: check if any new plugin was added from preprocessing. if yes, goto Phrase 1.
   */
  async function resolvePluginProviders(): Promise<void> {
    let lastPluginCount: number | undefined
    while (lastPluginCount !== Object.keys(name2Conf).length) {
      lastPluginCount = Object.keys(name2Conf).length
      for (const [pluginName, config] of Object.entries(name2Conf)) {
        let pluginProvider = name2PluginProvider.get(pluginName)
        if (!pluginProvider) {
          pluginProvider = await resolvePluginProvider(builtin, pluginName)
          if (!pluginProvider) {
            throw new Error(`${pluginName} not found.`)
          }
          // preprocess if it's the first time that plugin provider is resolved.
          if (typeof pluginProvider === "object") {
            pluginProvider.preprocess?.(pluginName, config, name2Conf)
          }
          name2PluginProvider.set(pluginName, pluginProvider)
          // clear duplicate dependencies
          if (config._depends?.length) {
            config._depends = [...new Set(config._depends)]
          }
        }
      }
    }
  }
  await resolvePluginProviders()

  const name2Resolved = new Map<string, TPlugin>()
  /**
   * Recursive function to resolve the dependencies of a plugin and add it to the list of resolved plugins.
   * @param pluginName The name of the plugin to resolve.
   * @param seenPlugins A set of already resolved plugins to avoid infinite recursion.
   */
  function resolvePluginDependencies(pluginName: string, seenPlugins: Set<string>): void {
    // Check if this plugin has already been created and return the existing instance.
    const pluginInstance = name2Resolved.get(pluginName)
    if (pluginInstance) {
      return
    }

    // Check if this plugin has already been resolved to avoid infinite recursion.
    if (seenPlugins.has(pluginName)) {
      throw new Error(`Circular dependency detected for plugin[${pluginName}]`)
    }

    // Add this plugin to the set of resolved plugins.
    seenPlugins.add(pluginName)

    // Get the plugin configuration.
    const pluginConfig = name2Conf[pluginName]

    if (!pluginConfig) {
      throw new Error(`${pluginName} isn't enabled.`)
    }

    // Resolve the dependencies of this plugin before adding it to the list of resolved plugins.
    if (pluginConfig._depends?.length) {
      for (const dependencyName of pluginConfig._depends) {
        resolvePluginDependencies(dependencyName, seenPlugins)
      }
    }

    const provider = name2PluginProvider.get(pluginName)
    let plugin: TPlugin
    if (typeof provider === "object") {
      plugin = provider.create(pluginConfig)
    } else if (typeof provider === "function") {
      plugin = provider(pluginConfig)
    } else {
      throw new Error(`${pluginName} not found.`)
    }
    // Create the plugin and add it to the list of resolved plugins.
    name2Resolved.set(pluginName, plugin)
    onFound?.(pluginName, plugin)
  }

  // Iterate over all the plugin configurations and resolve each one.
  for (const pluginName of Object.keys(name2Conf)) {
    resolvePluginDependencies(pluginName, new Set())
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
