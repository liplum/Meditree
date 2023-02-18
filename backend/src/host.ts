import * as fs from 'fs'
import * as path from 'path'
import { FileTree, File } from './file.js'
import * as chokidar from 'chokidar'
export class HostTree {
  /**
   * The absolute path of root directory.
   */
  readonly root: string
  readonly allowedFileExtensions: string[] | null
  fileTree: FileTree
  private fileTreeJsonObject: object | null = null
  private fileTreeJsonString: string | null = null
  constructor(
    root: string,
    allowedFileExtensions: string[] | null = null
  ) {
    this.root = path.resolve(root)
    this.allowedFileExtensions = allowedFileExtensions
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
    const tree = await FileTree.subFileTreeFromAsync(
      this.root, (path) => this.filterByExtension(path), true
    )
    this.fileTree = tree
    this.fileTreeJsonObject = null
    this.fileTreeJsonString = null
    console.log(`${this.root} is rebuilt.`)
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

  getJsonObject(): object {
    if (this.fileTreeJsonObject == null) {
      this.fileTreeJsonObject = this.fileTree.toJsonObject()
    }
    return this.fileTreeJsonObject
  }

  getJsonString(): string {
    if (this.fileTreeJsonString == null) {
      this.fileTreeJsonString = JSON.stringify(this.getJsonObject())
    }
    return this.fileTreeJsonString
  }
}