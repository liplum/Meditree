import { type FileTree, filterFileTreeJson } from "../file.js"
import { MeditreePlugin, pluginTypes } from "../plugin.js"

// eslint-disable-next-line @typescript-eslint/dot-notation
pluginTypes["minify"] = (config) => new MinifyPlugin(config)

interface MinifyPluginConfig {
  /**
   * Remove hiden files and folders from entire tree.
   */
  removeHiden?: boolean
}

export class MinifyPlugin extends MeditreePlugin<MinifyPluginConfig> {
  onEntireTreeUpdated(tree: FileTree): FileTree {
    if (this.config.removeHiden) {
      return filterFileTreeJson(tree, (file) => !file["*hiden"])
    }
    return tree
  }
}
