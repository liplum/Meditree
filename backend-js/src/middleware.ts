import { RequestHandler } from "express"

interface MiddlewareEntry {
  handler: RequestHandler
  priority: number
}

export class MiddlewareRgistry {
  #route2Middlewares = new Map<string, MiddlewareEntry[]>()
  #name2Middlewares = new Map<string, MiddlewareEntry[]>()

  constructor() {
  }

  ofRoute(route: string): RequestHandler[] {
    return this.#route2Middlewares.get(route)?.map((entry) => entry.handler) ?? []
  }

  byName(route: string): RequestHandler[] {
    return this.#name2Middlewares.get(route)?.map((entry) => entry.handler) ?? []
  }

  add(route: string, priority: number, ...handlers: RequestHandler[]) {
    addInto(this.#route2Middlewares, route, priority,... handlers)
  }
  
  named(route: string, priority: number, ...handlers: RequestHandler[]) {
    addInto(this.#name2Middlewares, route, priority,... handlers)
  }
}

const addInto = (map: Map<string, MiddlewareEntry[]>, route: string, priority: number, ...handlers: RequestHandler[]) => {
  const middlewares = getOrCreate(map, route)
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

const getOrCreate = (map: Map<string, MiddlewareEntry[]>, route: string): MiddlewareEntry[] => {
  let middlewares = map.get(route)
  if (!middlewares) {
    middlewares = []
    map.set(route, middlewares)
  }
  return middlewares
}