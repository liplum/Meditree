// learnt from https://github.com/owja/ioc
export type Factory<R, TArgs extends any[] = any[]> = (...factoryArgs: TArgs) => R
export type Constructor<R, TArgs extends any[] = any[]> = new (...ctorArgs: TArgs) => R
// container
export type Injected<R, TArgs extends any[] = any[]> = R | Factory<R, TArgs> | Constructor<R, TArgs>

const enum ItemType {
  value, factory, class
}

export interface Item<T> {
  injected?: Injected<T>
  cache?: T
  singleton?: boolean
  type?: ItemType
}
export function getType(token: Token<any, any> | symbol): symbol {
  return typeof token === "symbol" ? token : token.type
}
// tokens
// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
export interface Token<T, U extends any[]> {
  type: symbol
}

export function token<T, U extends any[] = any[]>(name: string): Token<T, U> {
  return { type: Symbol(name) } satisfies Token<T, U>
}

export function uniqueToken<T, U extends any[] = any[]>(name: string): Token<T, U> {
  return { type: Symbol.for(name) } as any as Token<T, U>
}

function stringifyToken(token: Token<any, any> | symbol): string {
  return typeof token === "symbol" ? token.toString() : `Token(${token.type.toString()})`
}

export class Bind<T, U extends any[]> {
  constructor(private readonly _target: Item<T>) { }

  toClass<TClz extends Constructor<T>>(Clz: TClz): this {
    this._target.injected = Clz
    this._target.type = ItemType.class
    return this
  }

  toFactory(factory: Factory<T, U>): this {
    this._target.injected = factory
    this._target.type = ItemType.factory
    return this
  }

  toValue(value: T): this {
    if (typeof value === "undefined") {
      throw new Error("cannot bind a value to undefined")
    }
    this._target.injected = value
    this._target.type = ItemType.value
    return this
  }

  asSingleton(): this {
    this._target.singleton = true
    return this
  }
}

export class Container {
  private registry = new Map<symbol, Item<any>>()
  private readonly snapshots: typeof this.registry[] = []

  bind<T = never, U extends any[] = any[]>(token: Token<T, U> | symbol): Bind<T, U> {
    return new Bind<T, U>(this._createItem<T, U>(token))
  }

  rebind<T = never, U extends any[] = any[]>(token: Token<T, U> | symbol): Bind<T, U> {
    return this.remove(token).bind<T, U>(token)
  }

  remove(token: Token<any, any> | symbol): this {
    if (this.registry.get(getType(token)) === undefined) {
      return this
    }
    this.registry.delete(getType(token))
    return this
  }

  get<T, U extends any[] = any[]>(
    token: Token<T, U> | symbol,
    ...injectedArgs: U
  ): T {
    const item = this.registry.get(getType(token)) as Item<T> | undefined

    if (item === undefined || item.injected === undefined || item.type === undefined) {
      throw new Error(`nothing bound to ${stringifyToken(token)}`)
    }
    if (item.type === ItemType.value) {
      return item.injected as T
    } else if (item.type === ItemType.factory) {
      const factory = item.injected as Factory<T, U>
      if (item.singleton) {
        return (item.cache = item.cache ?? factory(...injectedArgs))
      } else {
        return factory(...injectedArgs)
      }
    } else {
      const Ctor = item.injected as Constructor<T, U>
      if (item.singleton) {
        return (item.cache = item.cache ?? new Ctor(...injectedArgs))
      } else {
        return new Ctor(...injectedArgs)
      }
    }
  }

  snapshot(): Container {
    this.snapshots.push(new Map(this.registry))
    return this
  }

  restore(): Container {
    this.registry = this.snapshots.pop() ?? this.registry
    return this
  }

  /* Item related */
  private _createItem<T, U extends any[] = any[]>(token: Token<T, U> | symbol): Item<T> {
    if (this.registry.get(getType(token)) !== undefined) {
      throw new Error(`object can only bound once: ${stringifyToken(token)}`)
    }

    const item = {}
    this.registry.set(getType(token), item)
    return item
  }
}

export function createDecorator(container: Container) {
  return <R, TArgs extends any[]>(
    token: Token<R, TArgs> | symbol,
    ...injectedArgs: TArgs
  ) => {
    return function <Target extends { [key in Prop]: R }, Prop extends keyof Target>(
      target: Target,
      property: Prop,
    ): void {
      define(target, property, container, token, ...injectedArgs)
    }
  }
}

export function createWire(container: Container) {
  return <Value, Target extends { [key in Prop]: Value }, Prop extends keyof Target, K extends Array<unknown>>(
    target: Target,
    property: Prop,
    token: Token<Value, K> | symbol,
    ...injectedArgs: K
  ) => {
    define(target, property, container, token, ...injectedArgs)
  }
}

export function createResolve(container: Container) {
  return <T, U extends any[]>(token: Token<T, U> | symbol) => {
    let value: T
    return function <R>(this: R, ...injectedArgs: U): T {
      if (value === undefined) {
        value = container.get(token, ...injectedArgs)
      }
      return value
    }
  }
}

export function define<T, Target extends { [key in Prop]: T }, Prop extends keyof Target, K extends Array<unknown>>(
  target: Target,
  property: Prop,
  container: Container,
  token: Token<T, K> | symbol,
  ...injectedArgs: K
): void {
  Object.defineProperty(target, property, {
    get: function <R>(this: R): T {
      const value = container.get(token, ...injectedArgs)
      Object.defineProperty(this, property, {
        value,
        enumerable: true,
      })
      return value
    },
    configurable: true,
    enumerable: true,
  })
}
