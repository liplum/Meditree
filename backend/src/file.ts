import * as fs from "fs"
import * as path from "path"
import { promisify } from "util"

type FileSystemEntry = File | FileTree

export type FileType = string | null
export class File {
  type: FileType
  path: string
  constructor(path: string, type: FileType = null) {
    this.path = path
    this.type = type
  }

  toJSON(): object {
    return {
      type: this.type,
      path: this.path
    }
  }
}

export function findFileInFileTree(dir: string, fileName: string): string | null {
  let lastDir: string | null = null
  while (dir !== lastDir) {
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
export const lstatAsync = promisify(fs.stat)
export type PathFilter = (path: string) => boolean
export type FileClassifier = (path: string) => FileType
const alwaysNull: FileClassifier = (_) => null
interface CreateFileTreeOptions {
  root: string
  classifier: FileClassifier
  allowNullFileType: boolean
  /**
   * whether to ignore the empty file tree
   */
  pruned: boolean
}
export class FileTree {
  /**
   * It's inherited from the parent tree.
   */
  classifier: FileClassifier = alwaysNull
  parent: FileTree | null = null
  /**
 * It's inherited from the parent tree.
 */
  allowNullFileType: boolean = false
  name2File = new Map<string, FileSystemEntry>()
  rootPath: string
  readonly name: string
  constructor(rootPath: string) {
    this.rootPath = rootPath
    this.name = path.basename(rootPath)
  }

  /**
   * example: "a/b/c"
   */
  get ancestorFullPath(): string {
    const parts: string[] = []
    let curTree = this.parent
    while (curTree != null) {
      parts.unshift(curTree.name)
      curTree = curTree.parent
    }
    return parts.join("/")
  }

  resolveFile(filePath: string): File | null {
    const parts = filePath.split("/")
    let currentFsEntry: FileSystemEntry | undefined = this
    while (parts.length > 0 && currentFsEntry instanceof FileTree) {
      const currentPart = parts.shift()
      if (currentPart === undefined) break
      currentFsEntry = currentFsEntry.name2File.get(currentPart)
    }
    if (currentFsEntry instanceof File) {
      return currentFsEntry
    } else {
      return null
    }
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
    return total
  }

  addFileSystemEntry(name: string, file: FileSystemEntry): void {
    this.name2File.set(name, file)
  }

  removeFileSystemEntry(name: string): void {
    this.name2File.delete(name)
  }

  static async createFileTreeAsync(options: CreateFileTreeOptions): Promise<FileTree> {
    const root = options.root
    const stats = await lstatAsync(root)
    if (!stats.isDirectory()) {
      throw Error(`${root} isn't a directory`)
    }
    const tree = new FileTree(root)
    tree.classifier = options.classifier
    tree.allowNullFileType = options.allowNullFileType
    await this.iterateFileTreeAsync(tree, root, options.pruned)
    return tree
  }

  createSubTree(rootPath: string): FileTree {
    const subtree = new FileTree(rootPath)
    subtree.allowNullFileType = this.allowNullFileType
    subtree.classifier = this.classifier
    subtree.parent = this
    return subtree
  }

  private static async iterateFileTreeAsync(
    tree: FileTree,
    currentDirectory: string,
    pruned: boolean = false,
  ): Promise<void> {
    const fileNames = fs.readdirSync(currentDirectory)
    for (const fileName of fileNames) {
      const filePath = path.join(currentDirectory, fileName)
      const stats = await lstatAsync(filePath)
      if (stats.isFile()) {
        const fileType = tree.classifier(filePath)
        if (tree.allowNullFileType || fileType != null) {
          const file = new File(filePath, fileType)
          tree.addFileSystemEntry(fileName, file)
        }
      } else if (stats.isDirectory()) {
        const subtree = tree.createSubTree(filePath)
        tree.addFileSystemEntry(fileName, subtree)
        await this.iterateFileTreeAsync(subtree, filePath, pruned)
        if (pruned && subtree.subtreeChildrenCount === 0) {
          tree.removeFileSystemEntry(fileName)
        }
      }
    }
  }

  printTree(print = console.log, indentStep: number = 2): void {
    this.printTreeWithIntent(print, 0, indentStep)
  }

  private printTreeWithIntent(print = console.log, indent: number, indentStep: number = 2): void {
    print(" ".repeat(indent) + this.name + "\\")
    for (const [name, file] of this.name2File.entries()) {
      if (file instanceof FileTree) {
        file.printTreeWithIntent(print, indent + indentStep, indentStep)
      } else if (file instanceof File) {
        print(" ".repeat(indent + indentStep) + name)
      }
    }
  }

  toJSON(): object {
    const obj = Object()
    for (const [name, file] of this.name2File.entries()) {
      if (file instanceof File) {
        obj[name] = {
          type: file.type,
          name,
        }
      } else if (file instanceof FileTree) {
        obj[name] = file.toJSON()
      }
    }
    return obj
  }
}
