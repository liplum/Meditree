import { type Db, MongoClient, type MongoClientOptions } from "mongodb"
import { type MeditreePlugin } from "../../server.js"
import { uniqueToken } from "../../ioc.js"
import { createLogger } from "../../logger.js"

// eslint-disable-next-line @typescript-eslint/dot-notation
interface MongoDbPluginConfig {
  url: string
  /**
   * "meditree" by default.
   */
  database?: string
  options?: MongoClientOptions
}

export interface MongoDbService {
  db: Db
}

export const TYPE = {
  MongoDB: uniqueToken<MongoDbService>("MongoDB"),
}

export default function MongoDbPlugin(config: MongoDbPluginConfig): MeditreePlugin {
  if (!config.url) throw new Error("MongoDB url cannot be empty or null.")
  const database = config.database ?? "meditree"
  const log = createLogger("MongoDB")
  let client: MongoClient
  return {
    async init() {
      client = new MongoClient(config.url, config.options)
      log.info(`MongoDB Client connected to ${config.url}`)
    },
    onExit() {
      client?.close(true)
      log.info("MongoDB Client closed.")
    },
    onRegisterService(container) {
      if (client === undefined) throw new Error("MongoDB Client is not initialized.")
      const db = client.db(database)
      container.bind(TYPE.MongoDB).toValue({
        db
      })
    },
  }
}
