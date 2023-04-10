export type FileType = string
export interface File {
  "*type": FileType
  size: number
  "*hide"?: boolean
  path: string
}
export interface FileTree {
  ["*hide"]?: boolean
  [name: string]: File | FileTree | any
}

export class LocalFile implements File {
  readonly parent: LocalFileTree
  readonly "*type": FileType
  readonly size: number
  readonly path: string
  readonly localPath: string
  "*hide"?: boolean
  constructor(parent: LocalFileTree, type: FileType, size: number, localPath: string, path: string) {
    this.parent = parent
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

export class VirtualFile implements File {
  readonly "*type": string
  readonly buffer: Buffer
  "*hide"?: boolean | undefined
  readonly path: string
  constructor(type: FileType, buffer: Buffer, path: string) {
    this["*type"] = type
    this.path = path
    this.buffer = buffer
  }

  get size(): number {
    return this.buffer.byteLength
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
  readonly parent?: LocalFileTree
  hidden?: boolean
  readonly name2File = new Map<string, LocalFile | LocalFileTree>()
  readonly rootPath: string
  readonly name: string
  constructor(name: string, rootPath: string, parent?: LocalFileTree) {
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
/**
 * Filter the file tree. 
 * Don't mutate the file tree during filtering.
 * @returns a new tree that contains filtered but still the same instances.
 */
export function filterFileTreeJson(tree: FileTree, filter: (file: File | FileTree) => boolean): FileTree {
  const filteredTree: FileTree = {}
  if (tree["*hide"]) {
    filteredTree["*hide"] = true
  }
  for (const [name, fileOrSubtree] of Object.entries(tree)) {
    // it's a file
    if (fileOrSubtree["*type"]) {
      if (filter(fileOrSubtree as File)) {
        filteredTree[name] = fileOrSubtree
      }
    } else {
      // it's a folder
      if (filter(fileOrSubtree as FileTree)) {
        const filteredSubtree = filterFileTreeJson(fileOrSubtree as FileTree, filter)
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
      const filteredSubtree = cloneFileTreeJson(fileOrSubtree as FileTree)
      if (Object.keys(filteredSubtree).length > 0) {
        newTree[name] = filteredSubtree
      }
    }
  }
  return newTree
}
