import { dir } from 'console';
import * as fs from 'fs';
import { type } from 'os';
import * as path from 'path'
import { promisify } from 'util'
enum FileType {
  local = "local"
}
type FileEntryLike = File | FileTree
class File {
  type: FileType
  path: String
  constructor(type: FileType, path: String) {
    this.type = type
    this.path = path
  }
  static local(path: String): File {
    return new File(FileType.local, path)
  }
}

export function findFileInFileTree(dir: string, fileName: string): string | null {
  let lastDir: string | null = null
  while (dir != lastDir) {
    const configFile = path.join(dir, fileName)
    if (fs.existsSync(configFile)) {
      return configFile
    } else {
      lastDir = dir
      dir = path.dirname(dir)
    }
  }
  return null
}
export let lstatAsync = promisify(fs.stat)
export type PathFilter = (path: string) => boolean
let alwaysAllowFile: PathFilter = (_) => true
export class FileTree {
  /// Subtree will inherit filter from parent tree.
  filter: PathFilter = alwaysAllowFile
  name2File = new Map<string, FileEntryLike>()
  rootName: string
  constructor(rootName: string) {
    this.rootName = rootName
  }

  resolve(filePath: string): File | null {
    const parts = filePath.split(path.sep)
    return FileTree.resolveByParts(this, parts)
  }

  get subtreeChildrenCount(): number {
    let total = 0
    for (const [_, file] of this.name2File) {
      if (file instanceof FileTree) {
        total += file.subtreeChildrenCount
      } else {
        total++
      }
    }
    return total;
  }

  private static resolveByParts(tree: FileTree, filePathParts: string[]): File | null {
    if (filePathParts.length == 0) {
      // it should never happen
      return null
    } else if (filePathParts.length == 1) {
      // if not found, null will be returned
      const target: FileEntryLike | null = tree.name2File[filePathParts[0]]
      if (target instanceof File) {
        return target
      } else {
        return null
      }
    } else {
      const curPosition = filePathParts.shift()
      const curFileTree: FileEntryLike | null = tree.name2File[curPosition]
      if (curFileTree instanceof FileTree) {
        return this.resolveByParts(curFileTree, filePathParts)
      } else {
        return null
      }
    }
  }
  addFile(name: string, file: FileEntryLike) {
    this.name2File.set(name, file)
  }
  removeFile(name: string) {
    this.name2File.delete(name)
  }
  /**
   * {@link pruned}: whether to ignore the empty file tree
   */
  static async subFileTreeFromAsync(
    direcotry: string,
    filter: PathFilter = alwaysAllowFile,
    pruned: boolean = false,
  ): Promise<FileTree> {
    let stats = await lstatAsync(direcotry)
    if (!stats.isDirectory()) {
      throw Error(`${path} isn't a directory`)
    }
    const tree = new FileTree(path.basename(direcotry))
    tree.filter = filter
    await this.iterateFileTreeAsync(tree, direcotry, pruned)
    return tree
  }

  private static async iterateFileTreeAsync(
    tree: FileTree,
    currentDirectory: string,
    pruned: boolean = false,
  ) {
    let fileNames = fs.readdirSync(currentDirectory)
    for (const fileName of fileNames) {
      const filePath = path.join(currentDirectory, fileName)
      let stats = await lstatAsync(filePath)
      if (stats.isFile()) {
        if (tree.filter(filePath)) {
          tree.addFile(fileName, File.local(filePath))
        }
      } else if (stats.isDirectory()) {
        const subtree = new FileTree(fileName)
        subtree.filter = tree.filter
        tree.addFile(fileName, subtree)
        await this.iterateFileTreeAsync(subtree, filePath, pruned)
        if (pruned && subtree.subtreeChildrenCount == 0) {
          tree.removeFile(fileName)
        }
      }
    }
  }

  printTree(print = console.log, indentStep: number = 2) {
    this.printTreeWithIntent(print, 0, indentStep)
  }
  private printTreeWithIntent(print = console.log, indent: number, indentStep: number = 2) {
    print(" ".repeat(indent) + this.rootName + "\\")
    for (const [name, file] of this.name2File.entries()) {
      if (file instanceof FileTree) {
        file.printTreeWithIntent(print, indent + indentStep, indentStep)
      } else if (file instanceof File) {
        print(" ".repeat(indent + indentStep) + name)
      }
    }
  }
}
