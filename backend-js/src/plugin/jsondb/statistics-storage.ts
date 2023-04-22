import { type MeditreePlugin } from "../../server.js"
import { TYPE as StatisticsType } from "../statistics.js"
import { TYPE as JsonDBType } from "./core.js"
interface JsonDBStatisticsPluginConfig {
  /**
   * The statistics json file.
   * "statistics" by default.
   */
  collection?: string
}

interface StatisticsEntry {
  view: number
}
/**
 * Default plugin dependencies: `jsondb`.
 */
export default function JsonDBStatisticsPlugin(config: JsonDBStatisticsPluginConfig): MeditreePlugin {
  const collection = config.collection ?? "statistics"
  return {
    onRegisterService(container) {
      const jsondb = container.get(JsonDBType.JsonDB)
      const statistics = jsondb.loadDB(collection)
      container.bind(StatisticsType.StatisticsStorage).toValue({
        async increment(filePath: string) {
          const path = `/${filePath}`
          if (await statistics.exists(path)) {
            const entry = await statistics.getData(path) as StatisticsEntry
            entry.view ??= 0
            entry.view += 1
            await statistics.push(path, entry)
          } else {
            await statistics.push(path, { view: 1 } satisfies StatisticsEntry)
          }
        },
        async getViewCount(filePath: string) {
          const path = `/${filePath}`
          if (await statistics.exists(`/${path}`)) {
            const entry = await statistics.getData(path) as StatisticsEntry
            return entry.view
          } else {
            return
          }
        }
      })
    }
  }
}
