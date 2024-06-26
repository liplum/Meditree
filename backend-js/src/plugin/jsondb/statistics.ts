import { type PluginMeta } from "../../plugin.js"
import { type MeditreePlugin } from "../../server.js"
import { StatisticsType as StatisticsType } from "../statistics.js"
import { Type as JsonDBType } from "./core.js"
interface JsonDBStatisticsPluginConfig {
  /**
   * The statistics json file.
   * "statistics" by default.
   */
  collection?: string
}

interface Entry {
  view: number
  lastView: Date
}
/**
 * Default plugin dependencies: `jsondb`.
 */
const JsonDBStatisticsPlugin: PluginMeta<MeditreePlugin, JsonDBStatisticsPluginConfig> = {
  implements: ["statistics-storage"],
  depends: ["jsondb"],
  create: (config) => {
    const collection = config.collection ?? "statistics"
    return {
      setupService: (container) => {
        const jsondb = container.get(JsonDBType.JsonDB)
        const statistics = jsondb.loadDB(collection)
        container.bind(StatisticsType.StatisticsStorage).toValue({
          increment: async (filePath: string) => {
            const path = `/${filePath}`
            if (await statistics.exists(path)) {
              const entry: Entry = await statistics.getData(path)
              entry.view ??= 0
              entry.view += 1
              await statistics.push(path, entry)
            } else {
              await statistics.push(path, { view: 1 })
            }
          },
          getViewCount: async (filePath: string) => {
            const path = `/${filePath}`
            if (await statistics.exists(`/${path}`)) {
              const entry: Entry = await statistics.getData(path)
              return entry.view
            } else {
              return
            }
          },
          getLastView: async (filePath) => {
            const path = `/${filePath}`
            if (await statistics.exists(`/${path}`)) {
              const entry: Entry = await statistics.getData(path)
              return new Date(entry.lastView)
            } else {
              return
            }
          },
          setLastView: async (filePath, time) => {
            const path = `/${filePath}`
            if (await statistics.exists(path)) {
              const entry: Entry = await statistics.getData(path)
              entry.lastView = time
              await statistics.push(path, entry)
            } else {
              await statistics.push(path, { lastView: time })
            }
          },
        })
      }
    }
  }
}
export default JsonDBStatisticsPlugin
