import { ObjectId, type WithId } from "mongodb"
import { type MeditreePlugin } from "../../server.js"
import { MongoDBType } from "./core.js"
import { type PluginMeta } from "../../plugin.js"
import { UserType, type User } from "../user/storage.js"
export const HLSMediaType = "application/x-mpegURL"
interface MongoDDUserPluginConfig {
  /**
   * "users" by default.
   */
  collection?: string
}

declare module "../user/storage.js" {
  interface User {
    _id?: ObjectId
  }
}
/**
 * Default plugin dependencies: `mongodb`.
 */
const MongoDBUserPlugin: PluginMeta<MeditreePlugin, MongoDDUserPluginConfig> = {
  implements: ["user-storage"],
  depends: ["mongodb"],
  create: (config) => {
    const collection = config.collection ?? "users"
    return {
      setupService: (container) => {
        const mongodb = container.get(MongoDBType.MongoDB)
        const users = mongodb.db.collection(collection)
        container.bind(UserType.UserStorage).toValue({
          addUser: async (user) => {
            if (await users.findOne({ account: user.account })) {
              // already existing
              return false
            }
            await users.insertOne(user)
            return true
          },
          getUser: async (account) => {
            return await users.findOne({ account }) as User | null
          },
          updateUser: async (user) => {
            const res = await users.updateOne({ _id: user._id }, { $set: user })
            return res.matchedCount > 0
          },
          deleteUser: async (account) => {
            const result = await users.deleteOne({ account })
            return result.deletedCount > 0
          },
          hasUser: async (account) => {
            return await users.countDocuments({ account }, { limit: 1 }) > 0
          },
        })
      },
    }
  }
}
export default MongoDBUserPlugin
