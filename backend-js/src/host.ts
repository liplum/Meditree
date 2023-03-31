import type fs from "fs"
import chokidar from "chokidar"
import minimatch, { type MinimatchOptions } from "minimatch"
import { clearInterval } from "timers"
import type { FileTreeLike, LocalFile, FileType, FileTreeJson } from "./file.js"
import { FileTree } from "./file.js"
import EventEmitter from "events"
export interface HostTreeOptions {
  /**
  * The absolute path of root directory.
  */
  rootPath: string
  name: string
  fileTypePattern: Record<string, string>
  rebuildInterval: number
  ignorePattern: string[]
}

const minimatchOptions: MinimatchOptions = {
  nocase: true,
}

export declare interface HostTree {
  on(event: "rebuild", listener: (fileTree: FileTree) => void): this

  off(event: "rebuild", listener: (fileTree: FileTree) => void): this

  emit(event: "rebuild", fileTree: FileTree): boolean
}

export class HostTree extends EventEmitter implements FileTreeLike {
  protected options: HostTreeOptions
  fileTree: FileTree
  protected fileWatcher: fs.FSWatcher | null = null
  constructor(options: HostTreeOptions) {
    super()
    this.options = options
  }

  toJSON(): FileTreeJson {
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
    console.time("Build File Tree")
    const tree = await FileTree.createFrom({
      rootPath: this.options.rootPath,
      initPath: [this.options.name],
      classifier: this.classifyByFilePath,
      includes: this.isFileOrDirectoryIncluded,
      pruned: true,
    })
    console.timeEnd("Build File Tree")
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

  resolveFile(pathParts: string[]): LocalFile | null {
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
