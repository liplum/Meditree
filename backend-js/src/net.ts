import WebSocket from "ws"

export type Handler<Input> = ((data: Input) => void) | ((data: Input) => Promise<void>)

enum DataType {
  text = 1,
  json = 2,
  file = 3,
  stream = 4,
}

export class Net {
  ws: WebSocket
  constructor(ws: WebSocket) {
    this.ws = ws
  }

  init() {
    this.ws.on("message", (data) => {
    })
  }

  message(channel: string, msg: string) {

  }

  json(channel: string, msg: string) {

  }

  file(channel: string, filePath: string) {

  }

  stream(channel: string) {

  }

  onMessage(channel: string, handler: Handler<string>) {

  }

  onJson(channel: string, handler: Handler<object>) {

  }

  onStream(channel: string, handler: Handler<any>) {

  }
}
