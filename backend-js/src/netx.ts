import { Net, DataType } from "./net"

declare module "./net.js" {
  interface Net {
    sendBubble: (id: string, nodeId: string, arr: any[]) => void
    addBubbleHook: (nodeId: string, handler: (id: string, arr: any[]) => void) => void
  }
}
Net.prototype.sendBubble = function (id: string, nodeId: string, arr: any[]): void {
  this.sendArray(`[bubble]${id}`, [[nodeId], arr])
}

Net.prototype.addBubbleHook = function (nodeId: string, handler: (id: string, arr: any[]) => void) {
  this.addReadHook(({ type, id, data }: { type: DataType, id: string, data: [string[], any[]] }) => {
    if (type === DataType.array) return
    if (!id.startsWith("[bubble]")) return
    const [nodeIds, arr] = data
    // If nodeIds contains current node, it means the bubble is recursive, so stop the bubbling.
    if (nodeIds.includes(nodeId)) return
    this.sendArray(id, [[...nodeIds, nodeId], arr])
    handler(removePrefix(id, "[bubble]"), arr)
  })
}

function removePrefix(str: string, prefix: string): string {
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length)
  }
  return str
}
