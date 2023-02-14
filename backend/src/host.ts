import * as fs from 'fs'
export class HostTree {
  root: string
  constructor(root: string) {
    this.root = root
  }
  get isWatching() { return this.watchTimer != null }
  watchTimer = null
  startWatching(intervalMs: number = 1000) {
    if (this.isWatching) return
    this.watchTimer = setTimeout(this.onWatch, intervalMs)
  }

  endWatching() {
    if (!this.isWatching) return
    clearTimeout(this.watchTimer)
  }

  private onWatch() {

  }

  forzeeTree() {
    
    fs.readdir(this.root, (err, files) => {
      files.forEach(file => {
        console.log(file);
      });
    });
  }
}