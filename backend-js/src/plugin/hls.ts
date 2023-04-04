import path from "path"
import { LocalFile, LocalFileTree } from "../file.js"
import { pluginTypes, type MeditreePlugin } from "../plugin.js"

export const HLSMediaType = "application/x-mpegURL"
// eslint-disable-next-line @typescript-eslint/dot-notation
pluginTypes["hls"] = (config) => new HLSPlugin(config)
interface HLSPluginConfig {
  /**
   * True by default.
   */
  hideTsDir?: boolean
}
export class HLSPlugin implements MeditreePlugin {
  readonly hideTsDir: boolean
  constructor(config: HLSPluginConfig) {
    this.hideTsDir = config.hideTsDir ?? true
  }

  onPostGenerated(tree: LocalFileTree): void {
    if (!this.hideTsDir) return
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
