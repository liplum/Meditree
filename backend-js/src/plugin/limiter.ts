import { filterFileTreeJson } from "../file.js"
import { type MeditreePlugin } from "../server.js"

interface LimiterPluginConfig {
  /**
   * The maximum(including) file size allowed.
   * No limitation by default.
   * 
   * `<=0` means unlimited.
   */
  maxFileSize?: number
}

export default function LimiterPlugin(config: LimiterPluginConfig): MeditreePlugin {
  const maxFileSize = config.maxFileSize
  return {
    onClientFileTreeUpdated(fileTree) {
      return filterFileTreeJson(fileTree, (file) => {
        return maxFileSize === undefined || file.size < maxFileSize
      })
    }
  }
}
