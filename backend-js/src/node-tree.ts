import { type Net, MessageType } from "./net.js"

export class MessageNode {
  readonly name: string
  readonly name2Parent = new Map<string, Net>()
  readonly name2Child = new Map<string, Net>()
  constructor(name: string) {
    this.name = name
  }

  attachHooks(net: Net): void {
    net.addReadHook(({ type, id, data, header }) => {
      if (type !== MessageType.object) return
      if (!header || header.type !== "Bubble") return
      this.receiveBubble(id, data, header as BubbleHeader)
      return true
    })
  }

  onBubbleEnd(id: string, data: any, header: BubbleHeader): void {
    console.log("Bubble End", id, header)
  }

  onBubblePass(id: string, data: any, header: BubbleHeader): void {
    console.log("Bubble Pass", id, header)
  }

  sendBubbleUnrouted(id: string, data: any, header: any): void {
    const msgHeader: BubbleHeader = {
      ...header,
      type: "Bubble",
      routed: false,
      path: [this.name]
    }
    for (const net of this.name2Parent.values()) {
      net.send(id, data, msgHeader)
    }
  }

  sendBubbleRouted(id: string, data: any, header: any, route: string[]): void {
    const nextNode = this.name2Parent.get(route[0])
    if (nextNode) {
      const msgHeader: BubbleHeader = {
        ...header,
        type: "Bubble",
        routed: true,
        path: route,
      }
      nextNode.send(id, data, msgHeader)
    }
  }

  receiveBubble(id: string, data: any, header: BubbleHeader): void {
    if (header.routed) {
      const nextNode = this.name2Parent.get(header.path[header.path.indexOf(this.name) + 1])
      if (nextNode) {
        // handle message content
        this.onBubblePass(id, data, header)
        nextNode.send(id, data, header)
      } else {
        // Reach end
        this.onBubbleEnd(id, data, header)
      }
    } else {
      header.path.push(this.name)
      this.onBubblePass(id, data, header)
      for (const net of this.name2Parent.values()) {
        net.send(id, data, header)
      }
    }
  }
}

/**
 * Bubble message travels up the node tree.
 */
export interface BubbleHeader {
  type: "Bubble"
  /**
  * If true, the message has a clear route to pass through.
  * {@link path} means the route. e.g.: ["leaf", "parent1", "parent2", "root"].
  * 
  * If false, the message doesn't map out a route.
  * {@link path} means the nodes this message has passed through. e.g.: ["leaf", "parent1"].
  */
  routed: boolean
  path: string[]
  [key: string]: any
}
/**
 * Tunnel message travels down the node tree.
 */
export interface TunnelHeader {
  type: "Tunnel"
  /**
   * If true, the message has a clear route to pass through.
   * {@link path} means the route. e.g.: ["root", "sub1", "sub2", "leaf"].
   * 
   * If false, the message doesn't map out a route.
   * {@link path} means the nodes this message has passed through. e.g.: ["root", "sub1"].
   */
  routed: boolean
  path: string[]
  [key: string]: any
}
