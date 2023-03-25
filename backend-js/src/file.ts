import fs from "fs"
import path from "path"
import { promisify } from "util"

type FileSystemEntry = File | FileTree
export type FileType = string | null
/**
 * A file entity represents a 
 */
interface FileEntity {

}
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

export const statAsync = promisify(fs.stat)
export const readdirAsync = promisify(fs.readdir)
export type PathFilter = (path: string) => boolean
export type FileClassifier = (path: string) => FileType
export interface CreateFileTreeOptions {
  root: string
  classifier: FileClassifier
  allowNullFileType: boolean
  /**
   * whether to ignore the empty file tree
   */
  pruned: boolean
}
export interface FileTreeLike {
  resolveFile: (pathParts: string[]) => File | null
}
export interface FileTreeJson {
  name: string
  files: FileTreeJsonEntry
}
export interface FileTreeJsonEntry {
  [name: string]: string | FileTreeJsonEntry
}
export class FileTree implements FileTreeLike {
  parent: FileTree | null = null
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

  resolveFile(pathParts: string[]): File | null {
    let currentFsEntry: FileSystemEntry | undefined = this
    while (pathParts.length > 0 && currentFsEntry instanceof FileTree) {
      const currentPart = pathParts.shift()
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
    for (const file of this.name2File.values()) {
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

  static async createFrom(options: CreateFileTreeOptions): Promise<FileTree> {
    const root = options.root
    const stats = await statAsync(root)
    if (!stats.isDirectory()) {
      throw Error(`${root} isn't a directory`)
    }
    const tree = new FileTree(root)
    const pruned = options.pruned
    const walk = async (
      tree: FileTree,
      currentDirectory: string,
    ): Promise<void> => {
      let files: string[]
      try {
        files = await readdirAsync(currentDirectory)
      } catch (e) {
        console.error(e.message)
        return
      }
      for (const fileName of files) {
        const filePath = path.join(currentDirectory, fileName)
        try {
          const stat = fs.statSync(filePath)
          if (stat.isFile()) {
            const fileType = options.classifier(filePath)
            if (options.allowNullFileType || fileType != null) {
              const file = new File(filePath, fileType)
              tree.addFileSystemEntry(fileName, file)
            }
          } else if (stat.isDirectory()) {
            const subtree = tree.createSubtree(filePath)
            tree.addFileSystemEntry(fileName, subtree)
            await walk(subtree, filePath)
            if (pruned && subtree.subtreeChildrenCount === 0) {
              tree.removeFileSystemEntry(fileName)
            }
          } else {
            console.log("Unknown file type", filePath)
          }
        } catch (e) {
          continue
        }
      }
    }
    await walk(tree, root)
    return tree
  }

  createSubtree(rootPath: string): FileTree {
    const subtree = new FileTree(rootPath)
    subtree.parent = this
    return subtree
  }

  toJSON(): FileTreeJsonEntry {
    const obj = Object()
    for (const [name, file] of this.name2File.entries()) {
      if (file instanceof File) {
        obj[name] = file.type
      } else if (file instanceof FileTree) {
        obj[name] = file.toJSON()
      }
    }
    return obj
  }

  convertJson(): FileTreeJson {
    return {
      name: this.name,
      files: this.toJSON(),
    }
  }
}
