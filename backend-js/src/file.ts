import path from "path"

export type FileType = string
export interface File {
  type: FileType
  size?: number
  hide?: boolean
  path: string
}
export class LocalFile implements File {
  type: FileType
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

export type PathFilter = (path: string) => boolean
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

export function filterFileTreeJson(tree: FileTreeJson, filter: (file: File) => boolean): FileTreeJson {
  const filteredTree: FileTreeJson = {}
  for (const [name, fileOrSubtree] of Object.entries(tree)) {
    if (fileOrSubtree.type) {
      if (filter(fileOrSubtree as File)) {
        filteredTree[name] = fileOrSubtree
      }
    } else {
      const filteredSubtree = filterFileTreeJson(fileOrSubtree as FileTreeJson, filter)
      if (Object.keys(filteredSubtree).length > 0) {
        filteredTree[name] = filteredSubtree
      }
    }
  }
  return filteredTree
}
