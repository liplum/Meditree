import { filterFileTreeJson } from "../file.js"
import { type MeditreePlugin } from "../server.js"
import { parseBytes } from "../utils.js"
import { Transform, type TransformCallback } from "stream"

interface LimiterPluginConfig {
  /**
   * The maximum(including) file size allowed.
   * No limitation by default.
   * 
   * Any value <= 0 means unlimited.
   */
  maxFileSize?: number | string

  /**
   * The maximum speed of data transfer to client in bps(bytes per second).
   * No throttle by default.
   */
  throttle?: number | string
}

const LimiterPlugin = {
  create(config: LimiterPluginConfig): MeditreePlugin {
    const maxFileSize = parseBytes(config.maxFileSize, -1)
    const plugin: MeditreePlugin = {}
    if (maxFileSize > 0) {
      plugin.onClientFileTreeUpdated = (fileTree) => {
        return filterFileTreeJson(fileTree, (file) => {
          return file.size < maxFileSize
        })
      }
    }
    const throttleRate = parseBytes(config.throttle, -1)
    if (throttleRate > 0) {
      plugin.onPostCreateFileStream = async (manager, file, stream) => {
        const throttle = new ThrottleTransform(throttleRate)
        return stream.pipe(throttle)
      }
    }
    return plugin
  }
}
export default LimiterPlugin

/**
 * A custom Transform stream that throttles the data passing through it to limit the bandwidth.
 */
export class ThrottleTransform extends Transform {
  private readonly throttleRate: number
  private totalBytesSent: number
  private lastChunkTime: number

  /**
    * Create a new ThrottleTransform instance.
    * @param throttleRate - The maximum rate (in bps) at which data should be allowed to pass through the stream.
    */
  constructor(throttleRate: number) {
    super()
    this.throttleRate = throttleRate
    this.totalBytesSent = 0
    this.lastChunkTime = Date.now()
  }

  _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
    this.totalBytesSent += chunk.length as number

    const currentTime = Date.now()
    const elapsedTime = currentTime - this.lastChunkTime

    if (elapsedTime >= 1000) {
      this.lastChunkTime = currentTime
    } else {
      const timeToWait = (this.totalBytesSent / this.throttleRate) * 1000 - elapsedTime
      if (timeToWait > 0) {
        setTimeout(() => {
          this.push(chunk)
          callback()
        }, timeToWait)
        return
      }
    }

    this.push(chunk)
    callback()
  }
}
