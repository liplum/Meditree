import { RequestHandler } from "express"

interface MiddlewareEntry {
  handler: RequestHandler
  priority: number
}

export class MiddlewareRgistry {
  #route2Middlewares = new Map<string, MiddlewareEntry[]>()

  constructor() {
  }

  of(route: string): RequestHandler[] {
    return this.#route2Middlewares.get(route)?.map((entry) => entry.handler) ?? []
  }

  add(route: string, priority: number, ...handlers: RequestHandler[]) {
    const middlewares = this.#getOrCreate(route)
    for (const handler of handlers) {
      middlewares.push({
        handler,
        priority,
      })
    }
    middlewares.sort((a, b) => {
      return a.priority - b.priority
    })
  }

  #getOrCreate(route: string): MiddlewareEntry[] {
    let middlewares = this.#route2Middlewares.get(route)
    if (!middlewares) {
      middlewares = []
      this.#route2Middlewares.set(route, middlewares)
    }
    return middlewares
  }
}