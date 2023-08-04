import { uniqueToken } from "../ioc.js"
import { TYPE as MeditreeType, type MeditreePlugin } from "../server.js"

export const TYPE = {
  StatisticsStorage: uniqueToken<StatisticsStorageService>("StatisticsStorage")
}

export interface StatisticsStorageService {
  increment(filePath: string): Promise<void>
  getViewCount(filePath: string): Promise<number | undefined>

  setLastView(filePath: string, time: Date): Promise<void>
  getLastView(filePath: string): Promise<Date | undefined>
}
interface StatisticsPluginConfig {
  /**
   * 
   */
  statisticsPath?: string
}

export default function StatisticsPlugin(config: StatisticsPluginConfig): MeditreePlugin {
  let statistics: StatisticsStorageService
  return {
    onRegisterService(container) {
      statistics = container.get(TYPE.StatisticsStorage)
      const events = container.get(MeditreeType.Events)
      events.on("file-requested", (req, res, file) => {
        // TODO: don't use local path
        statistics.increment(file.localPath)
        statistics.setLastView(file.localPath, new Date())
      })
    },
  }
}
