import { MongoClient, type MongoClientOptions } from "mongodb"
import { TYPE, type MeditreePlugin } from "../server.js"
import { type User, type UserStorageService } from "../user.js"

export const HLSMediaType = "application/x-mpegURL"
// eslint-disable-next-line @typescript-eslint/dot-notation
interface MongoDbPluginConfig {
  url: string
  database: string
  options?: MongoClientOptions
}
export default function MongoDbPlugin(config: MongoDbPluginConfig): MeditreePlugin {
  if (!config.url) throw new Error("MongoDb url cannot be empty or null.")
  if (!config.database) throw new Error("MongoDb database name cannot be empty or null.")
  const database = config.database
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
      container.rebind(TYPE.UserStorage).toFactory((): UserStorageService => {
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
