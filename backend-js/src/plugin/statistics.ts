import { token } from "../ioc.js"
import { TYPE as MeditreeType, type MeditreePlugin } from "../server.js"
import { type WithUser } from "./auth.js"
import { type Request } from "express"
import { TYPE as AuthType } from "./auth.js"
import { type PluginMeta } from "../plugin.js"

export const TYPE = {
  StatisticsStorage: token<StatisticsStorageService>("Statistics.Storage")
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

const StatisticsPlugin: PluginMeta<MeditreePlugin, StatisticsPluginConfig> = {
  depends: ["statistics-storage"],
  create(config) {
    let statistics: StatisticsStorageService
    return {
      onRegisterService(container) {
        statistics = container.get(TYPE.StatisticsStorage)
        const events = container.get(MeditreeType.Events)
        const users = container.tryGet(AuthType.UserStorage)
        events.on("file-requested", async (req: Request & Partial<WithUser>, res, file, virtualPath) => {
          await statistics.increment(virtualPath)
          await statistics.setLastView(virtualPath, new Date())
          if (req.user && users) {
            req.user.viewTimes++
            await users.updateUser(req.user)
          }
        })
      },
    }
  }
}
export default StatisticsPlugin
