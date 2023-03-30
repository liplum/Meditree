import type WebSocket from "ws"
import { Readable } from "stream"
import { BufferReader, BufferWriter } from "./buffer.js"
import { v4 as uuidv4 } from "uuid"
/**
 * returns whether the message is handled
 */
export type Handler<Data> = (data: Data, header?: any) => boolean | Promise<boolean>

export enum DataType {
  string = 1,
  object = 2,
  array = 3,
}
export enum MessageType {
  object = 1,
  stream = 2,
}
export enum StreamState {
  end = 0,
  on = 1,
  error = 2,
}
export type MessageHandlerMap<Data> = Map<string, Handler<Data>[]>

export type PrereadHook = ({ type, id, reader, header }: {
  type: MessageType
  id: string
  header?: any
  reader: BufferReader
}) => boolean | undefined
export type ReadHook<Data> = ({ type, id, data, header }: {
  type: MessageType
  id: string
  header?: any
  data: Data
  chunk?: Buffer | null
}) => boolean | undefined
export type DebugCall = (id: string, data: any, header?: any) => void
export class Net {
  readonly ws: WebSocket
  private readonly messageHandlers: MessageHandlerMap<any> = new Map()
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
  handleDatapack(data: Buffer): void {
    const reader = new BufferReader(data)
    const type = reader.uint8()
    const id = reader.string()
    const headerString = readHeader(reader)
    const header: any | undefined = headerString ? JSON.parse(headerString) : undefined
    const prereadHookArgs = { type, id, reader, header }
    for (const hook of this.prereadHooks) {
      if (hook(prereadHookArgs)) return
    }
    if (type === MessageType.object) {
      const data = readObject(reader)
      this.debug?.(id, data, header)
      const readHookArgs = { type, id, data, header }
      for (const hook of this.readHooks) {
        if (hook(readHookArgs)) return
      }
      this.handleMessage(id, data, header)
    } else if (type === MessageType.stream) {
      const uuid = reader.string()
      let stream = this.id2Stream.get(uuid)
      if (!stream) {
        stream = new Readable({
          read() {
            // do nothing
          }
        })
        this.id2Stream.set(uuid, stream)
      }
      const state: StreamState = reader.uint8()
      let chunk: Buffer | null = null
      if (state === StreamState.on) {
        chunk = reader.buffer()
      }
      stream.push(chunk)
      if (chunk === null) {
        this.id2Stream.delete(uuid)
      }
      const readHookArgs = { type, id, data: stream, chunk, header }
      for (const hook of this.readHooks) {
        if (hook(readHookArgs)) return
      }
      this.handleMessage(id, stream, header)
    }
  }

  private handleMessage(id: string, data: any, header?: any): void {
    const handlers = this.messageHandlers.get(id)
    const handlerLengthBefore = handlers?.length
    if (handlers) {
      handlers.filter((handler) => {
        return !handler(data, header)
      })
    }
    if (handlers?.length !== handlerLengthBefore) {
      this.unhandledMessageTasks.push(() => {
        this.handleMessage(id, data, header)
      })
    }
  }

  send(id: string, data: any, header?: any): void {
    if (data instanceof Readable) {
      header = JSON.stringify(header)
      const uuid = uuidv4()
      data.on("readable", () => {
        let chunk: Buffer
        while ((chunk = data.read()) !== null) {
          const writer = new BufferWriter()
          writer.uint8(MessageType.stream)
          writer.string(id)
          writeHeader(writer, header)
          writer.string(uuid)
          writer.uint8(StreamState.on)
          writer.buffer(chunk)
          this.ws.send(writer.buildBuffer())
        }
        const writer = new BufferWriter()
        writer.uint8(MessageType.stream)
        writer.string(id)
        writeHeader(writer, header)
        writer.string(uuid)
        writer.uint8(StreamState.end)
        this.ws.send(writer.buildBuffer())
      })
    } else {
      const writer = new BufferWriter()
      writer.uint8(MessageType.object)
      writer.string(id)
      writeHeader(writer, JSON.stringify(header))
      writeObject(writer, data)
      this.ws.send(writer.buildBuffer())
    }
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

  onMessage<T = any>(id: string, handler: Handler<T>): void {
    this.addHandler(this.messageHandlers, id, handler)
  }

  async getMessage<T = any>(id: string, headerMatcher?: (header?: any) => boolean): Promise<T> {
    return new Promise((resolve, reject) => {
      this.onMessage<T>(id, (data, header) => {
        if (!headerMatcher || headerMatcher(header)) {
          resolve(data)
          return true
        }
        return false
      })
    })
  }

  addPrereadHook(hook: PrereadHook): void {
    this.prereadHooks.push(hook)
  }

  addReadHook<Data = any>(hook: ReadHook<Data>): void {
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

function writeObject(writer: BufferWriter, data: any): void {
  if (typeof data === "string") {
    writer.uint8(DataType.string)
    writer.string(data)
  } else if (Array.isArray(data)) {
    writer.uint32BE(data.length)
    for (let i = 0; i < data.length; i++) {
      writeObject(writer, data[i])
    }
  } else {
    writer.uint8(DataType.object)
    writer.string(JSON.stringify(data))
  }
}

function readObject(reader: BufferReader): any {
  const type: DataType = reader.uint8()
  if (type === DataType.string) {
    return reader.string()
  } else if (type === DataType.object) {
    return JSON.parse(reader.string())
  } else {
    const arr: any[] = []
    const length = reader.uint32BE()
    for (let i = 0; i < length; i++) {
      arr.push(readObject(reader))
    }
  }
}
