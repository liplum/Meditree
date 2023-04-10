import path from "path"
import { LocalFile, LocalFileTree } from "../file.js"
import { type MeditreePlugin } from "../plugin.js"

export const HLSMediaType = "application/x-mpegURL"
// eslint-disable-next-line @typescript-eslint/dot-notation
interface HLSPluginConfig {
  /**
   * Whether to hide the directory of .ts files for m3u8 index.
   * True by default.
   */
  hideTsDir?: boolean
}
export function HLSPlugin(config: HLSPluginConfig): MeditreePlugin {
  const hideTsDir = config.hideTsDir ?? true
  return {
    onPostGenerated(tree) {
      if (!hideTsDir) return
      for (let file of tree.visit((name, file) => {
        return file instanceof LocalFile && file["*type"] === HLSMediaType
      })) {
        file = file as LocalFile
        const pureName = path.basename(file.localPath, path.extname(file.localPath))
        const tsDir = file.parent.name2File.get(pureName)
        if (tsDir instanceof LocalFileTree) {
          tsDir.hidden = true
        }
      }
    }
  }
}
