/* eslint-disable @typescript-eslint/no-misused-promises */
import { HostTree } from "./host.js"
import { type AppConfig, type AsParentConfig, type AsChildConfig } from "./config.js"
import express, { type RequestHandler, type Request, type Response } from "express"
import { cloneFileTreeJson, type ResolvedFile } from "./file.js"
import cors from "cors"
import { setupAsParent, setupAsChild, MeditreeNode, type FileTreeInfo } from "./meditree.js"
import { LogLevels, Timer, createLogger, globalOptions, initGlobalLogFile } from "./logger.js"
import { type PluginRegistry, resolvePlguinFromConfig } from "./plugin.js"
import { type Readable } from "stream"
import http from "http"
import CachePlugin from "./plugin/cache.js"
import HomepagePlugin from "./plugin/homepage.js"
import HLSPlugin from "./plugin/hls.js"
import MinifyPlugin from "./plugin/minify.js"
import StatisticsPlugin from "./plugin/statistics.js"

export async function startServer(config: AppConfig): Promise<void> {
  if (config.logDir) {
    initGlobalLogFile(config.logDir)
    if (config.logLevel) {
      const lv = LogLevels[config.logLevel.toUpperCase()]
      if (lv) {
        globalOptions.consoleLevel = lv
      }
    }
  }
  const log = createLogger("Main")
  const pluginTypes: PluginRegistry = {}
  pluginTypes.cache = (config) => CachePlugin(config)
  pluginTypes.homepage = (config) => HomepagePlugin(config)
  pluginTypes.hls = (config) => HLSPlugin(config)
  pluginTypes.minify = (config) => MinifyPlugin(config)
  pluginTypes.statistics = (config) => StatisticsPlugin(config)

  const timer = new Timer()
  timer.start("Start Server")
  const plugins = config.plugin
    ? await resolvePlguinFromConfig(pluginTypes, config.plugin, (name) => {
      log.error(`Plugin[${name}] doesn't exist.`)
    })
    : []
  for (const plugin of plugins) {
    await plugin.init?.()
  }

  function onExitPlugin(): void {
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
  const app = express()
  const server = http.createServer(app)
  app.use(cors())
  app.use(express.json())
  for (const plugin of plugins) {
    await plugin.setupServer?.(app, server)
  }
  const localTree = !config.root
    ? undefined
    : new HostTree({
      root: config.root as string,
      name: config.name,
      fileTypePattern: config.fileType,
      rebuildInterval: config.rebuildInterval,
      ignorePattern: config.ignore ?? [],
      plugins,
    })
  const node = new MeditreeNode()
  node.plugins = plugins

  for (const plugin of plugins) {
    await plugin.setupMeditreeNode?.(node)
  }

  const fileTypes = Array.from(Object.values(config.fileType))
  node.subNodeFilter = (file) => {
    return !file["*type"] || fileTypes.includes(file["*type"])
  }

  if (localTree) {
    localTree.on("rebuild", (fileTree) => {
      node.updateFileTreeFromLocal(config.name, fileTree)
      log.info("Local file tree is rebuilt.")
    })
  }

  const initialFileTree = {
    name: config.name,
    root: {},
  }
  let fullTreeCache: { obj: FileTreeInfo, json: string } = {
    obj: initialFileTree,
    json: JSON.stringify(initialFileTree, null, 1),
  }

  node.on("file-tree-update", (entireTree) => {
    if (plugins) {
      entireTree = cloneFileTreeJson(entireTree)
      for (const plugin of plugins) {
        if (plugin.onEntireTreeForClient) {
          entireTree = plugin.onEntireTreeForClient(entireTree)
        }
      }
    }
    const info: FileTreeInfo = {
      name: config.name,
      root: entireTree,
    }
    const infoString = JSON.stringify(info, null, 1)
    fullTreeCache = {
      obj: info,
      json: infoString,
    }
  })

  app.use(function (req, res, next) {
    try {
      decodeURIComponent(req.path)
    } catch (error) {
      res.status(400).send({ error: "badURI" })
      return
    }
    next()
  })
  const passcodeHandler: RequestHandler = (req, res, next) => {
    if (!config.passcode) {
      next()
      return
    }
    // If posscode is enabled.
    try {
      const passcode = decodeURI(req.query.passcode as string) ?? req.body.passcode
      if (passcode !== config.passcode) {
        res.status(401).json({ error: "incorrectPasscode" })
      } else {
        next()
        return
      }
    } catch (e) {
      res.status(400).send({ error: "badURI" })
      return
    }
  }

  const registryCtx = {
    passcodeHandler,
  }

  for (const plugin of plugins) {
    await plugin.onExpressRegistering?.(app, registryCtx)
  }

  app.get("/list", passcodeHandler, (req, res) => {
    res.status(200)
    res.contentType("application/json;charset=utf-8")
    res.send(fullTreeCache.json)
  })

  app.get("/file(/*)", passcodeHandler, async (req, res) => {
    let uri: string
    try {
      uri = decodeURI(req.baseUrl + req.path)
    } catch (e) {
      res.status(400).send({ error: "badURI" })
      return
    }
    let path = removePrefix(uri, "/file/")
    path = removeSuffix(path, "/")
    const resolved = node.resolveFile(path.split("/"))
    if (!resolved?.inner?.["*type"]) {
      res.status(404).end()
      return
    }
    for (const plugin of plugins) {
      if (await plugin.onFileRequested?.(req, res, resolved)) {
        res.status(400).end()
        return
      }
    }
    const fileType = resolved.inner["*type"]
    res.contentType(fileType)
    const expireTime = new Date(Date.now() + config.cacheMaxAge)
    res.setHeader("Expires", expireTime.toUTCString())
    res.setHeader("Cache-Control", `max-age=${config.cacheMaxAge}`)
    await pipeFile(req, res, resolved)
  })
  /**
   * Ranged is for videos and audios. On Safari mobile, range headers is used.
   */
  async function pipeFile(req: Request, res: Response, file: ResolvedFile): Promise<void> {
    let { start, end } = resolveRange(req.headers.range)
    start ??= 0
    end ??= file.inner.size - 1
    const retrievedLength = (end + 1) - start

    res.statusCode = req.headers.range ? 206 : 200

    res.setHeader("content-length", retrievedLength)
    if (req.headers.range) {
      res.setHeader("content-range", `bytes ${start}-${end}/${file.inner.size}`)
      res.setHeader("accept-ranges", "bytes")
    }
    let stream: Readable | null | undefined
    const options = { start, end, }
    for (const plugin of plugins) {
      if (stream !== undefined) break
      if (plugin.onNodeCreateReadStream) {
        stream = await plugin.onNodeCreateReadStream(node, file, options)
      }
    }
    if (stream === undefined) {
      stream = await node.createReadStream(file, options)
    }
    if (!stream) {
      res.status(404).end()
      return
    }
    stream.on("error", (_) => {
      res.sendStatus(500)
    })
    stream.pipe(res)
  }

  if (localTree) {
    if (config.watch ?? true) {
      localTree.startWatching()
    }
    await localTree.rebuildFileTree()
  }

  // If node is defined and not empty, subnodes can connect to this.
  if (config.child?.length && config.publicKey && config.privateKey) {
    await setupAsParent(node, config as any as AsParentConfig, server)
  }

  // If central is defined and not empty, it will try connecting to every central.
  if (config.parent?.length && config.publicKey && config.privateKey) {
    await setupAsChild(node, config as any as AsChildConfig)
  }
  const hostname = config.hostname
  if (hostname) {
    server.listen(config.port, config.hostname, (): void => {
      log.info(`Server running at http://${hostname}:${config.port}/`)
      timer.stop("Start Server", log.info)
    })
  } else {
    server.listen(config.port, (): void => {
      log.info(`Server running at http://localhost:${config.port}/`)
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
