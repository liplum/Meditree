import { type PluginConfig, type PluginConstructor, type PluginRegistry } from "./plugin.js"
import { type MeditreePlugin } from "./server.js"

import CachePlugin from "./plugin/cache.js"
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

export function registerBuiltinPlugins(registry: PluginRegistry<MeditreePlugin>): void {
  registry.cache = (config) => CachePlugin(config)
  registry.homepage = (config) => HomepagePlugin(config)
  registry.hls = (config) => HLSPlugin(config)
  registry.minify = (config) => MinifyPlugin(config)
  registry.statistics = (config) => StatisticsPlugin(config)
  registry.watch = (config) => WatchPlugin(config)
  registry.auth = (config) => AuthPlugin(config)
  registry.limiter = (config) => LimiterPlugin(config)

  // mongoDB
  registry.mongodb = (config) => MongoDBPlugin(config)
  registry["mongodb-user"] = withDefaultDp(MongoDBUserPlugin, "mongodb")
  registry["mongodb-statistics"] = withDefaultDp(MongoDBStatisticsPlugin, "mongodb")
  // JsonDB
  registry.jsondb = (config) => JsonDBPlugin(config)
  registry["jsondb-user"] = withDefaultDp(JsonDBUserPlugin, "jsondb")
  registry["jsondb-statistics"] = withDefaultDp(JsonDBStatisticsPlugin, "jsondb")
}

function withDefaultDp(ctor: PluginConstructor<MeditreePlugin>, ...defaults: string[]): PluginConstructor<MeditreePlugin> {
  return (config: PluginConfig) => {
    if (!config.depends?.length) {
      config.depends = defaults
    }
    return ctor(config)
  }
}
