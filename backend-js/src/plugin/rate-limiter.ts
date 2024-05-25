import { createLogger } from "@liplum/log"
import { type PluginMeta } from "../plugin.js"
import { type MeditreePlugin } from "../server.js"
import { rateLimit, Options } from 'express-rate-limit'

interface RateLimiterPluginConfig {
  global?: RateLimiterConfig
  routes?: Record<string, RateLimiterConfig>
}

interface RateLimiterConfig {
  /**
  * see {@link Options.windowMs}
  */
  windowMs: number

  /**
   * see {@link Options.limit}
   */
  rquestLimit?: number
}

const RateLimiterPlugin: PluginMeta<MeditreePlugin, RateLimiterPluginConfig> = {
  create: (config) => {
    const log = createLogger("RateLimiter")
    const gloal = config.global
    const routes = config.routes
    if (gloal && !routes) {
      log.warn("Global rate limit was configured, therefore the route-specific configuration will be ignored.")
    }
    return {
      setupMiddleware: ({ registry }) => {
        if (gloal) {
          registry.global(1000, createRateLimit(gloal))
        } else if (routes) {
          for (const [route, config] of Object.entries(routes)) {
            registry.add(route, 1000, createRateLimit(config))
          }
        }
      }
    }
  }
}
export default RateLimiterPlugin

const createRateLimit = (config: RateLimiterConfig) => {
  return rateLimit({
    windowMs: config.windowMs,
    limit: config.rquestLimit,
    standardHeaders: 'draft-7',
  })
}