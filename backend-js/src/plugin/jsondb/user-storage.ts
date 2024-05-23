import { type PluginMeta } from "../../plugin.js"
import { type MeditreePlugin } from "../../server.js"
import { UserType as UserType, type User } from "../user-storage.js"
import { Type as JsonDBType } from "./core.js"
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
  create: (config) => {
    const collection = config.collection ?? "users"
    const getUserPath = (user: User | string): string => {
      return typeof user === "string" ? `/${user}` : `/${user.account}`
    }
    return {
      setupService: (container) => {
        const jsonDB = container.get(JsonDBType.JsonDB)
        const db = jsonDB.loadDB(collection)
        container.bind(UserType.UserStorage).toValue({
          addUser: async (user) => {
            const userPath = getUserPath(user)
            if (await db.exists(userPath)) {
              // already existing
              return false
            }
            await db.push(userPath, user)
            return true
          },
          getUser: async (account) => {
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
          updateUser: async (user) => {
            const userPath = getUserPath(user)
            if (await db.exists(userPath)) {
              await db.push(userPath, user)
              return true
            }
            return false
          },
          deleteUser: async (account) => {
            const userPath = getUserPath(account)
            if (await db.exists(userPath)) {
              await db.delete(userPath)
              return true
            }
            return false
          },
          hasUser: async (account) => {
            const userPath = getUserPath(account)
            return await db.exists(userPath)
          }
        })
      },
    }
  }
}
export default JsonDbUserPlugin
