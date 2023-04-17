import chokidar from "chokidar"
import { type LocalFileTree, type FileTreeLike, type FileTree, type ResolvedFile } from "../file.js"
import { type IHostTree, type HostTreeOptions, makeFilePathClassifier, makeFSOFilter, type FSOFilter, type FileClassifier, createFileTreeFrom, shallowEqual } from "../host.js"
import { type MeditreePlugin } from "../plugin.js"
import type fs from "fs"
import { TYPE } from "../server.js"
import EventEmitter from "events"
interface WatchPluginConfig {
  /**
   * 5000(ms) by default.
   */
  rebuildInterval?: number
}
/**
 * Watch plugin will watch the root directory changing and frequently rebuild the local file tree.
 */
export default function WatchPlugin(config: WatchPluginConfig): MeditreePlugin {
  const rebuildInterval = config.rebuildInterval ?? 5000
  return {
    registerService(container) {
      container.rebind(TYPE.HostTree)
        .toFactory(
          (options) =>
            new WatchTree(options, rebuildInterval)
        )
    }
  }
}

export class WatchTree extends EventEmitter implements FileTreeLike, IHostTree {
  private _options: HostTreeOptions
  private fileTree: LocalFileTree
  private fileWatcher: fs.FSWatcher | null = null
  private readonly rebuildInterval: number
  private filePathClassifier: FileClassifier
  private fileFilter: FSOFilter
  constructor(options: HostTreeOptions, rebuildInterval: number) {
    super()
    this.rebuildInterval = rebuildInterval
    this.options = options
  }

  toJSON(): FileTree {
    return this.fileTree.toJSON()
  }

  get options(): HostTreeOptions {
    return this._options
  }

  set options(value: HostTreeOptions) {
    this._options = value
    this.filePathClassifier = makeFilePathClassifier(value.fileTypePattern)
    this.fileFilter = makeFSOFilter(value.ignorePattern)
  }

  async updateOptions(options: HostTreeOptions): Promise<void> {
    const oldOptions = this.options
    if (shallowEqual(oldOptions, options)) return
    this.options = options
    if (oldOptions.root !== options.root) {
      this.stop()
      this.start()
    }
    await this.rebuildFileTree()
  }

  get isWatching(): boolean {
    return this.fileWatcher != null
  }

  protected rebuildTimer: NodeJS.Timer | null = null

  protected shouldRebuild = false

  start(): void {
    if (this.fileWatcher != null && this.rebuildTimer != null) return
    this.rebuildTimer = setInterval(() => {
      if (this.shouldRebuild) {
        this.rebuildFileTree()
      }
    }, this.rebuildInterval)
    this.fileWatcher = chokidar.watch(this.options.root, {
      ignoreInitial: true,
    }).on("all", (event, filePath) => {
      this.onWatch(event, filePath)
    })
  }

  onWatch(event: string, filePath: string): void {
    this.options.log?.verbose(`[${event}]${filePath}`)
    // const relative = path.relative(this.root, filePath)
    if (event === "add" || event === "unlink") {
      if (this.filePathClassifier(filePath) == null) return
      this.shouldRebuild = true
    }
  }

  async rebuildFileTree(): Promise<void> {
    this.shouldRebuild = false
    const tree = await createFileTreeFrom({
      root: this.options.root,
      initPath: [this.options.name],
      classifier: this.filePathClassifier,
      includes: this.fileFilter,
      ignoreEmptyDir: true,
      plugins: this.options.plugins,
    })
    this.fileTree = tree
    this.emit("rebuild", tree)
  }

  stop(): void {
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
