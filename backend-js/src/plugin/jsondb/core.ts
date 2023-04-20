import { type MeditreePlugin } from "../../server.js"
import { uniqueToken } from "../../ioc.js"
import { createLogger } from "../../logger.js"
import { JsonDB, Config } from "node-json-db"

// eslint-disable-next-line @typescript-eslint/dot-notation
interface JsonDbPluginConfig {
  /**
   * "meditree" by default.
   */
  filename: string
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
  db: JsonDB
}

export const TYPE = {
  JsonDB: uniqueToken<JsonDbService>("JsonDB"),
}

export default function JsonDbPlugin(config: JsonDbPluginConfig): MeditreePlugin {
  const log = createLogger("JsonDB")
  let db: JsonDB
  return {
    async init() {
      const filename = config.filename ?? "meditree"
      db = new JsonDB(
        new Config(
          filename,
          config.saveOnPush,
          config.humanReadable,
          "/",
          config.syncOnSave,
        )
      )
      log.info(`JsonDB is loaded from ${filename}`)
    },
    onExit() {
      db?.save()
      log.info("JsonDB saved and closed.")
    },
    onRegisterService(container) {
      if (db === undefined) throw new Error("JsonDB is not initialized.")
      container.bind(TYPE.JsonDB).toValue({
        db
      })
    },
  }
}
