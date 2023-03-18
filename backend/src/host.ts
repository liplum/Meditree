import type fs from "fs"
import chokidar from "chokidar"
import minimatch, { type MinimatchOptions } from "minimatch"
import { clearInterval } from "timers"
import { shallowEqual } from "shared"
import { FileTree, type File, type FileType } from "shared"
interface HostTreeOptions {
  /**
  * The absolute path of root directory.
  */
  root: string
  fileTypePatterns: object | null
  rebuildInterval: number
}
const minimatchOptions: MinimatchOptions = {
  nocase: true,
}
export class HostTree {
  protected options: HostTreeOptions
  fileTree: FileTree
  protected fileWatcher: fs.FSWatcher | null = null
  onRebuilt: (() => void) | null = null
  constructor(
    options: HostTreeOptions
  ) {
    this.options = options
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

  async rebuildFileTree(): Promise<void> {
    this.shouldRebuild = false
    const tree = await FileTree.createFrom({
      root: this.options.root,
      classifier: (path) => this.classifyByFilePath(path),
      allowNullFileType: false,
      pruned: true,
    })
    this.fileTree = tree
    this.onRebuilt?.()
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

  resolveFile(path: string): File | null {
    return this.fileTree?.resolveFile(path)
  }

  classifyByFilePath(filePath: string): FileType {
    const patterns = this.options.fileTypePatterns
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
