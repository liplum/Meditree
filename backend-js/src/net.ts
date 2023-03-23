import type WebSocket from "ws"

export type Handler<Input> = ((data: Input) => void) | ((data: Input) => Promise<void>)

enum DataType {
  text = 1,
  json = 2,
  file = 3,
  stream = 4,
}
type ChannlHanlder<Input> = Map<string, Handler<Input>[]>
export class Net {
  readonly ws: WebSocket
  private readonly messageHandlers: ChannlHanlder<string | string[]> = new Map()
  private readonly jsonHandlers: ChannlHanlder<any | any[]> = new Map()
  private unhandledMessageTasks: (() => void)[] = []
  debug?: (id: string, message: any) => void
  constructor(ws: WebSocket) {
    this.ws = ws
  }

  startDaemonWatch(): void {
    const timer = setInterval(() => {
      const tasks = this.unhandledMessageTasks
      this.unhandledMessageTasks = []
      for (const task of tasks) {
        task()
      }
    })
    timer.unref()
  }

  close(): void {
    this.ws.close()
  }

  /**
   * Call this in ws.on("message")
   */
  handleReceivedData(data: Buffer): void {
    const reader = new BufferReader(data)
    const type = reader.uint8()
    const id = reader.string()
    if (type === DataType.text) {
      const count = reader.uint8()
      let content: string | string[]
      if (count === 1) {
        content = reader.string()
      } else {
        content = []
        for (let i = 0; i < count; i++) {
          content.push(reader.string())
        }
      }
      this.debug?.(id, content)
      this.handleText(id, content)
    } else if (type === DataType.json) {
      const count = reader.uint8()
      let jobj: any | any[]
      if (count === 1) {
        jobj = JSON.parse(reader.string())
      } else {
        jobj = []
        for (let i = 0; i < count; i++) {
          jobj.push(JSON.parse(reader.string()))
        }
      }
      this.debug?.(id, jobj)
      this.handleJson(id, jobj)
    }
  }

  private handleText(id: string, text: string | string[]): void {
    const handlers = this.messageHandlers.get(id)
    if (handlers) {
      handlers.forEach((handler) => {
        handler(text)
      })
      handlers.splice(0)
    } else {
      this.unhandledMessageTasks.push(() => {
        this.handleText(id, text)
      })
    }
  }

  private handleJson(id: string, json: any | any[]): void {
    const handlers = this.jsonHandlers.get(id)
    if (handlers) {
      handlers.forEach((handler) => {
        handler(json)
      })
      handlers.splice(0)
    } else {
      this.unhandledMessageTasks.push(() => {
        this.handleJson(id, json)
      })
    }
  }

  sendText(id: string, ...msg: string[]): void {
    const writer = new BufferWriter()
    writer.uint8(DataType.text)
    writer.string(id)
    writer.uint8(msg.length)
    for (let i = 0; i < msg.length; i++) {
      writer.string(msg[i])
    }
    this.ws.send(writer.buildBuffer())
  }

  sendJson(id: string, ...json: any[]): void {
    const writer = new BufferWriter()
    writer.uint8(DataType.json)
    writer.string(id)
    writer.uint8(json.length)
    for (let i = 0; i < json.length; i++) {
      writer.string(JSON.stringify(json[i]))
    }
    this.ws.send(writer.buildBuffer())
  }

  file(id: string, filePath: string): void {

  }

  stream(id: string): void {

  }

  onStream(id: string, handler: Handler<any>): void {

  }

  onText(id: string, handler: Handler<string | string[]>): void {
    if (this.messageHandlers.has(id)) {
      this.messageHandlers.get(id)?.push(handler)
    } else {
      this.messageHandlers.set(id, [handler])
    }
  }

  onJson(id: string, handler: Handler<any | any[]>): void {
    if (this.jsonHandlers.has(id)) {
      this.jsonHandlers.get(id)?.push(handler)
    } else {
      this.jsonHandlers.set(id, [handler])
    }
  }

  async getText(id: string): Promise<string | string[]> {
    return new Promise((resolve, reject) => {
      this.onText(id, (msg) => {
        resolve(msg)
      })
    })
  }

  async getJson(id: string): Promise<any | any[]> {
    return new Promise((resolve, reject) => {
      this.onJson(id, (json) => {
        resolve(json)
      })
    })
  }
}

class BufferWriter {
  private backend: Buffer
  private cursor: number = 0

  constructor(size: number = 1024) {
    this.backend = Buffer.alloc(size)
  }

  private ensureCapacity(size: number): void {
    if (this.cursor + size > this.backend.length) {
      const newBuffer = Buffer.alloc(this.backend.length + size)
      this.backend.copy(newBuffer)
      this.backend = newBuffer
    }
  }

  int8(value: number): void {
    this.ensureCapacity(1)
    this.backend.writeInt8(value, this.cursor)
    this.cursor += 1
  }

  uint8(value: number): void {
    this.backend.writeUInt8(value, this.cursor)
    this.cursor += 1
  }

  int16LE(value: number): void {
    this.ensureCapacity(2)
    this.backend.writeInt16LE(value, this.cursor)
    this.cursor += 2
  }

  int16BE(value: number): void {
    this.ensureCapacity(2)
    this.backend.writeInt16BE(value, this.cursor)
    this.cursor += 2
  }

  uint16LE(value: number): void {
    this.ensureCapacity(2)
    this.backend.writeUInt16LE(value, this.cursor)
    this.cursor += 2
  }

  uint16BE(value: number): void {
    this.ensureCapacity(2)
    this.backend.writeUInt16BE(value, this.cursor)
    this.cursor += 2
  }

  int32LE(value: number): void {
    this.ensureCapacity(4)
    this.backend.writeInt32LE(value, this.cursor)
    this.cursor += 4
  }

  int32BE(value: number): void {
    this.ensureCapacity(4)
    this.backend.writeInt32BE(value, this.cursor)
    this.cursor += 4
  }

  uint32LE(value: number): void {
    this.ensureCapacity(4)
    this.backend.writeUInt32LE(value, this.cursor)
    this.cursor += 4
  }

  uint32BE(value: number): void {
    this.ensureCapacity(4)
    this.backend.writeUInt32BE(value, this.cursor)
    this.cursor += 4
  }

  string(value: string, encoding: BufferEncoding = "utf8"): void {
    const length = Buffer.byteLength(value, encoding)
    this.ensureCapacity(length + 4)
    this.backend.writeInt32BE(length, this.cursor)
    this.cursor += 4
    this.backend.write(value, this.cursor, length, encoding)
    this.cursor += length
  }

  buffer(buffer: Buffer): void {
    this.ensureCapacity(buffer.length + 4)
    this.cursor += 4
    buffer.copy(this.backend, this.cursor, 0)
    this.cursor += buffer.length
  }

  buildBuffer(): Buffer {
    return this.backend.subarray(0, this.cursor + 1)
  }
}

class BufferReader {
  private readonly backend: Buffer
  private cursor: number = 0

  constructor(buffer: Buffer) {
    this.backend = buffer
  }

  int8(): number {
    const value = this.backend.readInt8(this.cursor)
    this.cursor += 1
    return value
  }

  uint8(): number {
    const value = this.backend.readUInt8(this.cursor)
    this.cursor += 1
    return value
  }

  int16BE(): number {
    const value = this.backend.readInt16BE(this.cursor)
    this.cursor += 2
    return value
  }

  int16LE(): number {
    const value = this.backend.readInt16LE(this.cursor)
    this.cursor += 2
    return value
  }

  uint16BE(): number {
    const value = this.backend.readUInt16BE(this.cursor)
    this.cursor += 2
    return value
  }

  uint16LE(): number {
    const value = this.backend.readUInt16LE(this.cursor)
    this.cursor += 2
    return value
  }

  int32BE(): number {
    const value = this.backend.readInt32BE(this.cursor)
    this.cursor += 4
    return value
  }

  int32LE(): number {
    const value = this.backend.readInt32LE(this.cursor)
    this.cursor += 4
    return value
  }

  uint32BE(): number {
    const value = this.backend.readUInt32BE(this.cursor)
    this.cursor += 4
    return value
  }

  uint32LE(): number {
    const value = this.backend.readUInt32LE(this.cursor)
    this.cursor += 4
    return value
  }

  string(encoding: BufferEncoding = "utf8"): string {
    const length = this.backend.readInt32BE(this.cursor)
    this.cursor += 4
    const content = this.backend.toString(encoding, this.cursor, this.cursor + length)
    this.cursor += length
    return content
  }

  buffer(): Buffer {
    const length = this.backend.readInt32BE(this.cursor)
    this.cursor += 4
    const buffer = this.backend.subarray(this.cursor, this.cursor + length)
    this.cursor += length
    return buffer
  }
}
