import { filterFileTreeJson } from "../file.js"
import { type MeditreePlugin } from "../server.js"
import { parseBytes } from "../utils.js"

interface LimiterPluginConfig {
  /**
   * The maximum(including) file size allowed.
   * No limitation by default.
   * 
   * Any value <= 0 means unlimited.
   */
  maxFileSize?: number
}

export default function LimiterPlugin(config: LimiterPluginConfig): MeditreePlugin {
  const maxFileSize = parseBytes(config.maxFileSize, -1)
  if (maxFileSize <= 0) {
    return {}
  }
  return {
    onClientFileTreeUpdated(fileTree) {
      return filterFileTreeJson(fileTree, (file) => {
        return file.size < maxFileSize
      })
    }
  }
}
