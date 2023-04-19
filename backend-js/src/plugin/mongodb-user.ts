import { TYPE as MeditreeType, type MeditreePlugin } from "../server.js"
import { type User, type UserStorageService } from "../user.js"
import { TYPE as MongodbType } from "./mongodb.js"
export const HLSMediaType = "application/x-mpegURL"
// eslint-disable-next-line @typescript-eslint/dot-notation
interface MongoDbUserPluginConfig {
  /**
   * "users" by default.
   */
  collection?: string
}

/**
 * Plugin dependency: `mongodb`.
 */
export default function MongoDbUserPlugin(config: MongoDbUserPluginConfig): MeditreePlugin {
  const collection = config.collection ?? "users"
  return {
    onRegisterService(container) {
      const mongodb = container.get(MongodbType.MongoDB)
      const users = mongodb.db.collection(collection)
      container.rebind(MeditreeType.UserStorage).toValue({
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
      })
    },
  }
}
