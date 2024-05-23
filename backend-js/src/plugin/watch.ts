import chokidar from "chokidar"
import { type LocalFileTree, type FileTreeLike, type FileTreeJson, type LocalFile } from "../file.js"
import { type IHostTree, type HostTreeOptions, makeFSOFilter as makePathFilter, type PathFilter, type FileClassifier, createFileTreeFrom, type FileFilter } from "../host.js"
import { type MeditreePlugin } from "../server.js"
import type fs from "fs"
import { TYPE } from "../server.js"
import EventEmitter from "events"
import { parseTime } from "../utils.js"
import { type Logger } from "@liplum/log"
import { type LoopTask, createLoopTask, Timer } from "../timer.js"
import { type PluginMeta } from "../plugin.js"

interface WatchPluginConfig {
  /**
   * 10s by default.
   */
  rebuildInterval?: number | string
}
/**
 * Watch plugin will watch the root directory changing and frequently rebuild the local file tree.
 */
const WatchPlugin: PluginMeta<MeditreePlugin, WatchPluginConfig> = {
  create: (config) => {
    const rebuildInterval = parseTime(config.rebuildInterval, "10s")
    return {
      setupService: (container) => {
        container.bind(TYPE.HostTree)
          .toValue((options) =>
            new WatchTree(options, rebuildInterval)
          )
      }
    }
  }
}
export default WatchPlugin

export class WatchTree extends EventEmitter implements FileTreeLike, IHostTree {
  readonly name: string
  private readonly root: string
  private readonly log?: Logger
  private fileTree: LocalFileTree
  private fileWatcher: fs.FSWatcher | null = null
  private readonly rebuildInterval: number
  private readonly classifier: FileClassifier
  private readonly filter: PathFilter
  private readonly fileFilter: FileFilter
  private rebuildCounter = 0
  constructor({ root, log, name, classifier, ignorePatterns, fileFilter }: HostTreeOptions, rebuildInterval: number) {
    super()
    this.rebuildInterval = rebuildInterval
    this.root = root
    this.log = log
    this.name = name
    this.classifier = classifier
    this.filter = makePathFilter(ignorePatterns)
    this.fileFilter = fileFilter
  }

  children(): (LocalFile | FileTreeLike)[] {
    return this.fileTree.children()
  }

  toJSON(): FileTreeJson {
    return this.fileTree.toJSON()
  }

  get isWatching(): boolean {
    return this.fileWatcher != null
  }

  protected rebuildLoopTask: LoopTask | null = null

  protected shouldRebuild = false

  start(): void {
    if (this.fileWatcher != null && this.rebuildLoopTask != null) return
    this.rebuildLoopTask = createLoopTask((duration) => {
      this.rebuildCounter += duration
      if (this.shouldRebuild && this.rebuildCounter >= this.rebuildInterval) {
        this.rebuildFileTree()
      }
    })
    this.rebuildLoopTask.unref()
    this.fileWatcher = chokidar.watch(this.root, {
      ignoreInitial: true,
    }).on("all", (event, filePath) => {
      this.log?.verbose(`[${event}] "${filePath}"`)
      // const relative = path.relative(this.root, filePath)
      if (event === "add" || event === "unlink") {
        if (this.classifier(filePath) == null) return
        this.shouldRebuild = true
        this.rebuildCounter = 0
      }
    })
  }

  async rebuildFileTree(): Promise<void> {
    this.shouldRebuild = false
    const timer = new Timer()
    timer.start()
    const tree = await createFileTreeFrom({
      name: this.name,
      root: this.root,
      classifier: this.classifier,
      includes: this.filter,
      fileFilter: this.fileFilter,
      ignoreEmptyDir: true,
    })
    this.log?.info(`Spent ${timer.stop()} ms to rebuild "${this.root}"`)
    this.rebuildCounter = 0
    this.fileTree = tree
    this.emit("rebuild", tree)
  }

  stop(): void {
    this.fileWatcher?.close()
    this.rebuildLoopTask?.stop()
    this.fileWatcher = null
    this.rebuildLoopTask = null
  }

  resolveFile(pathParts: string[]): LocalFile | null {
    return this.fileTree?.resolveFile(pathParts)
  }
}
