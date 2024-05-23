import { type MeditreePlugin } from "../../server.js"
import { token } from "@liplum/ioc"
import { createLogger } from "@liplum/log"
import { JsonDB, Config } from "node-json-db"
import path from "path"
import { resolveAppStoragePath } from "../../env.js"
import { type PluginMeta } from "../../plugin.js"

interface JsonDbPluginConfig {
  /**
   * "jsondb" by default.
   */
  dir?: string
  /**
   * true by default.
   */
  saveOnPush?: boolean
  /**
   * false by default.
   */
  humanReadable?: boolean
  /**
   * false by default.
   */
  syncOnSave?: boolean
}

export interface JsonDbService {
  loadDB: (name: string) => JsonDB
}

export const Type = {
  JsonDB: token<JsonDbService>("net.liplum.JsonDB.JsonDB"),
}

const JsonDbPlugin: PluginMeta<MeditreePlugin, JsonDbPluginConfig> = {
  implements: ["jsondb"],
  create(config) {
    const log = createLogger("JsonDB")
    const dir = resolveAppStoragePath(config.dir ?? "jsondb")
    const name2DB = new Map<string, JsonDB>()
    return {
      init: async () => {
        log.info(`JsonDB will load from "${path.resolve(dir)}".`)
      },
      onExit: () => {
        log.info("JsonDB closed.")
      },
      setupService: (container) => {
        container.bind(Type.JsonDB).toValue({
          loadDB: (name) => {
            let db = name2DB.get(name)
            if (db === undefined) {
              db = new JsonDB(new Config(
                `${dir}/${name}`,
                config.saveOnPush,
                config.humanReadable,
                "/",
                config.syncOnSave,
              ))
              name2DB.set(name, db)
              log.info(`"${name}" collection is loaded.`)
            }
            return db
          }
        })
      },
    }
  }
}
export default JsonDbPlugin
