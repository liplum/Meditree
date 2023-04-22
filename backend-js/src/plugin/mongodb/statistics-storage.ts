import { type MeditreePlugin } from "../../server.js"
interface MongoDBStatisticsPluginConfig {
  /**
   * The statistics json file.
   * "meditree-statistics.json" by default.
   */
  collection?: string
}

export default function MongoDBStatisticsPlugin(config: MongoDBStatisticsPluginConfig): MeditreePlugin {
  return {}
}
