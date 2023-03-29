import fs from "fs"
import path from "path"
import { promisify } from "util"

type FileSystemEntry = LocalFile | FileTree
export type FileType = string
export interface File {
  type: FileType
  size: number
}
export interface LocalFile extends File {
  path: string
}

export const statAsync = promisify(fs.stat)
export const readdirAsync = promisify(fs.readdir)
export type PathFilter = (path: string) => boolean
export type FileClassifier = (path: string) => FileType | null
export interface CreateFileTreeOptions {
  root: string
  classifier: FileClassifier
  includes: (path: string) => boolean
  /**
   * whether to ignore the empty file tree
   */
  pruned: boolean
}
export interface FileTreeLike {
  resolveFile: (pathParts: string[]) => LocalFile | null
  toJSON: () => FileTreeJson
}

export interface FileTreeJson {
  [name: string]: { type: string, size: number } | FileTreeJson
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

  resolveFile(pathParts: string[]): LocalFile | null {
    let currentFsEntry: FileSystemEntry | undefined = this
    while (pathParts.length > 0 && currentFsEntry instanceof FileTree) {
      const currentPart = pathParts.shift()
      if (currentPart === undefined) break
      currentFsEntry = currentFsEntry.name2File.get(currentPart)
    }
    if (currentFsEntry instanceof FileTree) {
      return null
    } else {
      return currentFsEntry as LocalFile
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
    const { root, pruned, classifier, includes } = options
    const stats = await statAsync(root)
    if (!stats.isDirectory()) {
      throw Error(`${root} isn't a directory`)
    }
    const tree = new FileTree(root)
    const walk = async (
      tree: FileTree,
      currentDirectory: string,
    ): Promise<void> => {
      let files: string[]
      try {
        files = await readdirAsync(currentDirectory)
      } catch (e) {
        console.error(e)
        return
      }
      for (const fileName of files) {
        const filePath = path.join(currentDirectory, fileName)
        if (!includes(filePath)) continue
        try {
          const stat = fs.statSync(filePath)
          if (stat.isFile()) {
            const fileType = classifier(filePath)
            if (fileType != null) {
              tree.addFileSystemEntry(fileName, {
                path: filePath,
                type: fileType,
                size: stat.size,
              })
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

  toJSON(): FileTreeJson {
    const obj = {}
    for (const [name, file] of this.name2File.entries()) {
      if (file instanceof FileTree) {
        obj[name] = file.toJSON()
      } else {
        obj[name] = {
          type: file.type,
          size: file.size
        }
      }
    }
    return obj
  }
}
