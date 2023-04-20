import { TYPE as MeditreeType, type MeditreePlugin } from "../../server.js"
import { type User } from "../../user.js"
import { TYPE as JsonDBType } from "./core.js"
export const HLSMediaType = "application/x-mpegURL"
// eslint-disable-next-line @typescript-eslint/dot-notation
interface JsonDBUserPluginConfig {
  /**
   * "/users" by default.
   */
  path?: string
}

/**
 * Plugin dependency: `mongodb`.
 */
export default function JsonDbUserPlugin(config: JsonDBUserPluginConfig): MeditreePlugin {
  const path = config.path ?? "/users"
  return {
    onRegisterService(container) {
      const jsonDB = container.get(JsonDBType.JsonDB)
      container.bind(MeditreeType.UserStorage).toValue({
        async addUser(user) {
          // TODO: impl
          const users = await jsonDB.db.getData(path)
          if (await users.findOne({ account: user.account })) {
            // already existing
            return false
          }
          await users.insertOne(user)
          return true
        },
        async getUser(account) {
          const users = await jsonDB.db.getData(path)
          return await users.findOne({ account }) as User | null
        },
        async updateUser(user) {
          const users = await jsonDB.db.getData(path)
          if (await users.findOne({ account: user.account })) {
            users.updateOne({ account: user.account }, user)
            return true
          }
          return false
        },
        async deleteUser(account) {
          const users = await jsonDB.db.getData(path)
          const result = await users.deleteOne({ account })
          return result.deletedCount > 0
        },
      })
    },
  }
}
