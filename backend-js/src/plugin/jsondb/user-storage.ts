import { type PluginMeta } from "../../plugin.js"
import { type MeditreePlugin } from "../../server.js"
import { TYPE as AuthType, type User } from "../auth.js"
import { TYPE as JsonDBType } from "./core.js"
export const HLSMediaType = "application/x-mpegURL"
interface JsonDBUserPluginConfig {
  /**
   * "users" by default.
   */
  collection?: string
}

/**
 * Default plugin dependencies: `jsondb`.
 */
const JsonDbUserPlugin: PluginMeta<MeditreePlugin, JsonDBUserPluginConfig> = {
  implements: ["user-storage"],
  depends: ["jsondb", "user"],
  create(config) {
    const collection = config.collection ?? "users"
    function getUserPath(user: User | string): string {
      return typeof user === "string" ? `/${user}` : `/${user.account}`
    }
    return {
      onRegisterService(container) {
        const jsonDB = container.get(JsonDBType.JsonDB)
        const db = jsonDB.loadDB(collection)
        container.bind(AuthType.UserStorage).toValue({
          async addUser(user) {
            const userPath = getUserPath(user)
            if (await db.exists(userPath)) {
              // already existing
              return false
            }
            await db.push(userPath, user)
            return true
          },
          async getUser(account) {
            const userPath = getUserPath(account)
            if (!await db.exists(userPath)) {
              // not existing
              return null
            }
            try {
              return await db.getData(getUserPath(account))
            } catch (error) {
              return null
            }
          },
          async updateUser(user) {
            const userPath = getUserPath(user)
            if (await db.exists(userPath)) {
              await db.push(userPath, user)
              return true
            }
            return false
          },
          async deleteUser(account) {
            const userPath = getUserPath(account)
            if (await db.exists(userPath)) {
              await db.delete(userPath)
              return true
            }
            return false
          },
          async hasUser(account) {
            const userPath = getUserPath(account)
            return await db.exists(userPath)
          }
        })
      },
    }
  }
}
export default JsonDbUserPlugin
