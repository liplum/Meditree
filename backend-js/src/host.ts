import fs from "fs"
import path from "path"
import chokidar from "chokidar"
import minimatch, { type MinimatchOptions } from "minimatch"
import { clearInterval } from "timers"
import { type FileTreeLike, LocalFile, type FileType, type FileTree, type ResolvedFile } from "./file.js"
import { LocalFileTree } from "./file.js"
import EventEmitter from "events"
import { promisify } from "util"
import { type MeditreePlugin } from "./plugin.js"

export interface HostTreeOptions {
  /**
  * The absolute path of root directory.
  */
  rootPath: string
  name: string
  fileTypePattern: Record<string, string>
  rebuildInterval: number
  ignorePattern: string[]
  plugins?: MeditreePlugin[]
}

const minimatchOptions: MinimatchOptions = {
  nocase: true,
}

export declare interface HostTree {
  on(event: "rebuild", listener: (fileTree: LocalFileTree) => void): this

  off(event: "rebuild", listener: (fileTree: LocalFileTree) => void): this

  emit(event: "rebuild", fileTree: LocalFileTree): boolean
}

export class HostTree extends EventEmitter implements FileTreeLike {
  private options: HostTreeOptions
  private fileTree: LocalFileTree
  private fileWatcher: fs.FSWatcher | null = null
  constructor(options: HostTreeOptions) {
    super()
    this.options = options
  }

  toJSON(): FileTree {
    return this.fileTree.toJSON()
  }

  isFileOrDirectoryIncluded = (path: string): boolean => {
    for (const ignore of this.options.ignorePattern) {
      if (minimatch(path, ignore, minimatchOptions)) {
        return false
      }
    }
    return true
  }

  classifyByFilePath = (filePath: string): FileType | null => {
    const patterns = this.options.fileTypePattern
    for (const [pattern, type] of Object.entries(patterns)) {
      if (minimatch(filePath, pattern, minimatchOptions)) {
        return type
      }
    }
    // if not matching any one
    return null
  }

  updateOptions(options: HostTreeOptions): void {
    const oldOptions = this.options
    if (shallowEqual(oldOptions, options)) return
    this.options = options
    if (oldOptions.rootPath !== options.rootPath) {
      this.stopWatching()
      this.startWatching()
    }
    this.rebuildFileTree()
  }

  get isWatching(): boolean {
    return this.fileWatcher != null
  }

  protected rebuildTimer: NodeJS.Timer | null = null

  protected shouldRebuild = false

  startWatching(): void {
    if (this.fileWatcher != null && this.rebuildTimer != null) return
    this.rebuildTimer = setInterval(() => {
      if (this.shouldRebuild) {
        this.rebuildFileTree()
      }
    }, this.options.rebuildInterval)
    this.fileWatcher = chokidar.watch(this.options.rootPath, {
      ignoreInitial: true,
    }).on("all", (event, filePath) => {
      this.onWatch(event, filePath)
    })
  }

  onWatch(event: string, filePath: string): void {
    console.log(`[${event}]${filePath}`)
    // const relative = path.relative(this.root, filePath)
    if (event === "add" || event === "unlink") {
      if (this.classifyByFilePath(filePath) == null) return
      this.shouldRebuild = true
    }
  }

  async rebuildFileTree(): Promise<void> {
    this.shouldRebuild = false
    const tree = await createFileTreeFrom({
      rootPath: this.options.rootPath,
      initPath: [this.options.name],
      classifier: this.classifyByFilePath,
      includes: this.isFileOrDirectoryIncluded,
      pruned: true,
      plugins: this.options.plugins,
    })
    this.fileTree = tree
    this.emit("rebuild", tree)
  }

  stopWatching(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close()
    }
    if (this.rebuildTimer) {
      clearInterval(this.rebuildTimer)
    }
    this.fileWatcher = null
    this.rebuildTimer = null
  }

  resolveFile(pathParts: string[]): ResolvedFile | null {
    return this.fileTree?.resolveFile(pathParts)
  }
}

function shallowEqual(obj1: any, obj2: any): boolean {
  // Check if both objects have the same number of properties
  if (Object.keys(obj1).length !== Object.keys(obj2).length) {
    return false
  }

  // Iterate over the properties of obj1 and compare them to the properties in obj2
  for (const prop in obj1) {
    if (obj1[prop] !== obj2[prop]) {
      return false
    }
  }

  return true
}
export const statAsync = promisify(fs.stat)
export const readdirAsync = promisify(fs.readdir)
export type FileClassifier = (path: string) => FileType | null

export interface FileTreePlugin {
  onPostGenerated?(tree: FileTree): void
}

export async function createFileTreeFrom({ rootPath: root, initPath, buildPath, pruned, classifier, includes, plugins }: {
  rootPath: string
  initPath?: string[]
  buildPath?: (pathParts: string[]) => string
  classifier: FileClassifier
  includes: (path: string) => boolean
  /**
   * whether to ignore the empty file tree
   */
  pruned: boolean
  plugins?: FileTreePlugin[]
}): Promise<LocalFileTree> {
  const stats = await statAsync(root)
  if (!stats.isDirectory()) {
    throw Error(`${root} isn't a directory`)
  }
  const tree = new LocalFileTree(root)
  async function walk(
    tree: LocalFileTree,
    currentDirectory: string,
    pathInTreeParts: string[],
  ): Promise<void> {
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
              tree, fileName, fileType, stat.size, filePath,
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
  if (plugins?.length) {
    for (const plugin of plugins) {
      plugin.onPostGenerated?.(tree)
    }
  }
  return tree
}
