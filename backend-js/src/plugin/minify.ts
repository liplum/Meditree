import { type FileTreeJson } from "../file.js"
import { type MeditreePlugin } from "../server.js"

interface MinifyPluginConfig {
  /**
   * Remove hiden files and folders from entire tree.
   * True by default.
   */
  removeHidden?: boolean
  /**
   * True by default.
   */
  removeSize?: boolean
}
/**
 * Minify plugin affects only file tree json for client side.
 */
export default function MinifyPlugin(config: MinifyPluginConfig): MeditreePlugin {
  const removeHidden = config.removeHidden ?? true
  const removeSize = config.removeSize ?? true
  return {
    onClientFileTreeUpdated(tree): FileTreeJson {
      if (removeHidden || removeSize) {
        function visit(cur: FileTreeJson): void {
          for (const [name, fileOrSubtree] of Object.entries(cur)) {
            if (name === "*hide" || name === "*tag") continue
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
}
