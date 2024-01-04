import { type FileTreeJson, iterateFilesInDir, type FileJson } from "../file.js"
import { type PluginMeta } from "../plugin.js"
import { type MeditreePlugin } from "../server.js"

interface MinifyPluginConfig {
  /**
   * Remove hidden files and folders from entire tree.
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
const MinifyPlugin: PluginMeta<MeditreePlugin, MinifyPluginConfig> = {
  create(config) {
    const removeHidden = config.removeHidden ?? true
    const removeSize = config.removeSize ?? true
    return {
      onClientFileTreeUpdated(tree): FileTreeJson {
        if (removeHidden || removeSize) {
          function visit(cur: FileTreeJson): void {
            for (const [name, file] of iterateFilesInDir(cur) as Iterable<[string, Partial<FileJson> | Partial<FileTreeJson>]>) {
              if (removeHidden && file["*hide"]) {
                // I have to delete a dynamic property, because it's in json.
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete cur[name]
              } else {
                if (file["*type"]) {
                  if (removeSize) {
                    delete file.size
                  }
                } else {
                  visit(file)
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
}
export default MinifyPlugin
