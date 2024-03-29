import { type PluginMeta } from "../../plugin.js"
import { type MeditreePlugin } from "../../server.js"
import { TYPE as StatisticsType } from "../statistics.js"
import { TYPE as MongoDBType } from "./core.js"

interface MongoDBStatisticsPluginConfig {
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
 * Default plugin dependencies: `mongodb`.
 */
const MongoDBStatisticsPlugin: PluginMeta<MeditreePlugin, MongoDBStatisticsPluginConfig> = {
  implements: ["statistics-storage"],
  depends: ["mongodb"],
  create(config) {
    const collection = config.collection ?? "statistics"
    return {
      setupService(container) {
        const mongodb = container.get(MongoDBType.MongoDB)
        const statistics = mongodb.db.collection<Entry>(collection)
        container.bind(StatisticsType.StatisticsStorage).toValue({
          async increment(filePath: string) {
            await statistics.updateOne({ filePath }, { $inc: { view: 1 } }, { upsert: true })
          },
          async getViewCount(filePath: string) {
            const entry = await statistics.findOne({ filePath })
            return entry ? entry.view : undefined
          },
          async getLastView(filePath) {
            const entry = await statistics.findOne({ filePath })
            return entry ? entry.lastView : undefined
          },
          async setLastView(filePath, time) {
            await statistics.updateOne({ filePath }, { $set: { lastView: time } }, { upsert: true })
          },
        })
      }
    }
  }
}
export default MongoDBStatisticsPlugin
