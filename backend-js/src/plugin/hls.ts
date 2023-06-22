import path from "path"
import { LocalFileTree } from "../file.js"
import { type MeditreePlugin } from "../server.js"

export const HLSMediaType = "application/x-mpegURL"
interface HLSPluginConfig {
  /**
   * Whether to hide the directory of .ts files for m3u8 index.
   * True by default.
   */
  hideTsDir?: boolean
}
export default function HLSPlugin(config: HLSPluginConfig): MeditreePlugin {
  const hideTsDir = config.hideTsDir ?? true
  return {
    onLocalFileTreeGenerated(tree) {
      if (!hideTsDir) return
      for (const file of tree.visitFile((file) => file["*type"] === HLSMediaType)) {
        const pureName = path.basename(file.localPath, path.extname(file.localPath))
        const tsDir = file.parent.name2File.get(pureName)
        if (tsDir instanceof LocalFileTree) {
          tsDir.hidden = true
        }
      }
    }
  }
}
