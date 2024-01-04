import { type PluginMeta } from "../plugin.js"
import { type MeditreePlugin } from "../server.js"

export const HLSMediaType = "application/x-mpegURL"
interface HLSPluginConfig {
  /**
   * Whether to hide .ts files in the folder where .m3u8 file is.
   * "false" by default.
   */
  hideTsFile?: boolean
}

const HLSPlugin: PluginMeta<MeditreePlugin, HLSPluginConfig> = {
  create(config) {
    const hideTsFile = config.hideTsFile ?? false
    return {
      onLocalFileTreeRebuilt(tree) {
        for (const m3u8Fi of tree.visitFile({
          fileFilter: (f) => f.type === HLSMediaType,
          dirFilter: (d) => d.tag?.main === undefined,
        })) {
          const dir = m3u8Fi.parent
          dir.tag ??= {}
          dir.tag.main = m3u8Fi.name
          if (hideTsFile) {
            for (const tsFi of dir.visitFile({ fileFilter: (f) => f !== m3u8Fi })) {
              tsFi.hidden = true
            }
          }
        }
      }
    }
  }
}
export default HLSPlugin
