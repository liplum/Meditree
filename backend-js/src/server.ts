/* eslint-disable @typescript-eslint/no-misused-promises */
import { CompoundHostTree, EmptyHostTree, HostTree, type HostTreeOptions, type IHostTree } from "./host.js"
import { type AppConfig } from "./config.js"
import express, { type RequestHandler, type Request, type Response } from "express"
import { cloneFileTreeJson, type FileTreeJson, type LocalFileTree, type LocalFile } from "./file.js"
import cors from "cors"
import { Meditree, type ReadStreamOptions } from "./meditree.js"
import { LogLevels, createLogger, globalOptions, initGlobalLogFile } from "./logger.js"
import { Timer } from "./timer.js"
import { type PluginRegistry, resolvePluginList } from "./plugin.js"
import { type Readable } from "stream"
import http, { type Server } from "http"
import { Container, uniqueToken } from "./ioc.js"
import cookieParser from "cookie-parser"
import { registerBuiltinPlugins } from "./builtin-plugin.js"
import { EventEmitter } from "events"
import path from "path"

export const TYPE = {
  HostTree: uniqueToken<(options: HostTreeOptions) => IHostTree>("HostTree"),
  Auth: uniqueToken<RequestHandler>("Auth"),
  Events: uniqueToken<MeditreeEvents>("Events"),
}

export async function startServer(
  config: AppConfig
): Promise<void> {
  // Phrase 1: setup starting timer.
  const timer = new Timer()
  timer.start("Start Server")

  // Phrase 2: try to initialize global logging settings.
  if (config.logDir) {
    initGlobalLogFile(config.logDir)
    if (config.logLevel) {
      const lv = LogLevels[config.logLevel.toUpperCase()]
      if (lv) {
        globalOptions.consoleLevel = lv
      }
    }
  }
  // Phrase 3: create logger.
  const log = createLogger("Main")
  const pluginLog = createLogger("Plugin")
  const fileTreelog = createLogger("FileTree")

  // Phrase 4: register all built-in plugins.
  const builtinPluginTypes: PluginRegistry<MeditreePlugin> = {}
  registerBuiltinPlugins(builtinPluginTypes)

  // Phrase 5: create IOC container.
  const container = new Container()

  // Phrase 6: instantiate plugins and respect dependencies.
  const plugins = config.plugin
    ? await resolvePluginList(builtinPluginTypes, config.plugin,
      (name) => {
        pluginLog.info(`Plugin[${name}] resgisered.`)
      })
    : []

  // Phrase 7: listen to all "exit-like" events, and handle them properly.
  function onExitPlugin(): void {
    // hostTree may not be declared before app exits.
    if (typeof hostTree !== "undefined") {
      hostTree.stop()
    }
    for (const plugin of plugins) {
      plugin.onExit?.()
    }
  }

  process.on("SIGINT", () => {
    onExitPlugin()
    process.exit(0)
  })

  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err)
    onExitPlugin()
    process.exit(1)
  })

  // Phrase 8: initilize plugins.
  for (const plugin of plugins) {
    await plugin.init?.()
  }

  // Phrase 9: register default service.
  container.bind(TYPE.HostTree)
    .toValue((options) => new HostTree(options))

  container.bind(TYPE.Auth)
    .toValue((req, res, next) => { next() })

  const events = new EventEmitter() as MeditreeEvents

  container.bind(TYPE.Events).toValue(events)

  // Phrase 10: plugins register or override services.
  for (const plugin of plugins) {
    plugin.onRegisterService?.(container)
  }

  // Phrase 11: create express app with essential middlewares.
  const app = express()
  const server = http.createServer(app)
  app.use(cors())
  app.use(express.json())
  app.use(cookieParser())
  app.use(function (req, res, next) {
    try {
      decodeURIComponent(req.path)
    } catch (error) {
      res.status(400).send("URI Invalid").end()
      return
    }
    next()
  })

  // Phrase 12: plugins patch the server setup.
  for (const plugin of plugins) {
    await plugin.setupServer?.(app, server)
  }

  // Phrase 13: resolve the HostTree service.
  const hostTreeCtor = container.get(TYPE.HostTree)
  let hostTree: IHostTree = new EmptyHostTree(config.name)
  if (config.root) {
    const common = {
      pattern2FileType: config.fileType,
      log: fileTreelog,
      ignorePatterns: config.ignore,
    }
    if (typeof config.root === "string") {
      hostTree = hostTreeCtor({
        root: config.root,
        name: config.name,
        ...common,
      })
    } else if (Array.isArray(config.root)) {
      const rootHostTree = new CompoundHostTree(config.name)
      hostTree = rootHostTree
      for (const root of config.root) {
        const name = path.basename(root)
        rootHostTree.addSubtree(hostTreeCtor({
          root, name, ...common
        }))
      }
    } else {
      const rootHostTree = new CompoundHostTree(config.name)
      hostTree = rootHostTree
      for (const [name, root] of Object.entries(config.root)) {
        if (!name) throw new Error(`The root[${root}] maps no name.`)
        rootHostTree.addSubtree(hostTreeCtor({
          root, name, ...common
        }))
      }
    }
  }

  // Phrase 14: create Meditree and attach plugins to it.
  const meditree = new Meditree()

  // Phrase 15: plugins patch the Meditree setup.
  for (const plugin of plugins) {
    await plugin.setupMeditree?.(meditree)
  }

  // Phrase 16: listen to HostTree "rebuild" event, and update the local file tree.
  hostTree.on("rebuild", (localTree) => {
    for (const plugin of plugins) {
      plugin.onLocalFileTreeRebuilt?.(localTree)
    }
    meditree.onLocalFileTreeUpdate(localTree)
    fileTreelog.info("Local file tree was rebuilt.")
  })

  // Phrase 17: create file tree cache and listen to updates from local file tree.
  let treeJsonCache: string = JSON.stringify({
    name: config.name,
    root: {},
  }, null, 1)

  meditree.on("file-tree-update", (entireTree) => {
    if (plugins) {
      entireTree = cloneFileTreeJson(entireTree)
      for (const plugin of plugins) {
        if (plugin.onClientFileTreeUpdated) {
          entireTree = plugin.onClientFileTreeUpdated(entireTree)
        }
      }
    }
    treeJsonCache = JSON.stringify({
      name: config.name,
      root: entireTree,
    }, null, 1)
  })

  const authMiddleware = container.get(TYPE.Auth)

  // Phrase 18: plugins patch the express app registering.
  for (const plugin of plugins) {
    await plugin.onRegisterExpressHandler?.(app)
  }

  // For authentication verification
  app.get("/verify", authMiddleware, (req, res) => {
    res.sendStatus(200).end()
  })

  // Phrase 19: express app setup.
  app.get("/list", authMiddleware, (req, res) => {
    res.status(200)
    res.contentType("application/json;charset=utf-8")
    res.send(treeJsonCache)
    res.end()
  })

  app.get("/file(/*)", authMiddleware, async (req, res) => {
    let path: string = removePrefix(req.baseUrl + req.path, "/file/")
    try {
      path = decodeURIComponent(path)
    } catch (e) {
      res.status(400).send("URI Invalid").end()
      return
    }
    path = removeSuffix(path, "/")
    const resolved = meditree.resolveFile(path.split("/"))
    if (!resolved?.["*type"]) {
      res.sendStatus(404).end()
      return
    }
    events.emit("file-requested", req, res, resolved)
    const fileType = resolved["*type"]
    res.contentType(fileType)
    const expireTime = new Date(Date.now() + config.cacheMaxAge)
    res.setHeader("Expires", expireTime.toUTCString())
    res.setHeader("Cache-Control", `max-age=${config.cacheMaxAge}`)
    await pipeFile(req, res, resolved)
  })
  /**
   * Ranged is for videos and audios. On Safari mobile, range headers is used.
   */
  async function pipeFile(req: Request, res: Response, file: LocalFile): Promise<void> {
    let { start, end } = resolveRange(req.headers.range)
    start ??= 0
    end ??= file.size - 1
    const retrievedLength = (end + 1) - start

    res.statusCode = req.headers.range ? 206 : 200

    res.setHeader("content-length", retrievedLength)
    if (req.headers.range) {
      res.setHeader("content-range", `bytes ${start}-${end}/${file.size}`)
      res.setHeader("accept-ranges", "bytes")
    }
    let stream: Readable | null | undefined
    const options = { start, end, }
    for (const plugin of plugins) {
      // break the loop if any plugin has hooked creation.
      if (stream !== undefined) break
      if (plugin.onPreCreateFileStream) {
        stream = await plugin.onPreCreateFileStream(meditree, file, options)
      }
    }
    if (stream === undefined) {
      stream = await meditree.createReadStream(file, options)
    }
    if (!stream) {
      res.sendStatus(404).end()
      return
    }
    for (const plugin of plugins) {
      if (plugin.onPostCreateFileStream) {
        stream = await plugin.onPostCreateFileStream(meditree, file, stream)
      }
    }
    stream.on("error", (_) => {
      res.sendStatus(500).end()
    })
    stream.pipe(res)
  }

  // Phrase 20: start HostTree and rebuild it manullay.
  hostTree.start()
  await hostTree.rebuildFileTree()

  // Phrase 21: listen to dedicated port.
  const hostname = config.hostname
  if (hostname) {
    server.listen(config.port, config.hostname, (): void => {
      log.info(`Server running at http://${hostname}:${config.port}/.`)
      // Phrase 22: stop the starting timer.
      timer.stop("Start Server", log.info)
    })
  } else {
    server.listen(config.port, (): void => {
      log.info(`Server running at http://localhost:${config.port}/.`)
      // Phrase 22: stop the starting timer.
      timer.stop("Start Server", log.info)
    })
  }
}

function removePrefix(origin: string, prefix: string): string {
  if (origin.startsWith(prefix)) return origin.substring(prefix.length,)
  else return origin
}

function removeSuffix(origin: string, suffix: string): string {
  if (origin.endsWith(suffix)) return origin.substring(0, origin.length - suffix.length)
  else return origin
}

function resolveRange(range?: string): { start?: number, end?: number } {
  if (!range) return {}
  let start: number | undefined
  let end: number | undefined

  if (range.startsWith("bytes=")) {
    const parts = removePrefix(range, "bytes=").split("-")
    if (parts.length === 2) {
      const rangeStart = parts[0]?.trim()
      if (rangeStart && rangeStart.length > 0) {
        start = parseInt(rangeStart)
      }
      const rangeEnd = parts[1]?.trim()
      if (rangeEnd && rangeEnd.length > 0) {
        end = parseInt(rangeEnd)
      }
    }
  }
  return { start, end }
}

export interface MeditreePlugin {
  onRegisterService?(container: Container): void

  init?(): Promise<void>

  setupServer?(app: Express.Application, server: Server): Promise<void>

  setupMeditree?(meditree: Meditree): Promise<void>

  onRegisterExpressHandler?(app: express.Express): Promise<void>

  onLocalFileTreeRebuilt?(tree: LocalFileTree): void

  /**
   * @param tree the entire file tree will be sent to clients soon.
   * @returns a new file tree or the same instance.
   */
  onClientFileTreeUpdated?(tree: FileTreeJson): FileTreeJson
  /**
   * A non-undefined value which is returned by any plugin will be taken and the hook will be stopped.
   * @returns undefined if not handled by this plugin.
   */
  onPreCreateFileStream?(meditree: Meditree, file: LocalFile, options?: ReadStreamOptions): Promise<Readable | null | undefined>
  /**
   * @param stream the former readable stream.
   * @returns a new stream or the original stream
   */
  onPostCreateFileStream?(meditree: Meditree, file: LocalFile, stream: Readable): Promise<Readable>
  onExit?(): void
}

export interface MeditreeEvents extends EventEmitter {
  on(event: "file-requested", listener: (req: Request, res: Response, file: LocalFile) => void): this
  off(event: "file-requested", listener: (req: Request, res: Response, file: LocalFile) => void): this
  emit(event: "file-requested", req: Request, res: Response, file: LocalFile): boolean
}
