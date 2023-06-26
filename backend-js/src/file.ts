export type FileType = string
export interface File {
  "*type": FileType
  size: number
  "*hide"?: boolean
}

export interface FileTree {
  ["*hide"]?: boolean
  [name: string]: File | FileTree | any
}

export class LocalFile implements File {
  readonly parent: LocalFileTree
  readonly "*type": FileType
  readonly size: number
  readonly localPath: string
  "*hide"?: boolean
  constructor(parent: LocalFileTree, type: FileType, size: number, localPath: string) {
    this.parent = parent
    this["*type"] = type
    this.size = size
    this.localPath = localPath
  }

  toJSON(): File {
    return {
      "*type": this["*type"],
      size: this.size,
      "*hide": this["*hide"],
    }
  }
}

export type PathFilter = (path: string) => boolean
export interface FileTreeLike {
  resolveFile: (pathParts: string[]) => LocalFile | null
  toJSON: () => FileTree
}

export class LocalFileTree implements FileTreeLike {
  readonly parent?: LocalFileTree
  hidden?: boolean
  private readonly name2File = new Map<string, LocalFile | LocalFileTree>()
  /**
   * If `rootPath` is undefined, it indicates this file tree is vitrual.
   */
  readonly rootPath?: string
  readonly name: string
  constructor(name: string, rootPath?: string, parent?: LocalFileTree) {
    this.rootPath = rootPath
    this.name = name
    this.parent = parent
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

  /**
 * Resolves a file given its path parts.
 * @param pathParts The parts of the file's path.
 * @returns The resolved file or `null` if it could not be found.
 */
  resolveFile(pathParts: string[]): LocalFile | null {
    let cur: LocalFile | LocalFileTree | undefined = this
    for (let index = 0; index < pathParts.length && cur instanceof LocalFileTree; index++) {
      const currentPart = pathParts[index]
      cur = cur.name2File.get(currentPart)
    }

    if (cur instanceof LocalFile) {
      return cur
    } else {
      return null
    }
  }

  /**
   * 
   */
  countSubtreeChildren(): number {
    let total = 0
    for (const file of this.name2File.values()) {
      if (file instanceof LocalFileTree) {
        total += file.countSubtreeChildren()
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

  getFile(name: string): LocalFile | LocalFileTree | undefined {
    return this.name2File.get(name)
  }

  createSubtree(name: string, rootPath: string): LocalFileTree {
    return new LocalFileTree(name, rootPath, this)
  }

  toJSON(): FileTree {
    const obj: FileTree = {}
    if (this.hidden) {
      obj["*hide"] = this.hidden
    }
    for (const [name, file] of this.name2File.entries()) {
      if (file instanceof LocalFileTree) {
        obj[name] = file.toJSON()
      } else if (file instanceof LocalFile) {
        obj[name] = file.toJSON()
      }
    }
    return obj
  }

  * visitFile(
    fileFilter?: (file: File) => boolean,
    dirFilter?: (dir: FileTree) => boolean,
  ): Iterable<LocalFile> {
    for (const file of this.name2File.values()) {
      if (file instanceof LocalFileTree) {
        if (!dirFilter || dirFilter(file)) {
          yield* file.visitFile(fileFilter, dirFilter)
        }
      } else {
        if (!fileFilter || fileFilter(file)) {
          yield file
        }
      }
    }
  }

  * visitDir(
    fileFilter?: (file: File) => boolean,
    dirFilter?: (dir: FileTree) => boolean,
  ): Iterable<LocalFileTree> {
    for (const file of this.name2File.values()) {
      if (file instanceof LocalFileTree) {
        if (!dirFilter || dirFilter(file)) {
          yield file
        }
        yield* file.visitDir(fileFilter, dirFilter)
      }
    }
  }
}
/**
 * Filter the file tree. 
 * Don't mutate the file tree during filtering.
 * @returns a new tree that contains filtered but still the same instances.
 */
export function filterFileTreeJson(
  tree: FileTree,
  fileFilter: (file: File) => boolean,
  dirFilter?: (dir: FileTree) => boolean,
): FileTree {
  const filteredTree: FileTree = {}
  if (tree["*hide"]) {
    filteredTree["*hide"] = true
  }
  for (const [name, fileOrSubtree] of Object.entries(tree)) {
    // it's a file
    if (fileOrSubtree["*type"]) {
      if (fileFilter(fileOrSubtree satisfies File)) {
        filteredTree[name] = fileOrSubtree
      }
    } else {
      // it's a folder
      if (dirFilter === undefined || dirFilter(fileOrSubtree satisfies FileTree)) {
        const filteredSubtree = filterFileTreeJson(fileOrSubtree satisfies FileTree, fileFilter, dirFilter)
        if (Object.keys(filteredSubtree).length > 0) {
          filteredTree[name] = filteredSubtree
        }
      }
    }
  }
  return filteredTree
}

/**
 * Clone a file tree.
 * All instances are newly-created.
 */
export function cloneFileTreeJson(tree: FileTree): FileTree {
  const newTree: FileTree = {}
  if (tree["*hide"]) {
    newTree["*hide"] = true
  }
  for (const [name, fileOrSubtree] of Object.entries(tree)) {
    // it's a file
    if (fileOrSubtree["*type"]) {
      newTree[name] = { ...fileOrSubtree }
    } else {
      // it's a folder
      const filteredSubtree = cloneFileTreeJson(fileOrSubtree satisfies FileTree)
      if (Object.keys(filteredSubtree).length > 0) {
        newTree[name] = filteredSubtree
      }
    }
  }
  return newTree
}
