import { TYPE as MeditreeType, type MeditreePlugin } from "../../server.js"
import { type User } from "../../user.js"
import { TYPE as MongoDBType } from "./core.js"
export const HLSMediaType = "application/x-mpegURL"
interface MongoDDUserPluginConfig {
  /**
   * "users" by default.
   */
  collection?: string
}

/**
 * Plugin dependency: `mongodb`.
 */
export default function MongoDBUserPlugin(config: MongoDDUserPluginConfig): MeditreePlugin {
  const collection = config.collection ?? "users"
  return {
    onRegisterService(container) {
      const mongodb = container.get(MongoDBType.MongoDB)
      const users = mongodb.db.collection(collection)
      container.bind(MeditreeType.UserStorage).toValue({
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
