/* eslint-disable @typescript-eslint/method-signature-style */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { createLogger, type Logger } from "@liplum/log"
import { type FileTreeLike, type FileTreeJson, type LocalFile } from "./file.js"
import EventEmitter from "events"
import { type Readable } from "stream"
import fs from "fs"

export interface ReadStreamOptions {
  start?: number
  end?: number
}

export declare interface FileTreeManager {
  on(event: "file-tree-update", listener: (entireTree: FileTreeJson) => void): this

  off(event: "file-tree-update", listener: (entireFree: FileTreeJson) => void): this

  emit(event: "file-tree-update", entireFree: FileTreeJson): boolean
}

export class FileTreeManager extends EventEmitter implements FileTreeLike {
  localTree?: { tree: FileTreeLike, json: FileTreeJson }
  log: Logger = createLogger("Meditree")

  resolveFile(pathParts: string[]): LocalFile | null {
    if (this.localTree) {
      return this.localTree.tree.resolveFile(pathParts)
    } else {
      return null
    }
  }

  async createReadStream(file: LocalFile, options?: ReadStreamOptions): Promise<Readable | null> {
    // if the file has a path, it's a local file
    const path = file.localPath
    // if file not exists, return null
    if (!fs.existsSync(path)) return null
    try {
      return fs.createReadStream(file.localPath, options)
    } catch (error) {
      this.log.error(`Cannot create read stream of ${file.localPath}.`, error)
      return null
    }
  }

  onLocalFileTreeUpdate(tree: FileTreeLike): void {
    const json = tree.toJSON()
    this.localTree = { tree, json }
    this.emit("file-tree-update", json)
  }

  toJSON(): FileTreeJson {
    if (this.localTree) {
      return this.localTree?.json
    } else {
      return {}
    }
  }
}
