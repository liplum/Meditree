import * as fs from 'fs'
import * as path from 'path'
import { FileTree, File, FileType } from './file.js'
import * as chokidar from 'chokidar'
import minimatch from 'minimatch'
interface HostTreeOptions {
  root: string
  allowedFileExtensions: string[] | null
  fileTypePattern: object | null
}
export class HostTree {
  /**
   * The absolute path of root directory.
   */
  readonly root: string
  readonly allowedFileExtensions: string[] | null
  readonly fileTypePattern: object | null
  onRebuilt: (() => void) | null = null
  fileTree: FileTree
  constructor(
    options: HostTreeOptions
  ) {
    this.root = path.resolve(options.root)
    this.allowedFileExtensions = options.allowedFileExtensions
    this.fileTypePattern = options.fileTypePattern
  }
  get isWatching() { return this.watchTimer != null }
  watchTimer: fs.FSWatcher | null = null

  startWatching() {
    if (this.watchTimer != null) return
    this.watchTimer = chokidar.watch(this.root, {
      ignoreInitial: true,
    }).on('all', (event, filePath) => this.onWatch(event, filePath))
  }

  onWatch(event: string, filePath: string) {
    console.log(`[${event}]${filePath}`)
    //const relative = path.relative(this.root, filePath)
    if (event == "addDir") return
    if (event == "add" || event == "unlink") {
      if (!this.filterByExtension(filePath)) return
      this.rebuildFileTree()
    } else if (event == 'unlinkDir') {
      this.rebuildFileTree()
    }
  }

  async rebuildFileTree() {
    const tree = await FileTree.createFileTreeAsync(
      this.root,
      (path) => this.filterByExtension(path),
      (path) => this.classifyByFilePath(path),
      true
    )
    this.fileTree = tree
    this.onRebuilt?.()
  }

  stopWatching() {
    if (this.watchTimer == null) return
    this.watchTimer.close()
  }

  resolveFile(path: string): File | null {
    return this.fileTree?.resolveFile(path)
  }

  filterByExtension(filePath: string) {
    return this.allowedFileExtensions.includes(path.extname(filePath).toLowerCase())
  }

  classifyByFilePath(filePath: string): FileType {
    if (this.fileTypePattern == null) return null
    for (const [pattern, type] of Object.entries(this.fileTypePattern)) {
      if (minimatch(filePath, pattern)) {
        return type
      }
    }
    // if not matching any one
    return null
  }
}