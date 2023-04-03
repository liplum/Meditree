/* eslint-disable @typescript-eslint/no-misused-promises */
import { HostTree } from "./host.js"
import { type AppConfig, type AsParentConfig, type AsChildConfig } from "./config.js"
import express, { type Request, type Response } from "express"
import { type ResolvedFile } from "./file.js"
import cors from "cors"
import { setupAsParent, setupAsChild, MeditreeNode, type FileTreeInfo } from "./meditree.js"
import { createLogger } from "./logger.js"
import expressWs from "express-ws"
import { resolvePlguinFromConfig } from "./plugin.js"
// import for side effects
import "./plugin/homepage.js"
import "./plugin/minify.js"

export async function startServer(config: AppConfig): Promise<void> {
  console.time("Start Server")
  const app = express()
  expressWs(app)
  app.use(cors())
  app.use(express.json())
  const log = createLogger("Main")
  const plugins = config.plugin ? resolvePlguinFromConfig(config.plugin) : []
  const localTree = !config.root
    ? undefined
    : new HostTree({
      rootPath: config.root,
      name: config.name,
      fileTypePattern: config.fileType,
      rebuildInterval: config.rebuildInterval,
      ignorePattern: config.ignore ?? [],
      plugins,
    })
  const node = new MeditreeNode()
  node.plugins = plugins

  for (const plugin of plugins) {
    plugin.onMeditreeNodeCreated(node)
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
    files: {},
  }
  let fullTreeCache: { obj: FileTreeInfo, json: string } = {
    obj: initialFileTree,
    json: JSON.stringify(initialFileTree, null, 1),
  }

  node.on("file-tree-update", (entireTree) => {
    const info: FileTreeInfo = {
      name: config.name,
      files: entireTree,
    }
    const infoString = JSON.stringify(info, null, 1)
    fullTreeCache = {
      obj: info,
      json: infoString,
    }
  })

  node.on("parent-node-change", (parent, isAdded) => {
    if (!isAdded) return
    parent.net.send("file-tree-rebuild", fullTreeCache.obj.files)
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
  // If posscode is enabled.
  if (config.passcode) {
    app.use((req, res, next) => {
      try {
        const passcode = decodeURI(req.query.passcode as string) ?? req.body.passcode
        if (passcode !== config.passcode) {
          res.status(401).json({ error: "incorrectPasscode" })
        } else {
          next()
        }
      } catch (e) {
        res.status(400).send({ error: "badURI" })
        return
      }
    })
  }

  for (const plugin of plugins) {
    plugin.onRequestHandlerRegistering(app)
  }

  app.get("/list", (req, res) => {
    res.status(200)
    res.contentType("application/json;charset=utf-8")
    res.send(fullTreeCache.json)
  })

  app.get("/file(/*)", async (req, res) => {
    let uri: string
    try {
      uri = decodeURI(req.baseUrl + req.path)
    } catch (e) {
      res.status(400).send({ error: "badURI" })
      return
    }
    const path = removePrefix(uri, "/file/")
    const file = node.resolveFile(path.split("/"))
    if (file == null) {
      res.status(404).end()
      return
    }
    const fileType = file.inner["*type"]
    if (fileType == null) {
      res.status(404).end()
      return
    }
    res.header({
      "Content-Type": file.type,
    })
    res.setHeader("Cache-Control", `max-age=${config.cacheMaxAge}`)
    await pipeFile(req, res, file)
  })
  /**
   * Ranged is for videos and audios. On Safari mobile, range headers is used.
   */
  async function pipeFile(req: Request, res: Response, file: ResolvedFile): Promise<void> {
    let { start, end } = resolveRange(req.headers.range)
    start ??= 0
    end ??= file.inner.size - 1
    const retrievedLength = (end + 1) - start

    res.statusCode = start !== undefined || end !== undefined ? 206 : 200

    res.setHeader("content-length", retrievedLength)
    if (req.headers.range) {
      res.setHeader("content-range", `bytes ${start}-${end}/${file.inner.size}`)
      res.setHeader("accept-ranges", "bytes")
    }
    const stream = await node.createReadStream(file, {
      start, end,
    })
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
    localTree.startWatching()
    await localTree.rebuildFileTree()
  }

  // If node is defined and not empty, subnodes can connect to this.
  if (config.child?.length && config.publicKey && config.privateKey) {
    await setupAsParent(node, config as any as AsParentConfig,
      app as any as expressWs.Application)
  }

  // If central is defined and not empty, it will try connecting to every central.
  if (config.parent?.length && config.publicKey && config.privateKey) {
    await setupAsChild(node, config as any as AsChildConfig)
  }

  const onRunning = (): void => {
    log.info(`Server running at http://localhost:${config.port}/`)
    console.timeEnd("Start Server")
  }
  if (config.hostname) {
    app.listen(config.port, config.hostname, onRunning)
  } else {
    app.listen(config.port, onRunning)
  }
}

function removePrefix(origin: string, prefix: string): string {
  if (origin.startsWith(prefix)) return origin.substring(prefix.length,)
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
