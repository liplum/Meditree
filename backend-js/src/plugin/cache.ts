import { type ResolvedFile, LocalFile } from "../file.js"
import { type MeditreePlugin, pluginTypes } from "../plugin.js"
import { type MeditreeNode, type ReadStreamOptions } from "../meditree.js"
import cloneable from "cloneable-readable"
import { type Readable } from "stream"
import fs from "fs"
import { join, dirname } from "path"
import { promisify } from "util"
import { base64Encode, hash32Bit } from "../crypt.js"
// eslint-disable-next-line @typescript-eslint/dot-notation
pluginTypes["cache"] = (config) => new CachePlugin(config)

interface CachePluginConfig {
  /**
   * The max file size for being cached.
   * 10MB by default.
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
const mkdir = promisify(fs.mkdir)
export class CachePlugin implements MeditreePlugin {
  readonly maxSize: number
  readonly maxAge: number
  readonly path: string
  node: MeditreeNode
  constructor(config: CachePluginConfig) {
    this.maxSize = config.maxSize ?? 10 * 1024 * 1024
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
      if (options) {
        if (options.start !== undefined && options.start !== 0) return
        if (options.end !== undefined && options.end !== file.inner.size - 1) return
      }
      const stream = await this.node.createReadStream(file)
      if (stream === null) return null
      // clone the incoming stream
      const streamCloneable = cloneable(stream)
      // ensure parent directory exists.
      await mkdir(dirname(cachePath), { recursive: true })
      const cache = fs.createWriteStream(cachePath)
      // write into cache
      streamCloneable.pipe(cache)
      // return a clone
      return streamCloneable
    }
  }

  getCachePath(nodeName: string, path: string): string {
    return join(this.path, hash(nodeName), hash(path))
  }
}

function hash(input: string): string {
  const hashcode = hash32Bit(input)
  return base64Encode(hashcode)
}

function timestampToBuffer(timestamp: number): Buffer {
  const buffer = Buffer.alloc(4) // create a new buffer with 4 bytes
  buffer.writeUInt32BE(timestamp, 0) // write the timestamp integer in big-endian byte order
  return buffer
}
