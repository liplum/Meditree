import fs from "fs"
import path from "path"
import { minimatch, type MinimatchOptions } from "minimatch"
import { type FileTreeLike, LocalFile, type FileType, type FileTreeJson } from "./file.js"
import { LocalFileTree } from "./file.js"
import EventEmitter from "events"
import { promisify } from "util"
import { type Logger } from "@liplum/log"
import etag from "etag"

export interface HostTreeOptions {
  /**
  * The absolute path of root directory.
  */
  root: string
  name: string
  classifier: (path: string) => Promise<FileType | null>
  ignorePatterns: string[]
  fileFilter: FileFilter
  log?: Logger
}

export declare interface IHostTree extends FileTreeLike {
  readonly name: string
  on(event: "rebuild", listener: (fileTree: LocalFileTree) => void): this
  off(event: "rebuild", listener: (fileTree: LocalFileTree) => void): this
  emit(event: "rebuild", fileTree: LocalFileTree): boolean
  start(): void
  stop(): void
  rebuildFileTree(): Promise<void>
}

export class HostTree extends EventEmitter implements FileTreeLike, IHostTree {
  private readonly root: string
  readonly name: string
  private readonly log?: Logger
  private fileTree: LocalFileTree | undefined
  private readonly classifier: FileClassifier
  private readonly filter: PathFilter
  private readonly fileFilter: FileFilter
  constructor({ root, log, name, classifier, ignorePatterns, fileFilter }: HostTreeOptions) {
    super()
    this.root = root
    this.log = log
    this.name = name
    this.classifier = classifier
    this.filter = makeFSOFilter(ignorePatterns)
    this.fileFilter = fileFilter
  }

  children(): (FileTreeLike | LocalFile)[] {
    return this.fileTree?.children() ?? []
  }

  toJSON(): FileTreeJson {
    return this.fileTree?.toJSON() ?? {}
  }

  start(): void {
  }

  stop(): void {
  }

  async rebuildFileTree(): Promise<void> {
    const tree = await createFileTreeFrom({
      name: this.name,
      root: this.root,
      classifier: this.classifier,
      includes: this.filter,
      fileFilter: this.fileFilter,
      ignoreEmptyDir: true,
    })
    this.fileTree = tree
    this.emit("rebuild", tree)
  }

  resolveFileEntry(pathParts: string[]): LocalFile | LocalFileTree | undefined {
    return this.fileTree?.resolveFileEntry(pathParts)
  }
}

const minimatchOptions: MinimatchOptions = {
  nocase: true,
}

export type PathFilter = (path: string) => boolean
export type FileFilter = (file: LocalFile) => boolean
export function makeFSOFilter(ignorePatterns: string[]): PathFilter {
  return (path) => {
    for (const pattern of ignorePatterns) {
      if (minimatch(path, pattern, minimatchOptions)) {
        return false
      }
    }
    return true
  }
}
export type FileClassifier = (path: string) => Promise<FileType | null>

export const classifyContentTypeByPattern = (path: string, fileTypePattern: Record<string, string>) => {
  const patterns = fileTypePattern
  for (const [pattern, type] of Object.entries(patterns)) {
    if (minimatch(path, pattern, minimatchOptions)) {
      return type
    }
  }
  // if not matching any one
  return null
}

export const statAsync = promisify(fs.stat)
export const readdirAsync = promisify(fs.readdir)

export async function createFileTreeFrom({
  name: rootName, root, ignoreEmptyDir, classifier, includes, log, fileFilter
}: {
  name?: string
  root: string
  classifier: FileClassifier
  includes: (path: string) => boolean
  fileFilter: (file: LocalFile) => boolean
  /**
   * whether to ignore the empty file tree.
   */
  ignoreEmptyDir: boolean
  log?: Logger
}): Promise<LocalFileTree> {
  const stats = await statAsync(root)
  if (!stats.isDirectory()) {
    throw Error(`${root} isn't a directory`)
  }
  const tree = new LocalFileTree(rootName ?? path.basename(root), root)
  async function walk(
    tree: LocalFileTree,
    curDir: string,
  ): Promise<void> {
    let files: string[]
    try {
      files = await readdirAsync(curDir)
    } catch (e) {
      log?.error(e)
      return
    }
    for (const fileName of files) {
      const filePath = path.join(curDir, fileName)
      if (!includes(filePath)) continue
      try {
        const stat = await statAsync(filePath)
        if (stat.isFile()) {
          const fileType = await classifier(filePath)
          if (fileType != null) {
            const localFile = new LocalFile({
              parent: tree,
              type: fileType,
              size: stat.size,
              name: fileName,
              localPath: filePath,
              etag: etag(stat, { weak: false, })
            })
            if (fileFilter(localFile)) {
              tree.addFile(localFile)
            }
          }
        } else if (stat.isDirectory()) {
          const subtree = tree.createSubtree(fileName, filePath)
          await walk(subtree, filePath)
          if (!ignoreEmptyDir || subtree.countSubtreeFile() > 0) {
            tree.addFile(subtree)
          }
        } else {
          log?.error(`Unknown file type of ${filePath}`)
        }
      } catch (e) {
        continue
      }
    }
  }
  await walk(tree, root)
  return tree
}

export class EmptyHostTree implements FileTreeLike, IHostTree {
  readonly name: string
  constructor(name: string) {
    this.name = name
  }

  resolveFileEntry(pathParts: string[]): undefined {
    return undefined
  }

  toJSON(): FileTreeJson {
    return {}
  }

  children(): (FileTreeLike | LocalFile)[] {
    return []
  }

  on(event: "rebuild", listener: (fileTree: LocalFileTree) => void): this {
    return this
  }

  off(event: "rebuild", listener: (fileTree: LocalFileTree) => void): this {
    return this
  }

  emit(event: "rebuild", fileTree: LocalFileTree): boolean {
    return true
  }

  start(): void {
  }

  stop(): void {
  }

  async rebuildFileTree(): Promise<void> {
  }
}

interface HostTreeEntry {
  hostTree: IHostTree
  rebuildListener: (fileTree: LocalFileTree) => void
}

export class CompoundHostTree extends EventEmitter implements FileTreeLike, IHostTree {
  readonly name: string
  private readonly name2Subtree = new Map<string, HostTreeEntry>()
  private readonly builtFileTree: LocalFileTree
  constructor(name: string) {
    super()
    this.name = name
    // use invalid characters for the path.
    this.builtFileTree = new LocalFileTree(this.name, "?")
  }

  resolveFileEntry(pathParts: string[]): LocalFile | FileTreeLike | undefined {
    return this.builtFileTree.resolveFileEntry(pathParts)
  }

  toJSON(): FileTreeJson {
    return this.builtFileTree.toJSON()
  }

  children(): (FileTreeLike | LocalFile)[] {
    return Array.from(this.name2Subtree.values()).map(subtree => subtree.hostTree)
  }

  addSubtree(subtree: IHostTree): void {
    if (this === subtree) throw new Error("Cannot add self.")
    const listener = (fileTree: LocalFileTree): void => {
      this.onSubtreeRebuild(subtree, fileTree)
    }
    this.name2Subtree.set(subtree.name, {
      hostTree: subtree, rebuildListener: listener
    })
    subtree.on("rebuild", listener)
  }

  removeSubtree(subtree: IHostTree): boolean {
    const entry = this.name2Subtree.get(subtree.name)
    if (!entry) return false
    const { hostTree, rebuildListener } = entry
    hostTree.off("rebuild", rebuildListener)
    this.name2Subtree.delete(hostTree.name)
    return true
  }

  onSubtreeRebuild(subtree: IHostTree, itsLocalTree: LocalFileTree): void {
    this.builtFileTree.addFile(itsLocalTree, subtree.name)
    this.emit("rebuild", this.builtFileTree)
  }

  start(): void {
    for (const { hostTree } of this.name2Subtree.values()) {
      hostTree.start()
    }
  }

  stop(): void {
    for (const { hostTree } of this.name2Subtree.values()) {
      hostTree.stop()
    }
  }

  async rebuildFileTree(): Promise<void> {
    for (const { hostTree } of this.name2Subtree.values()) {
      await hostTree.rebuildFileTree()
    }
  }
}
