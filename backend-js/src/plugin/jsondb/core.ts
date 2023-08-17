import { type MeditreePlugin } from "../../server.js"
import { token } from "../../ioc.js"
import { createLogger } from "../../logger.js"
import { JsonDB, Config } from "node-json-db"
import path from "path"
import { resolveAppStoragePath } from "../../env.js"

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
  loadDB(name: string): JsonDB
}

export const TYPE = {
  JsonDB: token<JsonDbService>("JsonDB"),
}

export default function JsonDbPlugin(config: JsonDbPluginConfig): MeditreePlugin {
  const log = createLogger("JsonDB")
  const dir = resolveAppStoragePath(config.dir ?? "jsondb")
  const name2DB = new Map<string, JsonDB>()
  return {
    async init() {
      log.info(`JsonDB will load from "${path.resolve(dir)}".`)
    },
    onExit() {
      log.info("JsonDB closed.")
    },
    onRegisterService(container) {
      container.bind(TYPE.JsonDB).toValue({
        loadDB(name) {
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
