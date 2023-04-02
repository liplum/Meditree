import path from "path"
import { type FileType, type File, FileTree, LocalFile, LocalFileTree } from "./file"
import { type FileTreePlugin } from "./host"

export const HLSMediaType = "application/x-mpegURL"

export class HLSPlugin implements FileTreePlugin {
  onPostGenerated(tree: LocalFileTree): void {
    for (let file of tree.visit((name, file) => {
      return file instanceof LocalFile && file["*type"] === HLSMediaType
    })) {
      file = file as LocalFile
      const tsDir = file.parent.name2File.get(path.basename(file.localPath, path.extname(file["*type"])))
      if (tsDir instanceof LocalFileTree) {
        tsDir.hide = true
      }
    }
  }
}
