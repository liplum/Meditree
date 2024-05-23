import { type Db, MongoClient, type MongoClientOptions } from "mongodb"
import { type MeditreePlugin } from "../../server.js"
import { token } from "../../ioc.js"
import { createLogger } from "@liplum/log"
import { type PluginMeta } from "../../plugin.js"

interface MongoDbPluginConfig {
  /**
   * "mongodb://localhost:27017" by default.
   */
  url?: string
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
  MongoDB: token<MongoDbService>("MongoDB"),
}

const MongoDbPlugin: PluginMeta<MeditreePlugin, MongoDbPluginConfig> = {
  implements: ["mongodb"],
  create: (config) => {
    const dbUrl = config.url ?? "mongodb://localhost:27017"
    const database = config.database ?? "meditree"
    const log = createLogger("MongoDB")
    let client: MongoClient
    return {
      init: async () => {
        client = new MongoClient(dbUrl, config.options)
        log.info(`MongoDB Client connected to ${dbUrl}`)
      },
      onExit: () => {
        client?.close(true)
        log.info("MongoDB Client closed.")
      },
      setupService: (container) => {
        if (client === undefined) throw new Error("MongoDB Client is not initialized.")
        const db = client.db(database)
        container.bind(TYPE.MongoDB).toValue({
          db
        })
      },
    }
  }
}
export default MongoDbPlugin
