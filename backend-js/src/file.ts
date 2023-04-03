import path from "path"

export type FileType = string
export interface File {
  "*type": FileType
  size?: number
  "*hide"?: boolean
  path: string
}
export interface FileTree {
  ["*hide"]?: boolean
  [name: string]: File | FileTree | any
}

export class LocalFile implements File {
  readonly parent: LocalFileTree
  readonly name: string
  readonly "*type": FileType
  readonly size: number
  readonly path: string
  readonly localPath: string
  "*hide"?: boolean
  constructor(parent: LocalFileTree, name: string, type: FileType, size: number, localPath: string, path: string) {
    this.parent = parent
    this.name = name
    this["*type"] = type
    this.size = size
    this.localPath = localPath
    this.path = path
  }

  toJSON(): File {
    return {
      "*type": this["*type"],
      size: this.size,
      "*hide": this["*hide"],
      path: this.path,
    }
  }
}

export type PathFilter = (path: string) => boolean
export class ResolvedFile {
  inner: File
  [key: string]: any
  constructor(file: File) {
    this.inner = file
  }
}
export interface FileTreeLike {
  resolveFile: (pathParts: string[]) => ResolvedFile | null
  toJSON: () => FileTree
}

export class LocalFileTree implements FileTreeLike {
  parent: LocalFileTree | null = null
  hide?: boolean
  name2File = new Map<string, LocalFile | LocalFileTree>()
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

  resolveFile(pathParts: string[]): ResolvedFile | null {
    let cur: LocalFile | LocalFileTree | undefined = this
    while (pathParts.length > 0 && cur instanceof LocalFileTree) {
      const currentPart = pathParts.shift()
      if (currentPart === undefined) break
      cur = cur.name2File.get(currentPart)
    }
    if (cur instanceof LocalFile) {
      return new ResolvedFile(cur)
    } else {
      return null
    }
  }

  get subtreeChildrenCount(): number {
    let total = 0
    for (const file of this.name2File.values()) {
      if (file instanceof LocalFileTree) {
        total += file.subtreeChildrenCount
      } else {
        total++
      }
    }
    return total
  }

  addFile(name: string, file: LocalFile | LocalFileTree): void {
    this.name2File.set(name, file)
  }

  removeFile(name: string): void {
    this.name2File.delete(name)
  }

  createSubtree(rootPath: string): LocalFileTree {
    const subtree = new LocalFileTree(rootPath)
    subtree.parent = this
    return subtree
  }

  toJSON(): FileTree {
    const obj = {}
    for (const [name, file] of this.name2File.entries()) {
      if (file instanceof LocalFileTree) {
        obj[name] = file.toJSON()
      } else if (file instanceof LocalFile) {
        obj[name] = file.toJSON()
      }
    }
    return obj
  }

  * visit(predicate?: (name: string, file: LocalFile | FileTree) => boolean): Iterable<LocalFile | LocalFileTree> {
    for (const [name, file] of this.name2File.entries()) {
      if (!predicate || predicate(name, file)) {
        if (file instanceof LocalFileTree) {
          yield* file.visit(predicate)
        } else {
          yield file
        }
      }
    }
  }
}

export function filterFileTreeJson(tree: FileTree, filter: (file: File) => boolean): FileTree {
  const filteredTree: FileTree = {}
  for (const [name, fileOrSubtree] of Object.entries(tree)) {
    if (fileOrSubtree["*type"]) {
      if (filter(fileOrSubtree as File)) {
        filteredTree[name] = fileOrSubtree
      }
    } else {
      const filteredSubtree = filterFileTreeJson(fileOrSubtree as FileTree, filter)
      if (Object.keys(filteredSubtree).length > 0) {
        filteredTree[name] = filteredSubtree
      }
    }
  }
  return filteredTree
}
