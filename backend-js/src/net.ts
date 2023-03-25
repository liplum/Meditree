import type WebSocket from "ws"
import { Readable } from "stream"

export type Handler<Data> = (data: Data, header?: any) => void | Promise<void>

export enum DataType {
  text = 1,
  json = 2,
  array = 3,
  stream = 4,
}
export enum StreamState {
  end = 0,
  on = 1,
  error = 2,
}
export type MessageHandlerMap<Data> = Map<string, Handler<Data>[]>

export type PrereadHook = ({ type, id, reader, header }: {
  type: DataType
  id: string
  header?: any
  reader: BufferReader
}) => boolean
export type ReadHook<Data> = ({ type, id, data, header }: {
  type: DataType
  id: string
  header?: any
  data: Data
  chunk?: Buffer | null
}) => boolean
export type DebugCall = (id: string, data: any, header?: any) => void
export class Net {
  readonly ws: WebSocket
  private readonly textHandlers: MessageHandlerMap<string> = new Map()
  private readonly jsonHandlers: MessageHandlerMap<any> = new Map()
  private readonly arrayHandlers: MessageHandlerMap<any[]> = new Map()
  private readonly streamHandlers: MessageHandlerMap<Readable> = new Map()
  private unhandledMessageTasks: (() => void)[] = []
  private readonly prereadHooks: PrereadHook[] = []
  private readonly readHooks: ReadHook<any>[] = []
  debug?: DebugCall
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

  id2Stream = new Map<string, Readable>()

  /**
   * Call this in ws.on("message")
   */
  handleReceivedData(data: Buffer): void {
    const reader = new BufferReader(data)
    const type = reader.uint8()
    const id = reader.string()
    const headerString = readHeader(reader)
    const header: any | undefined = headerString ? JSON.parse(headerString) : undefined
    const prereadHookArgs = { type, id, reader, header }
    for (const hook of this.prereadHooks) {
      if (hook(prereadHookArgs)) return
    }
    if (type === DataType.text) {
      const content = reader.string()
      this.debug?.(id, content, header)
      const readHookArgs = { type, id, data: content, header }
      for (const hook of this.readHooks) {
        if (hook(readHookArgs)) return
      }
      this.handleText(id, content)
    } else if (type === DataType.json) {
      const json = JSON.parse(reader.string())
      this.debug?.(id, json, header)
      for (const hook of this.readHooks) {
        const readHookArgs = { type, id, data: json, header }
        if (hook(readHookArgs)) return
      }
      this.handleJson(id, json)
    } else if (type === DataType.array) {
      const count = reader.uint8()
      const content: any[] = []
      for (let i = 0; i < count; i++) {
        const etype = reader.uint8()
        if (etype === DataType.text) {
          content.push(reader.string())
        } else if (etype === DataType.json) {
          content.push(JSON.parse(reader.string()))
        }
      }
      this.debug?.(id, content, header)
      const readHookArgs = { type, id, data: content, header }
      for (const hook of this.readHooks) {
        if (hook(readHookArgs)) return
      }
      this.handleArray(id, content)
    } else if (type === DataType.stream) {
      let stream = this.id2Stream.get(id)
      if (!stream) {
        stream = new Readable()
        this.id2Stream.set(id, stream)
        this.handleStream(id, stream)
      }
      const state: StreamState = reader.uint8()
      let chunk: Buffer | null = null
      if (state === StreamState.on) {
        chunk = reader.buffer()
      }
      if (chunk === null) {
        this.id2Stream.delete(id)
      }
      const readHookArgs = { type, id, data: stream, chunk, header }
      for (const hook of this.readHooks) {
        if (hook(readHookArgs)) return
      }
      stream.push(chunk)
    }
  }

  private handleText(id: string, text: string, header?: any): void {
    const handlers = this.textHandlers.get(id)
    if (handlers) {
      handlers.forEach((handler) => {
        handler(text, header)
      })
      handlers.splice(0)
    } else {
      this.unhandledMessageTasks.push(() => {
        this.handleText(id, text, header)
      })
    }
  }

  private handleJson(id: string, json: any, header?: any): void {
    const handlers = this.jsonHandlers.get(id)
    if (handlers) {
      handlers.forEach((handler) => {
        handler(json, header)
      })
      handlers.splice(0)
    } else {
      this.unhandledMessageTasks.push(() => {
        this.handleJson(id, json, header)
      })
    }
  }

  private handleArray(id: string, arr: any[], header?: any): void {
    const handlers = this.arrayHandlers.get(id)
    if (handlers) {
      handlers.forEach((handler) => {
        handler(arr, header)
      })
      handlers.splice(0)
    } else {
      this.unhandledMessageTasks.push(() => {
        this.handleArray(id, arr, header)
      })
    }
  }

  private handleStream(id: string, stream: Readable, header?: any): void {
    const handlers = this.streamHandlers.get(id)
    if (handlers) {
      handlers.forEach((handler) => {
        handler(stream, header)
      })
      handlers.splice(0)
    } else {
      this.unhandledMessageTasks.push(() => {
        this.handleStream(id, stream, header)
      })
    }
  }

  sendText(id: string, msg: string, header?: any): void {
    const writer = new BufferWriter()
    writer.uint8(DataType.text)
    writer.string(id)
    writeHeader(writer, JSON.stringify(header))
    writer.string(msg)
    this.ws.send(writer.buildBuffer())
  }

  sendJson(id: string, json: any, header?: any): void {
    const writer = new BufferWriter()
    writer.uint8(DataType.json)
    writer.string(id)
    writeHeader(writer, JSON.stringify(header))
    writer.string(JSON.stringify(json))
    this.ws.send(writer.buildBuffer())
  }

  /**
   * 
   * @param id 
   * @param arr string or json object
   */
  sendArray(id: string, arr: any[], header?: any): void {
    const writer = new BufferWriter()
    writer.uint8(DataType.array)
    writer.string(id)
    writeHeader(writer, JSON.stringify(header))
    writer.uint8(arr.length)
    for (let i = 0; i < arr.length; i++) {
      if (typeof arr[i] === "string") {
        writer.uint8(DataType.text)
        writer.string(arr[i])
      } else {
        writer.uint8(DataType.json)
        writer.string(JSON.stringify(arr[i]))
      }
    }
    this.ws.send(writer.buildBuffer())
  }

  stream(id: string, stream: Readable, header?: any): void {
    header = JSON.stringify(header)
    stream.on("readable", () => {
      let chunk: Buffer
      while ((chunk = stream.read()) !== null) {
        const writer = new BufferWriter()
        writer.uint8(DataType.stream)
        writer.string(id)
        writeHeader(writer, header)
        writer.uint8(StreamState.on)
        writer.buffer(chunk)
        this.ws.send(writer.buildBuffer())
      }
      const writer = new BufferWriter()
      writer.uint8(DataType.stream)
      writer.string(id)
      writeHeader(writer, header)
      writer.uint8(StreamState.end)
      this.ws.send(writer.buildBuffer())
    })
  }

  private addHandler<Data>(
    handlers: MessageHandlerMap<Data>,
    id: string, handler: Handler<Data>
  ): void {
    if (handlers.has(id)) {
      handlers.get(id)?.push(handler)
    } else {
      handlers.set(id, [handler])
    }
  }

  onText(id: string, handler: Handler<string>): void {
    this.addHandler(this.textHandlers, id, handler)
  }

  onJson(id: string, handler: Handler<any>): void {
    this.addHandler(this.jsonHandlers, id, handler)
  }

  onArray(id: string, handler: Handler<any[]>): void {
    this.addHandler(this.arrayHandlers, id, handler)
  }

  onStream(id: string, handler: Handler<Readable>): void {
    this.addHandler(this.streamHandlers, id, handler)
  }

  async getText(id: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.onText(id, (msg) => {
        resolve(msg)
      })
    })
  }

  async getJson(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.onJson(id, (json) => {
        resolve(json)
      })
    })
  }

  async getArray(id: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.onArray(id, (arr) => {
        resolve(arr)
      })
    })
  }

  async getStream(id: string): Promise<Readable> {
    return new Promise((resolve, reject) => {
      this.onStream(id, (stream) => {
        resolve(stream)
      })
    })
  }

  addPrereadHook(hook: PrereadHook): void {
    this.prereadHooks.push(hook)
  }

  addReadHook<Data>(hook: ReadHook<Data>): void {
    this.readHooks.push(hook)
  }
}

function writeHeader(writer: BufferWriter, header?: string): void {
  if (header !== undefined) {
    writer.int8(1)
    writer.string(header)
  } else {
    writer.int8(0)
  }
}

function readHeader(reader: BufferReader): string | undefined {
  const hasHeader = reader.int8()
  if (hasHeader) {
    return reader.string()
  } else {
    return undefined
  }
}

export class BufferWriter {
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

export class BufferReader {
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
