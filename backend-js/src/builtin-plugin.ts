import { type PluginRegistry } from "./plugin.js"
import { type MeditreePlugin } from "./server.js"

import HomepagePlugin from "./plugin/homepage.js"
import HLSPlugin from "./plugin/hls.js"
import MinifyPlugin from "./plugin/minify.js"
import StatisticsPlugin from "./plugin/statistics.js"
import WatchPlugin from "./plugin/watch.js"
import AuthPlugin from "./plugin/auth.js"
import RandomPlugin from "./plugin/random.js"
import FileLimiterPlugin from "./plugin/file-limiter.js"
import RateLimiterPlugin from "./plugin/rate-limiter.js"
// mongoDB
import MongoDBPlugin from "./plugin/mongodb/core.js"
import MongoDBUserPlugin from "./plugin/mongodb/user-storage.js"
import MongoDBStatisticsPlugin from "./plugin/mongodb/statistics-storage.js"
// JsonDB
import JsonDBPlugin from "./plugin/jsondb/core.js"
import JsonDBUserPlugin from "./plugin/jsondb/user-storage.js"
import JsonDBStatisticsPlugin from "./plugin/jsondb/statistics-storage.js"

// Admin
import AdminPlugin from "./plugin/admin/admin.js"
import AdminAuthTokenPlugin from "./plugin/admin/auth-token.js"


export function registerBuiltinPlugins(registry: PluginRegistry<MeditreePlugin>): void {
  registry.homepage = HomepagePlugin
  registry.hls = HLSPlugin
  registry.minify = MinifyPlugin
  registry.watch = WatchPlugin
  registry["file-limiter"] = FileLimiterPlugin
  registry["rate-limiter"] = RateLimiterPlugin
  registry.random = RandomPlugin

  // mongoDB
  registry.mongodb = MongoDBPlugin
  registry["mongodb-user"] = MongoDBUserPlugin
  registry["mongodb-statistics"] = MongoDBStatisticsPlugin
  // JsonDB
  registry.jsondb = JsonDBPlugin
  registry["jsondb-user"] = JsonDBUserPlugin
  registry["jsondb-statistics"] = JsonDBStatisticsPlugin
  // has dependencies
  registry.auth = AuthPlugin
  registry.statistics = StatisticsPlugin

  // Admin
  registry.admin = AdminPlugin
  registry["admin-auth-token"] = AdminAuthTokenPlugin
}
