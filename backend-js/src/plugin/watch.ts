import chokidar from "chokidar"
import { type LocalFileTree, type FileTreeLike, type FileTree, type LocalFile } from "../file.js"
import { type IHostTree, type HostTreeOptions, makeFilePathClassifier, makeFSOFilter, type FSOFilter, type FileClassifier, createFileTreeFrom, shallowEqual } from "../host.js"
import { type MeditreePlugin } from "../server.js"
import type fs from "fs"
import { TYPE } from "../server.js"
import EventEmitter from "events"
import { parseTime } from "../utils.js"
interface WatchPluginConfig {
  /**
   * 10s by default.
   */
  rebuildInterval?: number | string
}
/**
 * Watch plugin will watch the root directory changing and frequently rebuild the local file tree.
 */
export default function WatchPlugin(config: WatchPluginConfig): MeditreePlugin {
  const rebuildInterval = parseTime(config.rebuildInterval, "10s")
  return {
    onRegisterService(container) {
      container.bind(TYPE.HostTree)
        .toValue((options) =>
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
  private rebuildCounter = 0
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
    this.fileWatcher = chokidar.watch(this.options.root, {
      ignoreInitial: true,
    }).on("all", (event, filePath) => {
      this.options.log?.verbose(`[${event}]${filePath}`)
      // const relative = path.relative(this.root, filePath)
      if (event === "add" || event === "unlink") {
        if (this.filePathClassifier(filePath) == null) return
        this.shouldRebuild = true
        this.rebuildCounter = 0
      }
    })
  }

  async rebuildFileTree(): Promise<void> {
    this.shouldRebuild = false
    const tree = await createFileTreeFrom({
      root: this.options.root,
      classifier: this.filePathClassifier,
      includes: this.fileFilter,
      ignoreEmptyDir: true,
      plugins: this.options.plugins,
    })
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

interface LoopTask {
  unref(): void
  stop(): void
  isRunning(): boolean
}

function createLoopTask(callback: (duration: number) => void): LoopTask {
  let lastTime = new Date()

  let timer: NodeJS.Timer | null = setInterval(() => {
    const cur = new Date()
    const duration = cur.getTime() - lastTime.getTime()
    lastTime = cur
    callback(duration)
  })
  return {
    unref() {
      timer?.unref()
    },
    stop() {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    },
    isRunning() {
      return timer !== null
    }
  }
}
