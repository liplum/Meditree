import fs from "fs"
import path from "path"
import minimatch, { type MinimatchOptions } from "minimatch"
import { type FileTreeLike, LocalFile, type FileType, type FileTree } from "./file.js"
import { LocalFileTree } from "./file.js"
import EventEmitter from "events"
import { promisify } from "util"
import { type Logger } from "./logger.js"

export interface HostTreeOptions {
  /**
  * The absolute path of root directory.
  */
  root: string
  name: string
  pattern2FileType: Record<string, string>
  ignorePatterns: string[]
  log?: Logger
}

export declare interface IHostTree {
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
  private fileTree: LocalFileTree
  private readonly filePathClassifier: FileClassifier
  private readonly fileFilter: FSOFilter
  constructor(options: HostTreeOptions) {
    super()
    this.root = options.root
    this.log = options.log
    this.name = options.name
    this.filePathClassifier = makeFilePathClassifier(options.pattern2FileType)
    this.fileFilter = makeFSOFilter(options.ignorePatterns)
  }

  toJSON(): FileTree {
    return this.fileTree.toJSON()
  }

  start(): void {
  }

  stop(): void {
  }

  async rebuildFileTree(): Promise<void> {
    const tree = await createFileTreeFrom({
      name: this.name,
      root: this.root,
      classifier: this.filePathClassifier,
      includes: this.fileFilter,
      ignoreEmptyDir: true,
    })
    this.fileTree = tree
    this.emit("rebuild", tree)
  }

  resolveFile(pathParts: string[]): LocalFile | null {
    return this.fileTree?.resolveFile(pathParts)
  }
}

const minimatchOptions: MinimatchOptions = {
  nocase: true,
}

export type FSOFilter = (path: string) => boolean
export function makeFSOFilter(ignorePatterns: string[]): FSOFilter {
  return (path) => {
    for (const pattern of ignorePatterns) {
      if (minimatch(path, pattern, minimatchOptions)) {
        return false
      }
    }
    return true
  }
}
export type FileClassifier = (path: string) => FileType | null

export function makeFilePathClassifier(fileTypePattern: Record<string, string>): FileClassifier {
  return (path) => {
    const patterns = fileTypePattern
    for (const [pattern, type] of Object.entries(patterns)) {
      if (minimatch(path, pattern, minimatchOptions)) {
        return type
      }
    }
    // if not matching any one
    return null
  }
}
export const statAsync = promisify(fs.stat)
export const readdirAsync = promisify(fs.readdir)

export async function createFileTreeFrom({ name: rootName, root, ignoreEmptyDir, classifier, includes, log }: {
  name?: string
  root: string
  classifier: FileClassifier
  includes: (path: string) => boolean
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
          const fileType = classifier(filePath)
          if (fileType != null) {
            const localFile = new LocalFile(
              tree, fileType, stat.size, filePath,
            )
            tree.addFile(fileName, localFile)
          }
        } else if (stat.isDirectory()) {
          const subtree = tree.createSubtree(fileName, filePath)
          await walk(subtree, filePath)
          if (!ignoreEmptyDir || subtree.countSubtreeFile() > 0) {
            tree.addFile(fileName, subtree)
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

  resolveFile(pathParts: string[]): LocalFile | null {
    return null
  }

  toJSON(): FileTree {
    return {}
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

export class ComposebleHostTree extends EventEmitter implements FileTreeLike, IHostTree {
  readonly name: string
  private readonly name2Subtree = new Map<string, HostTreeEntry>()
  private readonly builtFileTree: LocalFileTree
  constructor(name: string) {
    super()
    this.name = name
    this.builtFileTree = new LocalFileTree(this.name)
  }

  resolveFile(pathParts: string[]): LocalFile | null {
    return this.builtFileTree.resolveFile(pathParts)
  }

  toJSON(): FileTree {
    return this.builtFileTree.toJSON()
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
    this.builtFileTree.addFile(subtree.name, itsLocalTree)
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
