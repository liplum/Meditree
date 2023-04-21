import { type PluginRegistry } from "./plugin.js"
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
// JsonDB
import JsonDBPlugin from "./plugin/jsondb/core.js"
import JsonDBUserPlugin from "./plugin/jsondb/user-storage.js"

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
  registry["mongodb-user"] = (config) => MongoDBUserPlugin(config)
  // JsonDB
  registry.jsondb = (config) => JsonDBPlugin(config)
  registry["jsondb-user"] = (config) => JsonDBUserPlugin(config)
}
