import { PluginMetaclass, type PluginCtor, type PluginRegistry } from "./plugin.js"
import { type MeditreePlugin } from "./server.js"

import HomepagePlugin from "./plugin/homepage.js"
import HLSPlugin from "./plugin/hls.js"
import MinifyPlugin from "./plugin/minify.js"
import StatisticsPlugin from "./plugin/statistics.js"
import WatchPlugin from "./plugin/watch.js"
import AuthPlugin from "./plugin/auth.js"
import LimiterPlugin from "./plugin/limiter.js"
// mongoDB
import MongoDBPlugin from "./plugin/mongodb/core.js"
import MongoDBUserPlugin from "./plugin/mongodb/user-storage.js"
import MongoDBStatisticsPlugin from "./plugin/mongodb/statistics-storage.js"
// JsonDB
import JsonDBPlugin from "./plugin/jsondb/core.js"
import JsonDBUserPlugin from "./plugin/jsondb/user-storage.js"
import JsonDBStatisticsPlugin from "./plugin/jsondb/statistics-storage.js"

type Ctor = PluginCtor<MeditreePlugin>

type Metaclass = PluginMetaclass<MeditreePlugin>

export function registerBuiltinPlugins(registry: PluginRegistry<MeditreePlugin>): void {
  registry.homepage = (config) => HomepagePlugin(config)
  registry.hls = (config) => HLSPlugin(config)
  registry.minify = (config) => MinifyPlugin(config)
  registry.watch = (config) => WatchPlugin(config)
  registry.limiter = (config) => LimiterPlugin(config)

  // mongoDB
  registry.mongodb = (config) => MongoDBPlugin(config)
  registry["mongodb-user"] = withDefaultDp(MongoDBUserPlugin, "mongodb")
  registry["mongodb-statistics"] = withDefaultDp(MongoDBStatisticsPlugin, "mongodb")
  // JsonDB
  registry.jsondb = (config) => JsonDBPlugin(config)
  registry["jsondb-user"] = withDefaultDp(JsonDBUserPlugin, "jsondb")
  registry["jsondb-statistics"] = withDefaultDp(JsonDBStatisticsPlugin, "jsondb")
   
  // has dependencies
  registry.auth = mapEngine(AuthPlugin, {
    jsondb: ["jsondb", "jsondb-user"],
    mongodb: ["mongodb", "mongodb-user"],
  })

  registry.statistics = optionalDependsOn(mapEngine((StatisticsPlugin), {
    jsondb: ["jsondb", "jsondb-statistics"],
    mongodb: ["mongodb", "mongodb-statistics"],
  }), "auth")
}

/**
 * Create a metaclass that automatically added default dependencies.
 * @param create the constructor of plugin
 * @param defaults the default dependencies
 * @returns a metaclass
 */
function withDefaultDp(create: Ctor | Metaclass, ...defaults: string[]): Metaclass {
  return PluginMetaclass.mergeFrom(create, (name, config, all) => {
    config._depends ??= []
    for (const dp of defaults) {
      addUnique(config._depends, dp)
      all[dp] ??= {}
    }
  })
}

/**
 * Create a metaclass that automatically adds dedicated dependencies that engines require.
 * @param create the constructor of plugin
 * @param engines engine name -> all dependencies it requires 
 * @returns a metaclass
 */
function mapEngine(create: Ctor | Metaclass, engines: Record<string, string[]>): Metaclass {
  return PluginMetaclass.mergeFrom(create, (name, config, all) => {
    const dependencies = engines[config.engine]
    config._depends ??= []
    for (const dp of dependencies) {
      addUnique(config._depends, dp)
      all[dp] ??= {}
    }
  })
}

/**
 * Create a mataclass that automatically added optional dependencies if they exist.
 * @param create the constructor of plugin
 * @param optionalDps the optional dependencies
 * @returns a metaclass
 */
function optionalDependsOn(create: Ctor | Metaclass, ...optionalDps: string[]): Metaclass {
  return PluginMetaclass.mergeFrom(create, (name, config, all) => {
    config._depends ??= []
    for (const dp of optionalDps) {
      if (all[dp]) {
        addUnique(config._depends, dp)
      }
    }
  })
}

function addUnique(list: any[], e: any): void {
  if (!list.includes(e)) {
    list.push(e)
  }
}
