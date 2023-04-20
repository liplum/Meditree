import { type Db, MongoClient, type MongoClientOptions } from "mongodb"
import { type MeditreePlugin } from "../server.js"
import { uniqueToken } from "../ioc.js"

export const HLSMediaType = "application/x-mpegURL"
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
  if (!config.url) throw new Error("MongoDb url cannot be empty or null.")
  const database = config.database ?? "meditree"
  let client: MongoClient
  return {
    async init() {
      client = new MongoClient(config.url, config.options)
    },
    onExit() {
      client?.close(true)
    },
    onRegisterService(container) {
      if (client === undefined) throw new Error("MongoDb Client is not yet initialized.")
      const db = client.db(database)
      container.bind(TYPE.MongoDB).toValue({
        db
      })
    },
  }
}
