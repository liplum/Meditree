/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { Net, MessageType } from "./net.js"

declare module "./net.js" {
  interface Net {
    sendBubble: (id: string, nodeId: string, data: any) => void
    addBubbleHook: (nodeId: string, handler: (id: string, data: any) => void) => void
  }
}
interface MessageNode {
  nodeId: string
  name2Parent: Map<string, Net>
}

function sendBubble(node: MessageNode, id: string, data: any, header?: any): void {
  header = {
    ...header,
    routes: [node.nodeId]
  }
  for (const [name, net] of node.name2Parent.entries()) {
    net.send(id, data, header)
  }
}
function receiveBubble(node: MessageNode, id: string): void {

}
/**
 * Bubble message travels up the node tree.
 */
interface BubbleMessageHeader {
  /**
 * If true, the message has a clear route to pass through.
 * {@link path} means the route. e.g.: ["leaf", "parent1", "parent2", "root"].
 * 
 * If false, the message doesn't map out a route.
 * {@link path} means the nodes this message has passed through. e.g.: ["leaf", "parent1"].
 */
  routed: boolean
  path: string[]
}
/**
 * Tunnel message travels down the node tree.
 */
interface TunnelMessageHeader {
  /**
   * If true, the message has a clear route to pass through.
   * {@link path} means the route. e.g.: ["root", "sub1", "sub2", "leaf"].
   * 
   * If false, the message doesn't map out a route.
   * {@link path} means the nodes this message has passed through. e.g.: ["root", "sub1"].
   */
  routed: boolean
  path: string[]
}

Net.prototype.sendBubble = function (id: string, nodeId: string, data: any): void {
  this.send(`[bubble]${id}`, data, [nodeId])
}

Net.prototype.addBubbleHook = function (nodeId: string, handler: (id: string, data: any) => void) {
  this.addReadHook(({ type, id, data, header }: { type: MessageType, id: string, data: any, header?: any }) => {
    if (type !== MessageType.object) return
    if (!id.startsWith("[bubble]")) return
    const nodeIds = header as string[]
    // If nodeIds contains current node, it means the bubble is recursive, so stop the bubbling.
    if (nodeIds.includes(nodeId)) return
    this.send(id, data, [...nodeIds, nodeId])
    handler(removePrefix(id, "[bubble]"), data)
  })
}

function removePrefix(str: string, prefix: string): string {
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length)
  }
  return str
}
