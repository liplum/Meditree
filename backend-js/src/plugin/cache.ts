import { type ResolvedFile, LocalFile } from "../file.js"
import { type MeditreePlugin, pluginTypes } from "../plugin.js"
import { type MeditreeNode, type ReadStreamOptions } from "../meditree.js"
import cloneable from "cloneable-readable"
import { type Readable } from "stream"
import { createHash } from "crypto"
import fs from "fs"
import { join } from "path"
import { promisify } from "util"
// eslint-disable-next-line @typescript-eslint/dot-notation
pluginTypes["cache"] = (config) => new CachePlugin(config)
const md5 = createHash("md5")

interface CachePluginConfig {
  /**
   * The max file size for being cached.
   * 5MB by default.
   */
  maxSize?: number
  /**
   * The max time in ms to live for the cache.
   * 24 hours by default.
   */
  maxAge?: number
  /**
   * The cache root direcotry.
   * "meditree-cache" by default.
   */
  path?: string
}

const fsstate = promisify(fs.stat)

export class CachePlugin implements MeditreePlugin {
  readonly maxSize: number
  readonly maxAge: number
  readonly path: string
  node: MeditreeNode
  constructor(config: CachePluginConfig) {
    this.maxSize = config.maxSize ?? 5 * 1024 * 1024
    this.maxAge = config.maxAge ?? 24 * 60 * 60 * 1000
    this.path = config.path ?? "meditree-cache"
  }

  init(): void {
  }

  setupMeditreeNode(node: MeditreeNode): void {
    this.node = node
  }

  async onCreateReadStream(file: ResolvedFile, options?: ReadStreamOptions): Promise<Readable | null | undefined> {
    // ignore local file requests
    if (file.inner instanceof LocalFile) return
    // ignore large files
    if (file.inner.size > this.maxSize) return
    // for remote file
    if (typeof file.remoteNode === "string") {
      const cachePath = this.getCachePath(file.remoteNode, file.inner.path)
      // if cached, capable to read partial file
      if (fs.existsSync(cachePath) && (await fsstate(cachePath)).isFile()) {
        return fs.createReadStream(cachePath, options)
      }
      // if not cached, ignore partial file
      if (options && (options.start !== undefined || options.end !== undefined)) {
        return
      }
      const stream = await this.node.createReadStream(file)
      if (stream === null) return null
      // clone the incoming stream
      const fileStream = cloneable(stream)
      const cacheStream = fs.createWriteStream(cachePath)
      // write into cache
      stream.pipe(cacheStream)
      // return a clone
      return fileStream.clone()
    }
  }

  getCachePath(nodeName: string, path: string): string {
    return join(this.path, hash(nodeName), hash(path))
  }
}

function hash(input: string): string {
  const hash = md5.update(input, "utf8").digest("base64")
  return hash.slice(0, 12)
}

function timestampToBuffer(timestamp: number): Buffer {
  const buffer = Buffer.alloc(4) // create a new buffer with 4 bytes
  buffer.writeUInt32BE(timestamp, 0) // write the timestamp integer in big-endian byte order
  return buffer
}
