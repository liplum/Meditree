import { type PluginMeta } from "../plugin.js"
import { type MeditreePlugin } from "../server.js"
import { rateLimit, Options } from 'express-rate-limit'

interface RateLimiterPluginConfig {
  routes: RateLimiterEntry[]
}

interface RateLimiterEntry {
  /**
  * see {@link Options.windowMs}
  */
  windowMs: number

  /**
   * see {@link Options.limit}
   */
  limit?: number
}

const RateLimiterPlugin: PluginMeta<MeditreePlugin, RateLimiterPluginConfig> = {
  create: (config) => {
    return {
    }
  }
}
export default RateLimiterPlugin
