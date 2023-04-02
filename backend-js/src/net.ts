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
export interface SocketLike {
  close: () => void
  send: (buffer: Buffer) => void
}
export class Net {
  readonly socket: SocketLike
  private readonly messageHandlers = new Map<string, Handler<any>[]>()
  private unhandledMessageTasks: (() => void)[] = []
  private readonly prereadHooks: PrereadHook[] = []
  private readonly readHooks: ReadHook<any>[] = []
  private readonly id2Stream = new Map<string, Readable>()
  debug?: DebugCall
  constructor(socket: SocketLike) {
    this.socket = socket
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
    this.socket.close()
  }

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
      const state: StreamState = reader.uint8()

      if (state === StreamState.on) {
        let stream = this.id2Stream.get(uuid)
        if (!stream) {
          stream = new Readable({
            read() { }
          })
          this.id2Stream.set(uuid, stream)
          let isHookHandled = false
          const readHookArgs = { type, id, data: stream, header }
          for (const hook of this.readHooks) {
            if (hook(readHookArgs)) {
              isHookHandled = true
              break
            }
          }
          if (!isHookHandled) {
            this.handleMessage(id, stream, header)
          }
        }
      } else if (state === StreamState.end) {
        const stream = this.id2Stream.get(uuid)
        if (stream) {
          stream.push(null)
          this.id2Stream.delete(uuid)
        }
      } else {
        const stream = this.id2Stream.get(uuid)
        if (stream) {
          stream.emit("error")
          this.id2Stream.delete(uuid)
        }
      }
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
      this.sendStream(id, data, header)
    } else {
      this.sendObject(id, data, header)
    }
  }

  private sendObject(id: string, data: any, header?: any): void {
    const writer = new BufferWriter()
    writer.uint8(MessageType.object)
    writer.string(id)
    writeHeader(writer, JSON.stringify(header))
    writeObject(writer, data)
    this.socket.send(writer.buildBuffer())
  }

  private sendStream(id: string, stream: Readable, header?: any): void {
    header = JSON.stringify(header)
    const uuid = uuidv4()
    stream.on("readable", () => {
      let chunk: Buffer
      while ((chunk = stream.read()) !== null) {
        const writer = new BufferWriter()
        writer.uint8(MessageType.stream)
        writer.string(id)
        writeHeader(writer, header)
        writer.string(uuid)
        writer.uint8(StreamState.on)
        writer.buffer(chunk)
        this.socket.send(writer.buildBuffer())
      }
    })
    stream.on("close", () => {
      const writer = new BufferWriter()
      writer.uint8(MessageType.stream)
      writer.string(id)
      writeHeader(writer, header)
      writer.string(uuid)
      writer.uint8(StreamState.end)
      this.socket.send(writer.buildBuffer())
    })
    stream.on("error", () => {
      const writer = new BufferWriter()
      writer.uint8(MessageType.stream)
      writer.string(id)
      writeHeader(writer, header)
      writer.string(uuid)
      writer.uint8(StreamState.error)
      this.socket.send(writer.buildBuffer())
    })
  }

  private addHandler<Data>(
    handlers: Map<string, Handler<Data>[]>,
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
