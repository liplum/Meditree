/* eslint-disable @typescript-eslint/no-misused-promises */
import { CompoundHostTree, EmptyHostTree, HostTree, classifyContentTypeByPattern, type HostTreeOptions, type IHostTree } from "./host.js"
import { type AppConfig } from "./config.js"
import express, { type RequestHandler, type Request, type Response } from "express"
import { cloneFileTreeJson, type FileTreeJson, type LocalFileTree, type LocalFile } from "./file.js"
import cors from "cors"
import { FileTreeManager, type ReadStreamOptions } from "./manager.js"
import { LogLevels, createLogger, globalOptions, initGlobalLogDir } from "@liplum/log"
import { Timer } from "./timer.js"
import { type PluginRegistry, resolvePluginList } from "./plugin.js"
import { type Readable } from "stream"
import http, { type Server } from "http"
import { Container, token } from "@liplum/ioc"
import cookieParser from "cookie-parser"
import { registerBuiltinPlugins } from "./builtin-plugin.js"
import { EventEmitter } from "events"
import path from "path"
import { resolveAppStoragePath } from "./env.js"
import fs from "fs"
import { type MeditreeMeta } from "./meta.js"
import mime from "mime"
import { fileTypeFromFile } from "file-type"
import multer from "multer"

export const MeditreeType = {
  HostTree: token<(options: HostTreeOptions) => IHostTree>("net.liplum.Meditree.HostTree"),
  Auth: token<RequestHandler>("net.liplum.Meditree.Auth"),
  Events: token<MeditreeEvents>("net.liplum.Meditree.Events"),
}

export const startServer = async (
  config: AppConfig
): Promise<void> => {
  // Phrase 1: setup starting timer.
  const timer = new Timer()
  timer.start("Start Server")

  // Phrase 2: try to initialize global logging settings.
  initGlobalLogDir(resolveAppStoragePath("log"))
  if (config.logLevel) {
    const lv = LogLevels[config.logLevel.toUpperCase()]
    if (lv) {
      globalOptions.consoleOutputRequired = lv
    }
  }
  // Phrase 3: create logger.
  const log = createLogger("Main")
  const pluginLog = createLogger("Plugin")
  const fileTreeLog = createLogger("FileTree")

  // Phrase 4: register all built-in plugins.
  const builtinPluginTypes: PluginRegistry<MeditreePlugin> = {}
  registerBuiltinPlugins(builtinPluginTypes)

  // Phrase 5: create IoC container.
  const container = new Container()

  // Phrase 6: instantiate plugins and respect dependencies.
  let plugins: MeditreePlugin[] = []
  if (config.plugin) {
    try {
      plugins = await resolvePluginList(builtinPluginTypes, config.plugin,
        (name) => {
          pluginLog.info(`Plugin[${name}] was registered.`)
        })
    } catch (err) {
      log.error(err)
      process.exit(1)
    }
  }

  // Phrase 7: listen to all "exit-like" events, and handle them properly.
  const onExitPlugin = (): void => {
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

  // Phrase 8: initialize plugins.
  for (const plugin of plugins) {
    await plugin.init?.()
  }

  // Phrase 9: register default service.
  container.bind(MeditreeType.HostTree)
    .toValue((options) => new HostTree(options))

  container.bind(MeditreeType.Auth)
    .toValue((req, res, next) => { next() })

  const events = new EventEmitter() as MeditreeEvents

  const storage = multer.diskStorage({

  })

  const upload = multer({ storage })

  container.bind(MeditreeType.Events).toValue(events)

  // Phrase 10: plugins register or override services.
  for (const plugin of plugins) {
    plugin.setupService?.(container)
  }
  // Then froze the container
  container.froze()

  // Phrase 11: create express app with essential middlewares.
  const app = express()
  const api = express.Router()
  const admin = express.Router()
  const server = http.createServer(app)
  app.use(cors())
  app.use(express.json())
  app.use(cookieParser())

  api.use("/admin", admin)
  app.use("/api", api)

  app.use((req, res, next) => {
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
  const hooks: MeditreeHooks = {
    includeLocalFile: [],
    onClientFileTreeUpdated: [],
    onPostCreateFileStream: [],
  }
  // Phrase 12: plugins patch the server setup.
  for (const plugin of plugins) {
    plugin.setupHooks?.(hooks)
  }

  // Phrase 13: resolve the HostTree service.
  const hostTreeCtor = container.get(MeditreeType.HostTree)
  const createHostTree = (options: HostTreeOptions): IHostTree => {
    if (!fs.existsSync(options.root)) {
      log.warn(`"${options.root}" doesn't exist, so it's ignored.`)
      return new EmptyHostTree(options.name)
    } else if (!fs.statSync(options.root).isDirectory()) {
      log.warn(`"${options.root}" is not a directory, so it's ignored.`)
      return new EmptyHostTree(options.name)
    } else {
      return hostTreeCtor(options)
    }
  }
  if (config.enhancedMimeType) {
    log.info("Enhanced mime type mode is enabled. Building file tree might be terribly slow.")
  }
  let hostTree: IHostTree = new EmptyHostTree(config.name)
  if (config.root) {
    const common: Partial<HostTreeOptions> = {
      classifier: async (path) => {
        if (config.mimeTypes) {
          const type = classifyContentTypeByPattern(path, config.mimeTypes)
          if (type) return type
        }
        if (config.enhancedMimeType) {
          const type = await fileTypeFromFile(path)
          if (type) return type.mime
        }
        return mime.getType(path)
      },
      log: fileTreeLog,
      ignorePatterns: config.ignore,
      fileFilter(file: LocalFile): boolean {
        if (config.includes && !config.includes.includes(file.type)) {
          return false
        }
        for (const hook of hooks.includeLocalFile) {
          if (!hook(file)) return false
        }
        return true
      }
    }
    if (typeof config.root === "string") {
      hostTree = createHostTree({
        root: config.root,
        name: config.name,
        ...common,
      } as HostTreeOptions)
    } else if (Array.isArray(config.root)) {
      const rootHostTree = new CompoundHostTree(config.name)
      hostTree = rootHostTree
      for (const root of config.root) {
        const name = path.basename(root)
        rootHostTree.addSubtree(createHostTree({
          root, name, ...common
        } as HostTreeOptions))
      }
    } else {
      const rootHostTree = new CompoundHostTree(config.name)
      hostTree = rootHostTree
      for (const [name, root] of Object.entries(config.root)) {
        if (!name) throw new Error(`The root[${root}] maps no name.`)
        rootHostTree.addSubtree(createHostTree({
          root, name, ...common
        } as HostTreeOptions))
      }
    }
  }

  // Phrase 14: create FileTree Manager and set it up.
  const manager = new FileTreeManager()

  // Phrase 15: listen to HostTree "rebuild" event, and update the local file tree.
  hostTree.on("rebuild", (localTree) => {
    for (const plugin of plugins) {
      plugin.onLocalFileTreeRebuilt?.(localTree)
    }
    manager.onLocalFileTreeUpdate(localTree)
    fileTreeLog.info("Local file tree was rebuilt.")
  })

  // Phrase 16: create file tree cache and listen to updates from local file tree.
  let treeJsonCache: string = JSON.stringify({
    name: config.name,
    root: {},
  }, null, 1)

  manager.on("file-tree-update", ({ tree, json }) => {
    json = cloneFileTreeJson(json)
    for (const hook of hooks.onClientFileTreeUpdated) {
      json = hook(json)
    }
    treeJsonCache = JSON.stringify({
      name: config.name,
      root: json,
    }, null, 1)
  })

  /**
   * Ranged is for videos and audios. On Safari mobile, range headers is used.
  */
  const pipeFile = async (req: Request, res: Response, file: LocalFile): Promise<void> => {
    let { start, end } = resolveRange(req.headers.range)
    start ??= 0
    end ??= file.size - 1
    const retrievedLength = (end + 1) - start
    start = Math.min(start, end)

    res.statusCode = req.headers.range ? 206 : 200

    res.setHeader("Content-Length", retrievedLength)
    if (req.headers.range) {
      res.setHeader("Content-Range", `bytes ${start}-${end}/${file.size}`)
      res.setHeader("Accept-Ranges", "bytes")
    }
    let stream: Readable | null | undefined
    const options = { start, end, }
    if (stream !== undefined && hooks.onPreCreateFileStream) {
      stream = await hooks.onPreCreateFileStream(manager, file, options)
    }
    if (stream === undefined) {
      stream = await manager.createReadStream(file, options)
    }
    if (!stream) {
      res.sendStatus(404).end()
      return
    }
    for (const hook of hooks.onPostCreateFileStream) {
      stream = await hook(manager, file, stream)
    }
    stream.on("error", (_) => {
      res.sendStatus(500).end()
    })
    stream.pipe(res)
  }
  const service: MeditreeService = {
    pipeFile,
  }
  // Phrase 17: plugins patch the express app registering and FileTree manager setup.
  for (const plugin of plugins) {
    await plugin.setupMeditree?.({ app, manager, container, service })
  }

  // Phrase 18: express app setup.
  const authMiddleware = container.get(MeditreeType.Auth)

  api.get("/meta", (req, res) => {
    res.status(200)
    const meta: MeditreeMeta = {
      name: config.name,
      capabilities: []
    }
    res.json(meta)
    res.end()
  })

  // For authentication verification
  api.get("/verify", authMiddleware, (req, res) => {
    res.sendStatus(200).end()
  })

  api.get("/list", authMiddleware, (req, res) => {
    res.status(200)
    res.contentType("application/json;charset=utf-8")
    res.send(treeJsonCache)
    res.end()
  })

  admin.route("/file")
    .put((req, res) => {

    })
    .delete((req, res) => {

    })

  const resolveFile = (path: string) => {
    try {
      path = decodeURIComponent(path)
    } catch (e) {
      return "Invalid URI"
    }
    const pathParts = path.split("/")
    while (pathParts.length && pathParts[pathParts.length - 1].length === 0) {
      pathParts.pop()
    }
    while (pathParts.length && pathParts[0].length === 0) {
      pathParts.shift()
    }
    const resolved = manager.resolveFile(pathParts)
    return resolved
  }

  api.head("/file/(*)", authMiddleware, async (req, res) => {
    let path: string = req.params[0]
    const resolved = resolveFile(path)
    if (resolved === "Invalid URI") {
      res.status(400).send(resolved).end()
      return
    }
    if (!resolved?.type) {
      res.sendStatus(404).end()
      return
    }
    res.contentType(resolved.type)
    res.setHeader("ETag", resolved.etag)
    const expireTime = new Date(Date.now() + config.cacheMaxAge)
    res.setHeader("Expires", expireTime.toUTCString())
    res.setHeader("Cache-Control", `max-age=${config.cacheMaxAge}`)
    res.setHeader("Content-Length", resolved.size)
    res.end()
  })


  app.get("/file/(*)", authMiddleware, async (req, res) => {
    let path: string = req.params[0]
    const resolved = resolveFile(path)
    if (resolved === "Invalid URI") {
      res.status(400).send(resolved).end()
      return
    }
    if (!resolved?.type) {
      res.sendStatus(404).end()
      return
    }
    events.emit("file-requested", req, res, resolved)
    res.contentType(resolved.type)
    res.setHeader("ETag", resolved.etag)
    const expireTime = new Date(Date.now() + config.cacheMaxAge)
    res.setHeader("Expires", expireTime.toUTCString())
    res.setHeader("Cache-Control", `max-age=${config.cacheMaxAge}`)
    await pipeFile(req, res, resolved)
  })

  // Phrase 19: start HostTree and rebuild it manually.
  hostTree.start()
  await hostTree.rebuildFileTree()

  // Phrase 20: listen to dedicated port.
  const hostname = config.hostname
  if (hostname) {
    server.listen(config.port, config.hostname, (): void => {
      log.info(`Server running at http://${hostname}:${config.port}/.`)
      timer.stop("Start Server", log.info)
    })
  } else {
    server.listen(config.port, (): void => {
      log.info(`Server running at http://localhost:${config.port}/.`)
      timer.stop("Start Server", log.info)
    })
  }
}

const removePrefix = (origin: string, prefix: string): string => {
  if (origin.startsWith(prefix)) return origin.substring(prefix.length,)
  else return origin
}

const removeSuffix = (origin: string, suffix: string): string => {
  if (origin.endsWith(suffix)) return origin.substring(0, origin.length - suffix.length)
  else return origin
}

const resolveRange = (range?: string): { start?: number, end?: number } => {
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

export interface MeditreeSetupContext {
  app: express.Express
  manager: FileTreeManager
  container: Container
  service: MeditreeService
}

export interface MeditreePlugin {
  init?: () => Promise<void>

  setupMeta?: (meta: MeditreeMeta) => void

  setupService?: (container: Container) => void

  setupServer?: (app: Express.Application, server: Server) => Promise<void>

  setupHooks?: (hooks: MeditreeHooks) => void

  setupMeditree?: ({
    app, manager, container, service
  }: MeditreeSetupContext) => Promise<void>

  onLocalFileTreeRebuilt?: (tree: LocalFileTree) => void

  onExit?: () => void
}

export interface MeditreeService {
  pipeFile(req: Request, res: Response, file: LocalFile): Promise<void>
}
export type HookOf<T> = T[]

export interface MeditreeHooks {
  includeLocalFile: HookOf<(file: LocalFile) => boolean>

  /**
   * @param tree the entire file tree will be sent to clients soon.
   * @returns a new file tree or the same instance.
   */
  onClientFileTreeUpdated: HookOf<(tree: FileTreeJson) => FileTreeJson>

  /**
   * A non-undefined value which is returned by any plugin will be taken and the hook will be stopped.
   * @returns undefined if not handled by this plugin.
   */
  onPreCreateFileStream?: (manager: FileTreeManager, file: LocalFile, options?: ReadStreamOptions) => Promise<Readable | null | undefined>
  /**
   * @param stream the former readable stream.
   * @returns a new stream or the original stream
   */
  onPostCreateFileStream: HookOf<(manager: FileTreeManager, file: LocalFile, stream: Readable) => Promise<Readable>>
}

export interface MeditreeEvents extends EventEmitter {
  on(event: "file-requested", listener: (req: Request, res: Response, file: LocalFile) => void | Promise<void>): this
  off(event: "file-requested", listener: (req: Request, res: Response, file: LocalFile) => void | Promise<void>): this
  emit(event: "file-requested", req: Request, res: Response, file: LocalFile): boolean
}
