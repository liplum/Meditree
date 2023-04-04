import { type FileTree } from "../file.js"
import { type MeditreePlugin, pluginTypes } from "../plugin.js"

// eslint-disable-next-line @typescript-eslint/dot-notation
pluginTypes["minify"] = (config) => new MinifyPlugin(config)

interface MinifyPluginConfig {
  /**
   * Remove hiden files and folders from entire tree.
   * False by default.
   */
  removeHidden?: boolean
  /**
   * False by default.
   */
  removeSize?: boolean
}
/**
 * Minify plugin affects only file tree json for client side.
 * The file tree json for parent node won't be modified.
 */
export class MinifyPlugin implements MeditreePlugin {
  readonly removeHidden: boolean
  readonly removeSize: boolean
  constructor(config: MinifyPluginConfig) {
    this.removeHidden = config.removeHidden ?? false
    this.removeSize = config.removeSize ?? false
  }

  onEntireTreeForClient(tree: FileTree): FileTree {
    const removeHidden = this.removeHidden
    const removeSize = this.removeSize
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
