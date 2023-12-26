import { type Db, MongoClient, type MongoClientOptions } from "mongodb"
import { type MeditreePlugin } from "../../server.js"
import { token } from "../../ioc.js"
import pino from "pino"

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

export default function MongoDbPlugin(config: MongoDbPluginConfig): MeditreePlugin {
  const dbUrl = config.url ?? "mongodb://localhost:27017"
  const database = config.database ?? "meditree"
  const log = pino({ name: "MongoDB" })
  let client: MongoClient
  return {
    async init() {
      client = new MongoClient(dbUrl, config.options)
      log.info(`MongoDB Client connected to ${dbUrl}`)
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
