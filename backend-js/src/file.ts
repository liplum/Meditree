import fs from "fs/promises"
import path from "path"

export type FileType = string
export interface FileEntryJson {
  "*tag"?: Record<string, number | string | boolean>
  "*hide"?: boolean
}

export interface FileJson extends FileEntryJson {
  "*type": FileType
  size: number
}

export interface FileTreeJson extends FileEntryJson {
  [name: string]: FileJson | FileTreeJson | any
}

export class LocalFile {
  readonly parent: LocalFileTree
  readonly name: string
  readonly type: FileType
  readonly size: number
  readonly localPath: string
  readonly etag: string
  virtualPath: string | undefined
  tag?: Record<string, any>
  hidden?: boolean
  constructor({
    parent, type, size, name, localPath, etag
  }: {
    parent: LocalFileTree, type: FileType, size: number, name: string, localPath: string, etag: string
  }) {
    this.name = name
    this.parent = parent
    this.type = type
    this.size = size
    this.localPath = localPath
    this.etag = etag
  }

  toJSON(): FileJson {
    const obj: FileJson = {
      "*type": this.type,
      size: this.size,
    }
    if (this.hidden) {
      obj["*hide"] = this.hidden
    }
    if (this.tag) {
      obj["*tag"] = this.tag
    }
    return obj
  }
}

export type PathFilter = (path: string) => boolean
export interface FileTreeLike {
  readonly name: string
  resolveFileEntry(pathParts: string[]): LocalFile | FileTreeLike | undefined
  toJSON(): FileTreeJson
  children(): (LocalFile | FileTreeLike)[]
}
export function* iterateAllFilesInTree(
  root: FileTreeLike
): Iterable<LocalFile> {
  function* iterateSubFiles(tree: FileTreeLike): Iterable<LocalFile> {
    for (const fileOrSubtree of tree.children()) {
      if (fileOrSubtree instanceof LocalFile) {
        yield fileOrSubtree
      } else {
        // it's a folder
        yield* iterateSubFiles(fileOrSubtree)
      }
    }
  }
  yield* iterateSubFiles(root)
}
export class LocalFileTree implements FileTreeLike {
  readonly parent?: LocalFileTree
  hidden?: boolean
  private readonly name2File = new Map<string, LocalFile | LocalFileTree>()
  readonly path: string
  readonly name: string
  tag?: Record<string, any>
  constructor(name: string, path: string, parent?: LocalFileTree) {
    this.path = path
    this.name = name
    this.parent = parent
  }

  children(): (LocalFile | FileTreeLike)[] {
    return Array.from(this.name2File.values())
  }

  resolveFileEntry(pathParts: string[]): LocalFile | LocalFileTree | undefined {
    let cur: LocalFile | LocalFileTree | undefined = this
    let index: number
    for (index = 0; index < pathParts.length && cur instanceof LocalFileTree; index++) {
      const currentPart = pathParts[index]
      cur = cur.name2File.get(currentPart)
    }
    // ensure that the pathParts is exhausted.
    return index === pathParts.length ? cur : undefined
  }

  private _subtreeFileCountCache?: number

  /**
   * Count the [LocalFile] from subtree recursively.
   * The result is cached, so only the first call is expensive.
   */
  countSubtreeFile(): number {
    if (this._subtreeFileCountCache !== undefined) {
      return this._subtreeFileCountCache
    }
    let total = 0
    for (const file of this.name2File.values()) {
      if (file instanceof LocalFileTree) {
        total += file.countSubtreeFile()
      } else {
        total++
      }
    }
    return total
  }

  addFile(file: LocalFile | LocalFileTree, name?: string,): void {
    this.name2File.set(name ?? file.name, file)
    this._subtreeFileCountCache = undefined
  }

  removeFile(name: string): void {
    this.name2File.delete(name)
    this._subtreeFileCountCache = undefined
  }

  getFile(name: string): LocalFile | LocalFileTree | undefined {
    return this.name2File.get(name)
  }

  createSubtree(name: string, rootPath: string): LocalFileTree {
    return new LocalFileTree(name, rootPath, this)
  }

  toJSON(): FileTreeJson {
    const obj: FileTreeJson = {}
    if (this.hidden) {
      obj["*hide"] = true
    }
    if (this.tag) {
      obj["*tag"] = { ...this.tag }
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

  * visitFile({ fileFilter, dirFilter }: {
    fileFilter?: (file: LocalFile) => boolean
    dirFilter?: (dir: LocalFileTree) => boolean
  }): Iterable<LocalFile> {
    for (const file of this.name2File.values()) {
      if (file instanceof LocalFileTree) {
        if (!dirFilter || dirFilter(file)) {
          yield* file.visitFile({ fileFilter, dirFilter })
        }
      } else {
        if (!fileFilter || fileFilter(file)) {
          yield file
        }
      }
    }
  }

  * visitDir({ fileFilter, dirFilter }: {
    fileFilter?: (file: FileJson) => boolean
    dirFilter?: (dir: FileTreeJson) => boolean
  }): Iterable<LocalFileTree> {
    for (const file of this.name2File.values()) {
      if (file instanceof LocalFileTree) {
        if (!dirFilter || dirFilter(file)) {
          yield file
        }
        yield* file.visitDir({ fileFilter, dirFilter })
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
  tree: FileTreeJson,
  fileFilter: (file: FileJson) => boolean,
  dirFilter?: (dir: FileTreeJson) => boolean,
): FileTreeJson {
  const filteredTree: FileTreeJson = {}
  if (tree["*hide"]) {
    filteredTree["*hide"] = true
  }
  for (const [name, fileOrSubtree] of iterateFilesInDir(tree)) {
    // it's a file
    if (fileOrSubtree["*type"]) {
      if (fileFilter(fileOrSubtree as FileJson)) {
        filteredTree[name] = fileOrSubtree
      }
    } else {
      // it's a folder
      if (dirFilter === undefined || dirFilter(fileOrSubtree satisfies FileTreeJson)) {
        const filteredSubtree = filterFileTreeJson(fileOrSubtree satisfies FileTreeJson, fileFilter, dirFilter)
        if (Object.keys(filteredSubtree).length > 0) {
          filteredTree[name] = filteredSubtree
        }
      }
    }
  }
  return filteredTree
}

export function* iterateFilesInDir(
  tree: FileTreeJson
): Iterable<[string, FileJson | FileTreeJson]> {
  for (const entry of Object.entries(tree)) {
    if (entry[0] === "*hide" || entry[0] === "*tag") {
      continue
    }
    yield entry
  }
}

export interface PathedFile extends FileJson {
  fullPath: string
}

export function* iterateAllFilesInTreeJson(
  root: FileTreeJson
): Iterable<PathedFile> {
  function* iterateSubFiles(parentPath: string, tree: FileTreeJson): Iterable<PathedFile> {
    for (const [name, fileOrSubtree] of iterateFilesInDir(tree)) {
      const path = parentPath ? `${parentPath}/${name}` : name
      // it's a file
      if (fileOrSubtree["*type"]) {
        yield { ...fileOrSubtree as FileJson, fullPath: path }
      } else {
        // it's a folder
        yield* iterateSubFiles(path, fileOrSubtree satisfies FileTreeJson)
      }
    }
  }
  yield* iterateSubFiles("", root)
}

/**
 * Clone a file tree.
 * All instances are newly-created.w
 */
export function cloneFileTreeJson(tree: FileTreeJson): FileTreeJson {
  const newTree: FileTreeJson = {}
  if (tree["*hide"]) {
    newTree["*hide"] = true
  }
  if (tree["*tag"]) {
    newTree["*tag"] = { ...tree["*tag"] }
  }
  for (const [name, fileOrSubtree] of iterateFilesInDir(tree)) {
    // it's a file
    if (fileOrSubtree["*type"]) {
      newTree[name] = { ...fileOrSubtree }
    } else {
      // it's a folder
      const subtree = cloneFileTreeJson(fileOrSubtree satisfies FileTreeJson)
      newTree[name] = subtree
    }
  }
  return newTree
}

export function attachVirtualPath(root: FileTreeLike): void {
  function iterateSubtree(parentPath: string, tree: FileTreeLike): void {
    for (const file of tree.children()) {
      if (file instanceof LocalFile) {
        file.virtualPath = parentPath ? `${parentPath}/${file.name}` : file.name
      } else {
        iterateSubtree(parentPath ? `${parentPath}/${file.name}` : file.name, file)
      }
    }
  }
  iterateSubtree("", root)
}

export class File {
  readonly path: string
  _lastReadableError?: Error;
  _lastWritableError?: Error;
  constructor(path: string) {
    this.path = path
  }

  async checkReadable(): Promise<boolean> {
    try {
      await fs.access(this.path, fs.constants.R_OK)
      return true
    } catch (error) {
      this._lastReadableError = error as Error
      return false
    }
  }

  async checkWritable(): Promise<boolean> {
    try {
      await fs.access(this.path, fs.constants.W_OK)
      return true
    } catch (error) {
      this._lastWritableError = error as Error
      return false
    }
  }

  async ensureParent(): Promise<void> {
    const dir = path.dirname(this.path)
    await fs.mkdir(dir, { recursive: true })
  }
}

export const splitPath = (fullPath: String): string[] => {
  const pathParts = fullPath.split("/")
  while (pathParts.length && pathParts[pathParts.length - 1].length === 0) {
    pathParts.pop()
  }
  while (pathParts.length && pathParts[0].length === 0) {
    pathParts.shift()
  }
  return pathParts
}

/**
* Resolve a file by the {@link pathParts} given.
* @param pathParts The parts of the file path.
* @returns The resolved file, or `null` if not found.
*/
export const resolveFile = (tree: FileTreeLike, path: string | string[]): LocalFile | undefined => {
  if (typeof path === "string") {
    path = splitPath(path)
  }
  const entry = tree.resolveFileEntry(path)
  return entry instanceof LocalFile ? entry : undefined
}

/**
* Resolve a file tree by the {@link pathParts} given.
* @param pathParts The parts of the file tree path.
* @returns The resolved file tree, or `null` if not found.
*/
export const resolveFileTree = (tree: FileTreeLike, path: string | string[]): LocalFileTree | undefined => {
  if (typeof path === "string") {
    path = splitPath(path)
  }
  const entry = tree.resolveFileEntry(path)
  return entry instanceof LocalFileTree ? entry : undefined
}