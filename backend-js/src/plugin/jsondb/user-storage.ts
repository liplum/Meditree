import { TYPE as MeditreeType, type MeditreePlugin } from "../../server.js"
import { type User } from "../../user.js"
import { TYPE as JsonDBType } from "./core.js"
export const HLSMediaType = "application/x-mpegURL"
interface JsonDBUserPluginConfig {
  /**
   * "users" by default.
   */
  collection?: string
}

/**
 * Plugin dependency: `jsondb`.
 */
export default function JsonDbUserPlugin(config: JsonDBUserPluginConfig): MeditreePlugin {
  const collection = config.collection ?? "users"
  function getUserPath(user: User | string): string {
    return typeof user === "string" ? `/${user}` : `/${user.account}`
  }
  return {
    onRegisterService(container) {
      const jsonDB = container.get(JsonDBType.JsonDB)
      const db = jsonDB.loadDB(collection)
      container.bind(MeditreeType.UserStorage).toValue({
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
      })
    },
  }
}
