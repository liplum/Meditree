import chokidar from "chokidar"
import { type LocalFileTree, type FileTreeLike, type FileTree, type LocalFile } from "../file.js"
import { type IHostTree, type HostTreeOptions, makeFilePathClassifier, makeFSOFilter, type FSOFilter, type FileClassifier, createFileTreeFrom } from "../host.js"
import { type MeditreePlugin } from "../server.js"
import type fs from "fs"
import { TYPE } from "../server.js"
import EventEmitter from "events"
import { parseTime } from "../utils.js"
import { type Logger } from "../logger.js"

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
  readonly name: string
  private readonly root: string
  private readonly log?: Logger
  private fileTree: LocalFileTree
  private fileWatcher: fs.FSWatcher | null = null
  private readonly rebuildInterval: number
  private readonly filePathClassifier: FileClassifier
  private readonly fileFilter: FSOFilter
  private rebuildCounter = 0
  constructor(options: HostTreeOptions, rebuildInterval: number) {
    super()
    this.rebuildInterval = rebuildInterval
    this.root = options.root
    this.log = options.log
    this.name = options.name
    this.filePathClassifier = makeFilePathClassifier(options.pattern2FileType)
    this.fileFilter = makeFSOFilter(options.ignorePatterns)
  }

  toJSON(): FileTree {
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
      this.log?.verbose(`[${event}]${filePath}`)
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
      name: this.name,
      root: this.root,
      classifier: this.filePathClassifier,
      includes: this.fileFilter,
      ignoreEmptyDir: true,
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
