import { type PluginMetaclass, type PluginConstructor, type PluginRegistry } from "./plugin.js"
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

type Creator = PluginConstructor<MeditreePlugin>

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
  registry.statistics = mapEngine(StatisticsPlugin, {
    jsondb: ["jsondb", "jsondb-statistics"],
    mongodb: ["mongodb", "mongodb-statistics"],
  })
  registry.auth = mapEngine(AuthPlugin, {
    jsondb: ["jsondb", "jsondb-user"],
    mongodb: ["mongodb", "mongodb-user"],
  })
}

function withDefaultDp(create: Creator, ...defaults: string[]): Metaclass {
  return {
    create,
    preprocess(name, config, all) {
      if (!config.depends?.length) {
        config.depends = defaults
      }
      for (const defaultPluginName of defaults) {
        all[defaultPluginName] ??= {}
      }
    },
  }
}

function mapEngine(create: Creator, engines: Record<string, string[]>): Metaclass {
  return {
    create,
    preprocess(name, config, all) {
      const dependencies = engines[config.engine]
      if (dependencies?.length) {
        config.depends ??= []
        for (const dp of dependencies) {
          addUnique(config.depends, dp)
          all[dp] ??= {}
        }
      }
    }
  }
}

function addUnique(list: any[], e: any): void {
  if (!list.includes(e)) {
    list.push(e)
  }
}
