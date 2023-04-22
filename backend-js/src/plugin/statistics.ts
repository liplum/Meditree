import { uniqueToken } from "../ioc.js"
import { type MeditreePlugin } from "../server.js"
interface StatisticsPluginConfig {

}
export const TYPE = {
  StatisticsStorage: uniqueToken<StatisticsStorageService>("StatisticsStorage")
}

export default function StatisticsPlugin(config: StatisticsPluginConfig): MeditreePlugin {
  let statistics: StatisticsStorageService
  return {
    onRegisterService(container) {
      statistics = container.get(TYPE.StatisticsStorage)
    },
    async onFileRequested(req, res, file) {
      statistics.increment(file.path)
    },
  }
}

export interface StatisticsStorageService {
  increment(filePath: string): Promise<void>
  getViewCount(filePath: string): Promise<number | undefined>
}
