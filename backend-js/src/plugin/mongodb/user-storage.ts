import { type MeditreePlugin } from "../../server.js"
import { TYPE as AuthType, type User } from "../auth.js"
import { TYPE as MongoDBType } from "./core.js"
export const HLSMediaType = "application/x-mpegURL"
interface MongoDDUserPluginConfig {
  /**
   * "users" by default.
   */
  collection?: string
}

/**
 * Default plugin dependencies: `mongodb`.
 */
export default function MongoDBUserPlugin(config: MongoDDUserPluginConfig): MeditreePlugin {
  const collection = config.collection ?? "users"
  return {
    onRegisterService(container) {
      const mongodb = container.get(MongoDBType.MongoDB)
      const users = mongodb.db.collection(collection)
      container.bind(AuthType.UserStorage).toValue({
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
