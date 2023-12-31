import fs from "fs"
import { pathToFileURL } from "url"

export type PluginRegistry<
  TPlugin,
  TConfig extends PluginConfig = any
> = Record<string, PluginMeta<TPlugin, TConfig>>
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
   * Other options for the plugin.
   */
  [key: string]: any
}
export interface PluginMeta<
  TPlugin,
  TConfig extends PluginConfig = PluginConfig
> {
  /**
   * The interfaces which this plugin implements
   */
  implements?: string[]
  /**
   * The interfaces which this plugin depends on
   */
  depends?: string[]
  /**
   * Create a plugin instance.
   */
  create: PluginCtor<TPlugin, TConfig>
}
/**
 * [PluginCtor] is a function that directly constructs a plugin object.
 */
export type PluginCtor<
  TPlugin,
  TConfig extends PluginConfig = PluginConfig
> = (config: TConfig) => TPlugin

async function resolvePluginMeta<TPlugin>(
  builtin: PluginRegistry<TPlugin>,
  name: string
): Promise<PluginMeta<TPlugin> | undefined> {
  const meta = builtin[name]
  if (meta) {
    // for built-in plugins
    return meta
  }
  if (fs.existsSync(name)) {
    // for external plugins
    return await importModule(name)
  }
}

function isPluginDisabled(confBody: PluginConfig | boolean): boolean {
  if (typeof confBody === "boolean") {
    return !confBody
  } else {
    return confBody._disabled === true
  }
}

/**
 * If two or more plugins implement the same interface,
 * @param origin An unordered list of plugin configs
 * @returns An list of plugin configs in dependency-resolved order
 */
function resolvePluginInDependencyOrder<
TPlugin,
TConfig extends PluginConfig = any
>(
  origin: PluginMeta<TPlugin, TConfig>[]
): PluginMeta<TPlugin, TConfig>[]{
  return []
}

/**
 * Resolves a list of plugins and their dependencies.
 * @param plugins A record of plugin configurations keyed by their names.
 * @returns An array of resolved plugins.
 */
export async function resolvePluginList<TPlugin>(
  builtin: PluginRegistry<TPlugin>,
  name2ConfBody: Record<string, PluginConfig | boolean>,
  onFound?: (name: string, plugin: TPlugin) => void,
): Promise<TPlugin[]> {
  const name2Conf: Record<string, PluginConfig> = {}
  for (const [name, confBody] of Object.entries(name2ConfBody)) {
    if (isPluginDisabled(confBody)) continue
    if (typeof confBody === "boolean") {
      name2Conf[name] = {}
    } else {
      name2Conf[name] = confBody
      if (confBody._depends) {
        if (Array.isArray(confBody._depends)) {
          // if the config body is an array, clear duplicates.
          confBody._depends = [...new Set(confBody._depends)]
        } else if (typeof confBody._depends === "string") {
          // if the config body is a string, wrap it into an array.
          confBody._depends = [confBody._depends]
        }
      }
    }
  }

  const name2Meta = new Map<string, PluginMeta<TPlugin>>()
  /**
   * PluginProvider resolution has 3 phrases:
   * Phrase 1: To resolve all PluginProviders. Resolved plugins should be cached.
   * Phrase 2: To preprocess all plugins, and keep dependencies distinct.
   * Phrase 3: To check if any new plugin was added from preprocessing. If yes, goto Phrase 1. This will be repeated until no more plugin is added.
   */
  let lastPluginCount: number | undefined
  while (lastPluginCount !== Object.keys(name2Conf).length) {
    lastPluginCount = Object.keys(name2Conf).length
    for (const [name, config] of Object.entries(name2Conf)) {
      // clear duplicate dependencies
      if (config._depends?.length) {
        config._depends = [...new Set(config._depends)]
      }
      let provider = name2Meta.get(name)
      if (!provider) {
        provider = await resolvePluginMeta(builtin, name)
        if (!provider) {
          throw new Error(`Provider for plugin[${name}] not found.`)
        }
        name2Meta.set(name, provider)
      }
    }
  }

  // validate if all dependencies exist.
  for (const [name, config] of Object.entries(name2Conf)) {
    if (config._depends?.length) {
      for (const dp of config._depends) {
        if (!name2Meta.has(dp)) {
          const dpConfBody = name2ConfBody[dp]
          if (dpConfBody !== undefined && isPluginDisabled(dpConfBody)) {
            throw new Error(`The dependency[${dp}] of plugin[${name}] was disabled.`)
          } else {
            throw new Error(`The dependency[${dp}] of plugin[${name}] not found.`)
          }
        }
      }
    }
  }

  const name2Resolved = new Map<string, TPlugin>()
  /**
   * Recursive function to resolve the dependencies of a plugin and add it to the list of resolved plugins.
   * @param pluginName The name of the plugin to resolve.
   * @param seenPlugins A set of already resolved plugins to avoid infinite recursion.
   */
  function resolvePluginDependencies(pluginName: string, seenPlugins: Set<string>): void {
    // Check if this plugin has already been created and stop resolving it.
    if (name2Resolved.has(pluginName)) return

    // Check if this plugin has already been resolved to avoid infinite recursion.
    if (seenPlugins.has(pluginName)) {
      throw new Error(`Circular dependency detected for plugin[${pluginName}]`)
    }

    // Add this plugin to the set of resolved plugins.
    seenPlugins.add(pluginName)

    // Get the plugin configuration.
    const conf = name2Conf[pluginName]

    // Resolve the dependencies of this plugin before adding it to the list of resolved plugins.
    if (conf._depends?.length) {
      for (const dependencyName of conf._depends) {
        resolvePluginDependencies(dependencyName, seenPlugins)
      }
    }

    const meta = name2Meta.get(pluginName)
    let plugin: TPlugin
    if (meta) {
      plugin = meta.create(conf)
    } else {
      throw new Error(`Provider for plugin[${pluginName}] not found.`)
    }
    // Create the plugin and add it to the list of resolved plugins.
    name2Resolved.set(pluginName, plugin)
    onFound?.(pluginName, plugin)
  }

  // Iterate over all the plugin configurations and resolve each one.
  for (const name of Object.keys(name2Conf)) {
    resolvePluginDependencies(name, new Set())
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
