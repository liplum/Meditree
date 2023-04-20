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
 * Plugin dependency: `jsondb`.
 */
export default function JsonDbUserPlugin(config: JsonDBUserPluginConfig): MeditreePlugin {
  const path = config.path ?? "/users"
  function getUserPath(user: User | string): string {
    return typeof user === "string" ? `${path}/${user}` : `${path}/${user.account}`
  }
  return {
    onRegisterService(container) {
      const jsonDB = container.get(JsonDBType.JsonDB)
      const db = jsonDB.db
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
          try {
            const user = await db.getData(getUserPath(account))
            return user
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
