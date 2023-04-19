export const NOCACHE = Symbol("NOCACHE")
export const NOPLUGINS = Symbol("NOPLUGINS")

export const stringifyToken = (token: MaybeToken): string =>
  !isSymbol(token) ? `Token(${token.type.toString()})` : token.toString()

export const getType = (token: MaybeToken): symbol => (!isSymbol(token) ? token.type : token)

export const isSymbol = (t: unknown): t is symbol => typeof t === "symbol"

export const valueOrArrayToArray = (smt: symbol[] | symbol): symbol[] => (isSymbol(smt) ? [smt] : smt)

// container
export type Injected<T> = Factory<T> | Value<T>
export interface Item<T> {
  injected?: Injected<T>
  cache?: T
  singleton?: boolean
  plugins: Plugin<T>[]
}

export type Plugin<Dependency = unknown> = (
  dependency: Dependency,
  target: unknown,
  tags: symbol[],
  token: MaybeToken<Dependency>,
  container: Container,
) => void

export type NewAble<T> = new (...ctorArgs: any[]) => T

export type Factory<T, U extends Array<unknown> = any> = (...factoryArgs: U) => T
export type Value<T> = T

// tokens
export type MaybeToken<T = unknown, U extends Array<unknown> = unknown[]> = Token<T, U> | symbol

declare const typeMarker: unique symbol
declare const bindedArguments: unique symbol
export interface Token<T, U extends Array<unknown>> {
  type: symbol
  [typeMarker]: T
  [bindedArguments]: U
}

export function token<T, U extends Array<unknown> = unknown[]>(name: string): Token<T, U> {
  return { type: Symbol(name) } as any as Token<T, U>
}

export class Bind<T, U extends Array<unknown>> {
  constructor(private readonly _target: Item<T>) { }

  to<O extends NewAble<T>>(Clz: O): Options<T> {
    this._target.injected = (...ctorArgs: U): T => new Clz(...ctorArgs)
    return new Options<T>(this._target)
  }

  toFactory(factory: Factory<T, U>): Options<T> {
    this._target.injected = factory
    return new Options<T>(this._target)
  }

  toValue(value: Value<T>): PluginOptions<T> {
    if (typeof value === "undefined") {
      throw new Error("cannot bind a value of type undefined")
    }
    this._target.injected = value
    return new PluginOptions<T>(this._target)
  }
}
export class PluginOptions<T> {
  constructor(protected _target: Item<T>) { }

  withPlugin(plugin: Plugin<T>): PluginOptions<T> {
    this._target.plugins.push(plugin)
    return this
  }
}
export class Options<T> extends PluginOptions<T> {
  inSingletonScope(): PluginOptions<T> {
    this._target.singleton = true
    return this
  }
}

const isFactory = <T>(i: Injected<T>): i is Factory<T> => typeof i === "function"

export class Container {
  private _registry = new Map<symbol, Item<unknown>>()
  private readonly _snapshots: typeof this._registry[] = []
  private readonly _plugins: Plugin[] = []

  bind<T = never, U extends Array<unknown> = never>(token: MaybeToken<T>): Bind<T, U> {
    return new Bind<T, U>(this._createItem<T>(token))
  }

  rebind<T = never, U extends Array<unknown> = never>(token: MaybeToken<T>): Bind<T, U> {
    return this.remove(token).bind<T, U>(token)
  }

  remove(token: MaybeToken): Container {
    if (this._registry.get(getType(token)) === undefined) {
      throw new Error(`${stringifyToken(token)} was never bound`)
    }

    this._registry.delete(getType(token))

    return this
  }

  get<T, U extends Array<unknown> = never>(
    token: Token<T, U> | MaybeToken<T>,
    tags: symbol[] | symbol = [],
    target?: unknown,
    injectedArgs: Array<unknown> = [],
  ): T {
    const item = this._registry.get(getType(token)) as Item<T> | undefined

    if (item === undefined || item.injected === undefined) {
      throw new Error(`nothing bound to ${stringifyToken(token)}`)
    }
    let value: T
    if (isFactory(item.injected)) {
      if (!item.singleton) {
        value = item.injected(...injectedArgs)
      } else {
        value = (item.cache = item.cache ?? item.injected())
      }
    } else {
      value = item.injected
    }
    const tagsArr = valueOrArrayToArray(tags)

    if (!tagsArr.includes(NOPLUGINS)) {
      item.plugins.concat(this._plugins).forEach((plugin) => {
        plugin(value, target, tagsArr, token, this)
      })
    }

    return value
  }

  addPlugin(plugin: Plugin): Container {
    this._plugins.push(plugin)
    return this
  }

  snapshot(): Container {
    this._snapshots.push(new Map(this._registry))
    return this
  }

  restore(): Container {
    this._registry = this._snapshots.pop() ?? this._registry
    return this
  }

  /* Item related */
  private _createItem<T>(token: MaybeToken<T>): Item<T> {
    if (this._registry.get(getType(token)) !== undefined) {
      throw new Error(`object can only bound once: ${stringifyToken(token)}`)
    }

    const item = { plugins: [] }
    this._registry.set(getType(token), item)

    return item
  }
}
export function createDecorator(container: Container) {
  return <T, K extends Array<unknown>>(
    token: Token<T, K> | MaybeToken<T>,
    tags: symbol[] | symbol = [],
    ...injectedArgs: K
  ) => {
    return function <Target extends { [key in Prop]: T }, Prop extends keyof Target>(
      target: Target,
      property: Prop,
    ): void {
      define(target, property, container, token, tags, ...injectedArgs)
    }
  }
}

export function createWire(container: Container) {
  return <Value, Target extends { [key in Prop]: Value }, Prop extends keyof Target, K extends Array<unknown>>(
    target: Target,
    property: Prop,
    token: Token<Value, K> | MaybeToken<Value>,
    tags: symbol[] | symbol = [],
    ...injectedArgs: K
  ) => {
    define(target, property, container, token, tags, ...injectedArgs)
  }
}

export function createResolve(container: Container) {
  return <T, U extends Array<unknown>>(token: Token<T, U> | MaybeToken<T>, tags: symbol[] | symbol = []) => {
    let value: T
    return function <R>(this: R, ...injectedArgs: U): T {
      if (valueOrArrayToArray(tags).includes(NOCACHE) || value === undefined) {
        value = container.get(token, tags, this, injectedArgs)
      }
      return value
    }
  }
}

export function define<T, Target extends { [key in Prop]: T }, Prop extends keyof Target, K extends Array<unknown>>(
  target: Target,
  property: Prop,
  container: Container,
  token: Token<T, K> | MaybeToken<T>,
  tags: symbol[] | symbol,
  ...injectedArgs: K
): void {
  Object.defineProperty(target, property, {
    get: function <R>(this: R): T {
      const value = container.get(token, tags, this, injectedArgs)
      if (!valueOrArrayToArray(tags).includes(NOCACHE)) {
        Object.defineProperty(this, property, {
          value,
          enumerable: true,
        })
      }
      return value
    },
    configurable: true,
    enumerable: true,
  })
}
