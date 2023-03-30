import fs from "fs"
import path from "path"
import { promisify } from "util"

export type FileType = string
export interface File {
  type: FileType
  size: number
  path: string
}
export class LocalFile implements File {
  type: string
  size: number
  path: string
  localPath: string
  constructor(type: FileType, size: number, localPath: string, path: string) {
    this.type = type
    this.size = size
    this.localPath = localPath
    this.path = path
  }
}
export interface RemoteFile extends File {
  nodeName: string
}

export const statAsync = promisify(fs.stat)
export const readdirAsync = promisify(fs.readdir)
export type PathFilter = (path: string) => boolean
export type FileClassifier = (path: string) => FileType | null
export interface FileTreeLike<TFile = File> {
  resolveFile: (pathParts: string[]) => TFile | null
  toJSON: () => FileTreeJson
}
export interface FileTreeJson {
  [name: string]: File | FileTreeJson
}
export class FileTree implements FileTreeLike {
  parent: FileTree | null = null
  name2File = new Map<string, LocalFile | FileTree>()
  rootPath: string
  readonly name: string
  constructor(rootPath: string) {
    this.rootPath = rootPath
    this.name = path.basename(rootPath)
  }

  /**
   * example: "a/b/c"
   */
  walkAncestorPathParts(): string[] {
    const parts: string[] = []
    let curTree = this.parent
    while (curTree != null) {
      parts.unshift(curTree.name)
      curTree = curTree.parent
    }
    return parts
  }

  resolveFile(pathParts: string[]): LocalFile | null {
    let cur: File | FileTree | undefined = this
    while (pathParts.length > 0 && cur instanceof FileTree) {
      const currentPart = pathParts.shift()
      if (currentPart === undefined) break
      cur = cur.name2File.get(currentPart)
    }
    if (cur instanceof FileTree) {
      return null
    } else {
      return cur as LocalFile
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

  addFile(name: string, file: LocalFile | FileTree): void {
    this.name2File.set(name, file)
  }

  removeFile(name: string): void {
    this.name2File.delete(name)
  }

  static async createFrom({ rootPath: root, initPath, buildPath, pruned, classifier, includes }: {
    rootPath: string
    initPath?: string[]
    buildPath?: (pathParts: string[]) => string
    classifier: FileClassifier
    includes: (path: string) => boolean
    /**
     * whether to ignore the empty file tree
     */
    pruned: boolean
  }): Promise<FileTree> {
    const stats = await statAsync(root)
    if (!stats.isDirectory()) {
      throw Error(`${root} isn't a directory`)
    }
    const tree = new FileTree(root)
    const walk = async (
      tree: FileTree,
      currentDirectory: string,
      pathInTreeParts: string[],
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
          const curPathInTreeParts = [...pathInTreeParts, fileName]
          if (stat.isFile()) {
            const fileType = classifier(filePath)
            if (fileType != null) {
              tree.addFile(fileName, new LocalFile(
                fileType,
                stat.size,
                filePath,
                buildPath ? buildPath(curPathInTreeParts) : curPathInTreeParts.join("/"),
              ))
            }
          } else if (stat.isDirectory()) {
            const subtree = tree.createSubtree(filePath)
            tree.addFile(fileName, subtree)
            await walk(subtree, filePath, curPathInTreeParts)
            if (pruned && subtree.subtreeChildrenCount === 0) {
              tree.removeFile(fileName)
            }
          } else {
            console.log("Unknown file type", filePath)
          }
        } catch (e) {
          continue
        }
      }
    }
    await walk(tree, root, initPath ?? [])
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
      } else if (file instanceof LocalFile) {
        obj[name] = {
          type: file.type,
          path: file.path,
          size: file.size,
        }
      }
    }
    return obj
  }
}
