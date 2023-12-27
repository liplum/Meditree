import { type PluginRegistry } from "./plugin.js"
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

export function registerBuiltinPlugins(registry: PluginRegistry<MeditreePlugin>): void {
  registry.homepage = (config) => HomepagePlugin(config)
  registry.hls = (config) => HLSPlugin(config)
  registry.minify = (config) => MinifyPlugin(config)
  registry.watch = (config) => WatchPlugin(config)
  registry.limiter = (config) => LimiterPlugin(config)

  // mongoDB
  registry.mongodb = (config) => MongoDBPlugin(config)
  registry["mongodb-user"] = MongoDBUserPlugin
  registry["mongodb-statistics"] = MongoDBStatisticsPlugin
  // JsonDB
  registry.jsondb = (config) => JsonDBPlugin(config)
  registry["jsondb-user"] = JsonDBUserPlugin
  registry["jsondb-statistics"] = JsonDBStatisticsPlugin
   
  // has dependencies
  registry.auth = AuthPlugin
  registry.statistics = StatisticsPlugin
}
