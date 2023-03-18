import { HostTree } from "./host.js"
import { type AppConfig } from "./index.js"
import express, { type Request, type Response } from "express"
import fs from "fs"
import { File, FileTree } from "./file.js"
import cors from "cors"
import ms from "mediaserver"

export async function startServer(config: AppConfig): Promise<void> {
  const tree = new HostTree({
    root: config.root,
    fileTypePatterns: config.fileTypePatterns,
    rebuildInterval: config.rebuildInterval
  })
  let treeJsonObjectCache: object | null = null
  let treeJsonStringCache: string | null = null
  let treeIndexHtmlCache: string | null = null
  tree.onRebuilt = () => {
    treeJsonObjectCache = {
      name: config.name,
      files: tree.fileTree.toJSON()
    }
    treeJsonStringCache = JSON.stringify(treeJsonObjectCache, null, 2)
    treeIndexHtmlCache = buildIndexHtml(tree.fileTree)
    console.log("FileTree is rebuilt.")
  }
  tree.startWatching()
  await tree.rebuildFileTree()
  const app = express()

  app.use(cors())

  app.get("/", (req, res) => {
    res.redirect("/index.html")
  })

  app.get("/index.html", (req, res) => {
    res.status(200)
    res.contentType("html")
    res.send(treeIndexHtmlCache)
  })

  app.get("/list", (req, res) => {
    res.status(200)
    res.contentType("application/json;charset=utf-8")
    res.send(treeJsonStringCache)
  })

  const fileType2handler = {
    "video/mp4": getVideo,
    "image/png": getImage,
    "image/jpeg": getImage,
    "audio/ogg": getAudio,
    "audio/mpeg": getAudio,
  }

  app.get("/file(/*)", (req, res) => {
    const path = removePrefix(decodeURI(req.url), "/file/")
    const file = tree.resolveFile(path)
    if (file == null) {
      res.status(404)
      return
    }
    const fileType = file.type
    if (fileType == null) {
      res.status(404)
      return
    }
    const handler = fileType2handler[fileType]
    if (handler == null) {
      res.status(404)
      return
    }
    handler(req, res, file)
  })

  app.listen(config.port, config.hostname, () => {
    console.log(`Server running at http://${config.hostname}:${config.port}/`)
  })
}

function removePrefix(origin: string, prefix: string): string {
  if (origin.startsWith(prefix)) return origin.substring(prefix.length,)
  else return origin
}

function getVideo(req: Request, res: Response, file: File): void {
  // learnt from https://github.com/bootstrapping-microservices/video-streaming-example
  const filePath = file.path
  const options: {
    start: number | undefined
    end: number | undefined
  } = {
    start: undefined,
    end: undefined,
  }

  let start: number
  let end: number

  const range = req.headers.range
  if (range) {
    const bytesPrefix = "bytes="
    if (range.startsWith(bytesPrefix)) {
      const bytesRange = range.substring(bytesPrefix.length)
      const parts = bytesRange.split("-")
      if (parts.length === 2) {
        const rangeStart = parts[0]?.trim()
        if (rangeStart && rangeStart.length > 0) {
          options.start = start = parseInt(rangeStart)
        }
        const rangeEnd = parts[1]?.trim()
        if (rangeEnd && rangeEnd.length > 0) {
          options.end = end = parseInt(rangeEnd)
        }
      }
    }
  }

  res.setHeader("content-type", "video/mp4")

  fs.stat(filePath, (err, stat) => {
    if (err != null) {
      console.error(`File stat error for ${filePath}.`)
      console.error(err)
      res.sendStatus(500)
      return
    }

    const contentLength = stat.size

    if (req.method === "HEAD") {
      res.statusCode = 200
      res.setHeader("accept-ranges", "bytes")
      res.setHeader("content-length", contentLength)
      res.end()
    } else {
      let retrievedLength: number
      if (start !== undefined && end !== undefined) {
        retrievedLength = (end + 1) - start
      } else if (start !== undefined) {
        retrievedLength = contentLength - start
      } else if (end !== undefined) {
        retrievedLength = (end + 1)
      } else {
        retrievedLength = contentLength
      }

      res.statusCode = start !== undefined || end !== undefined ? 206 : 200

      res.setHeader("content-length", retrievedLength)

      if (range !== undefined) {
        res.setHeader("content-range", `bytes ${start || 0}-${end || (contentLength - 1)}/${contentLength}`)
        res.setHeader("accept-ranges", "bytes")
      }

      const fileStream = fs.createReadStream(filePath, options)
      fileStream.on("error", (_) => {
        res.sendStatus(500)
      })

      fileStream.pipe(res)
    }
  })
}

function getImage(req: Request, res: Response, file: File): void {
  res.status(200)
  res.header({
    "Content-Type": file.type,
  })
  const path = file.path
  res.sendFile(path)
}

function getAudio(req: Request, res: Response, file: File): void {
  res.status(200)
  ms.pipe(req, res, file.path)
}

function buildIndexHtml(tree: FileTree): string {
  const html: string[] = []
  html.push("<div>")
  function buildSubtree(ancestorPath: string, curTree: FileTree, indent: number): void {
    const indentLength = 15
    const style = `style="margin-left: ${indentLength * indent}px;"`
    for (const [name, file] of curTree.name2File.entries()) {
      const fullPath = ancestorPath.length === 0 ? name : `${ancestorPath}/${name}`
      if (file instanceof File) {
        html.push(`<a href="/file/${fullPath}" ${style}>${name}</a>`)
        html.push("<br>")
      } else if (file instanceof FileTree) {
        html.push("<div>")
        html.push(`<a" ${style}>${name}\\</a>`)
        html.push("<br>")
        buildSubtree(fullPath, file, indent + 2)
        html.push("</div>")
      }
    }
  }
  buildSubtree("", tree, 0)
  html.push("</div>")
  return html.join("")
}
