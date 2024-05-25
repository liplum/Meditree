import { RequestHandler } from "express"

interface MiddlewareEntry {
  handler: RequestHandler
  priority: number
}

export interface MiddlewareProvider {
  ofRoute: (route: string) => RequestHandler[]
  byName: (route: string) => RequestHandler[]
}
export interface MiddlewareRgistry {
  add: (route: string, priority: number, ...handlers: RequestHandler[]) => void
  global: (priority: number, ...handlers: RequestHandler[]) => void
  named: (route: string, priority: number, ...handlers: RequestHandler[]) => void
}

export class MiddlewareContainer implements MiddlewareProvider {
  #route2Middlewares = new Map<string, MiddlewareEntry[]>()
  #name2Middlewares = new Map<string, MiddlewareEntry[]>()
  #allRouteMiddlewares: MiddlewareEntry[] = []

  ofRoute(route: string): RequestHandler[] {
    const result: MiddlewareEntry[] = []
    const routeSpecific = this.#route2Middlewares.get(route)
    if (routeSpecific) {
      result.push(...routeSpecific)
    }
    if (this.#allRouteMiddlewares.length) {
      const all = this.#allRouteMiddlewares
      result.push(...all)
      result.sort((a, b) => {
        return a.priority - b.priority
      })
    }
    return result.map((entry) => entry.handler)
  }

  byName(route: string): RequestHandler[] {
    return this.#name2Middlewares.get(route)?.map((entry) => entry.handler) ?? []
  }

  add(route: string, priority: number, ...handlers: RequestHandler[]) {
    addInto(this.#route2Middlewares, route, priority, ...handlers)
  }

  global(priority: number, ...handlers: RequestHandler[]) {
    for (const handler of handlers) {
      this.#allRouteMiddlewares.push({
        handler,
        priority,
      })
    }
  }

  named(route: string, priority: number, ...handlers: RequestHandler[]) {
    addInto(this.#name2Middlewares, route, priority, ...handlers)
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