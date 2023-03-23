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
  private readonly ws: WebSocket
  private readonly messageHandlers: ChannlHanlder<string> = new Map()
  private readonly jsonHandlers: ChannlHanlder<any> = new Map()
  private readonly messageOnceHanlders: ChannlHanlder<string> = new Map()
  private readonly jsonOnceHandlers: ChannlHanlder<any> = new Map()
  constructor(ws: WebSocket) {
    this.ws = ws
  }

  close(): void {
    this.ws.close()
  }

  /**
   * Call this in ws.on("message")
   */
  handleReceivedMessage(data: Buffer): void {
    const reader = new BufferReader(data)
    const type = reader.uint8()
    const header = reader.string()
    if (type === DataType.text) {
      const content = reader.string()
      this.messageHandlers.get(header)?.forEach((handler) => {
        handler(content)
      })
      this.messageOnceHanlders.get(header)?.forEach((handler) => {
        handler(content)
      })
      this.messageOnceHanlders.delete(header)
    } else if (type === DataType.json) {
      const jobj = JSON.parse(reader.string())
      this.jsonHandlers.get(header)?.forEach((handler) => {
        handler(jobj)
      })
      this.jsonOnceHandlers.get(header)?.forEach((handler) => {
        handler(jobj)
      })
      this.jsonOnceHandlers.delete(header)
    }
  }

  message(header: string, msg: string): void {
    const writer = new BufferWriter()
    writer.uint8(DataType.text)
    writer.string(header)
    writer.string(msg)
    this.ws.send(writer.buildBuffer())
  }

  json(header: string, json: any): void {
    const writer = new BufferWriter()
    writer.uint8(DataType.json)
    writer.string(header)
    writer.string(JSON.stringify(json))
    this.ws.send(writer.buildBuffer())
  }

  file(header: string, filePath: string): void {

  }

  stream(header: string): void {

  }

  onMessage(header: string, handler: Handler<string>): void {
    if (this.messageHandlers.has(header)) {
      this.messageHandlers.get(header)?.push(handler)
    } else {
      this.messageHandlers.set(header, [handler])
    }
  }

  onJson(header: string, handler: Handler<object>): void {
    if (this.jsonHandlers.has(header)) {
      this.jsonHandlers.get(header)?.push(handler)
    } else {
      this.jsonHandlers.set(header, [handler])
    }
  }

  onStream(header: string, handler: Handler<any>): void {

  }

  onOnceMessage(header: string, handler: Handler<string>): void {
    if (this.messageOnceHanlders.has(header)) {
      this.messageOnceHanlders.get(header)?.push(handler)
    } else {
      this.messageOnceHanlders.set(header, [handler])
    }
  }

  onOnceJson(header: string, handler: Handler<object>): void {
    if (this.jsonOnceHandlers.has(header)) {
      this.jsonOnceHandlers.get(header)?.push(handler)
    } else {
      this.jsonOnceHandlers.set(header, [handler])
    }
  }

  async readMessage(header: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.onOnceMessage(header, (msg) => {
        resolve(msg)
      })
    })
  }

  async readJson(header: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.onOnceJson(header, (json) => {
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
