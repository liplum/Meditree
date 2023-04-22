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

/**
 * Default plugin dependencies: `mongodb`.
 */
export default function MongoDBStatisticsPlugin(config: MongoDBStatisticsPluginConfig): MeditreePlugin {
  const collection = config.collection ?? "statistics"
  return {
    onRegisterService(container) {
      const mongodb = container.get(MongoDBType.MongoDB)
      const statistics = mongodb.db.collection(collection)
      container.bind(StatisticsType.StatisticsStorage).toValue({
        async increment(filePath: string) {
          await statistics.updateOne({ filePath }, { $inc: { view: 1 } })
        },
        async getViewCount(filePath: string) {
          const entry = await statistics.findOne({ filePath })
          return entry ? entry.view : undefined
        }
      })
    }
  }
}
