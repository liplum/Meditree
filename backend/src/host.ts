import * as fs from 'fs'
import * as path from 'path'
import { FileTree, File } from './file.js'
import * as chokidar from 'chokidar'
export class HostTree {
  readonly root: string
  readonly allowedFileExtensions: string[] | null
  private fileTree: FileTree
  constructor(root: string, allowedFileExtensions: string[] | null = null) {
    this.root = root
    this.allowedFileExtensions = allowedFileExtensions
  }
  get isWatching() { return this.watchTimer != null }
  watchTimer: fs.FSWatcher | null = null
  startWatching() {
    if (this.watchTimer != null) return
    this.watchTimer = chokidar.watch(this.root, {
      ignoreInitial: true,
    }).on('all', (event, filePath) => {
      console.log(`[${event}]${filePath}`)
    })
  }

  stopWatching() {
    if (this.watchTimer == null) return
    this.watchTimer.close()
  }

  resolve(path: string): File | null {
    return this.fileTree?.resolve(path)
  }

  filterByExtension(filePath: string) {
    return this.allowedFileExtensions.includes(path.extname(filePath).toLowerCase())
  }

  forzeeTree() {
    FileTree.subFileTreeFromAsync(this.root, this.filterByExtension, true).then((tree) => {
      this.fileTree = tree
    })
  }
}