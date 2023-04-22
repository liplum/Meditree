import { type MeditreePlugin } from "../../server.js"
interface JsonDBStatisticsPluginConfig {
  /**
   * The statistics json file.
   * "meditree-statistics.json" by default.
   */
  collection?: string
}

export default function JsonDBStatisticsPlugin(config: JsonDBStatisticsPluginConfig): MeditreePlugin {
  return {}
}
