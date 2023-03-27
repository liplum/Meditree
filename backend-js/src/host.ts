import type fs from "fs"
import chokidar from "chokidar"
import minimatch, { type MinimatchOptions } from "minimatch"
import { clearInterval } from "timers"
import type { FileTreeLike, File, FileType, FileTreeJson } from "./file.js"
import { FileTree } from "./file.js"
export interface HostTreeOptions {
  /**
  * The absolute path of root directory.
  */
  root: string
  fileTypePattern: object | null
  rebuildInterval: number
}

const minimatchOptions: MinimatchOptions = {
  nocase: true,
}
export class HostTree implements FileTreeLike {
  protected options: HostTreeOptions
  fileTree: FileTree
  protected fileWatcher: fs.FSWatcher | null = null
  private readonly rebuildListeners: (() => void)[] = []
  constructor(
    options: HostTreeOptions
  ) {
    this.options = options
  }

  toJSON(): FileTreeJson {
    return this.fileTree.toJSON()
  }

  updateOptions(options: HostTreeOptions): void {
    const oldOptions = this.options
    if (shallowEqual(oldOptions, options)) return
    this.options = options
    if (oldOptions.root !== options.root) {
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
    this.fileWatcher = chokidar.watch(this.options.root, {
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

  onRebuild(listener: () => void): void {
    this.rebuildListeners.push(listener)
  }

  async rebuildFileTree(): Promise<void> {
    this.shouldRebuild = false
    const tree = await FileTree.createFrom({
      root: this.options.root,
      classifier: (path) => this.classifyByFilePath(path),
      pruned: true,
    })
    this.fileTree = tree
    for (const listener of this.rebuildListeners) {
      listener()
    }
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

  resolveFile(pathParts: string[]): File | null {
    return this.fileTree?.resolveFile(pathParts)
  }

  classifyByFilePath(filePath: string): FileType {
    const patterns = this.options.fileTypePattern
    if (patterns == null) return null
    for (const [pattern, type] of Object.entries(patterns)) {
      if (minimatch(filePath, pattern, minimatchOptions)) {
        return type
      }
    }
    // if not matching any one
    return null
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
