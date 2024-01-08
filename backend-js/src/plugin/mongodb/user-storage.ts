import { type WithId } from "mongodb"
import { type MeditreePlugin } from "../../server.js"
import { TYPE as AuthType, type User } from "../auth.js"
import { TYPE as MongoDBType } from "./core.js"
import { type PluginMeta } from "../../plugin.js"
import { Schema } from "mongoose"
export const HLSMediaType = "application/x-mpegURL"
interface MongoDDUserPluginConfig {
  /**
   * "users" by default.
   */
  collection?: string
}

const UserSchema = new Schema({
  uid: Schema.ObjectId,
  account: String,
  password: String,
  lastLogin: { type: Date, require: false },
  viewTimes: { type: Number, default: 0 },
})

/**
 * Default plugin dependencies: `mongodb`.
 */
const MongoDBUserPlugin: PluginMeta<MeditreePlugin, MongoDDUserPluginConfig> = {
  implements: ["user-storage"],
  depends: ["mongodb"],
  create(config) {
    const collection = config.collection ?? "users"
    return {
      setupService(container) {
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
          async updateUser(user: WithId<User>) {
            const res = await users.updateOne({ _id: user._id }, { $set: user })
            return res.matchedCount > 0
          },
          async deleteUser(account) {
            const result = await users.deleteOne({ account })
            return result.deletedCount > 0
          },
          async hasUser(account) {
            return await users.countDocuments({ account }, { limit: 1 }) > 0
          },
        })
      },
    }
  }
}
export default MongoDBUserPlugin
