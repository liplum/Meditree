import { type FileTree } from "../file.js"
import { MeditreePlugin, pluginTypes } from "../plugin.js"

// eslint-disable-next-line @typescript-eslint/dot-notation
pluginTypes["minify"] = (config) => new MinifyPlugin(config)

interface MinifyPluginConfig {
  /**
   * Remove hiden files and folders from entire tree.
   */
  removeHidden?: boolean
  removeSize?: boolean
}

export class MinifyPlugin extends MeditreePlugin<MinifyPluginConfig> {
  onEntireTreeUpdated(tree: FileTree): FileTree {
    const removeHidden = this.config.removeHidden ?? false
    const removeSize = this.config.removeSize ?? false
    if (removeHidden || removeSize) {
      function visit(cur: FileTree): void {
        for (const [name, fileOrSubtree] of Object.entries(cur)) {
          if (removeHidden && fileOrSubtree["*hide"]) {
            // I have to delete a dynamic property, because it's in json.
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete cur[name]
          } else {
            if (fileOrSubtree["*type"]) {
              if (removeSize) {
                delete fileOrSubtree.size
              }
            } else {
              visit(fileOrSubtree)
            }
          }
        }
      }
      visit(tree)
      return tree
    }
    return tree
  }
}
