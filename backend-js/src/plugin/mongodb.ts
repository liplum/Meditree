import { type Db, MongoClient, type MongoClientOptions } from "mongodb"
import { TYPE as MeditreeType, type MeditreePlugin } from "../server.js"
import { type User, type UserStorageService } from "../user.js"
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
    registerService(container) {
      if (client === undefined) throw new Error("MongoDb Client is not yet initialized.")
      const db = client.db(database)
      const users = db.collection("users")
      container.rebind(MeditreeType.UserStorage).toFactory((): UserStorageService => {
        return {
          async addUser(user) {
            if (await users.findOne({ account: user.account })) {
              // already existing
              return false
            }
            await users.insertOne(user)
            return true
          },
          async getUser(account) {
            return await users.findOne({ account }) as User | null
          },
          async updateUser(user) {
            if (await users.findOne({ account: user.account })) {
              users.updateOne({ account: user.account }, user)
              return true
            }
            return false
          },
          async deleteUser(account) {
            const result = await users.deleteOne({ account })
            return result.deletedCount > 0
          },
        }
      }).asSingleton()
    },
  }
}
