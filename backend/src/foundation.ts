type Listener<T> = (value: T) => void
export class ListenableValue<T> {
  private _value: T
  private readonly listeners: Listener<T>[] = []

  constructor(value: T) {
    this._value = value
  }

  public get value(): T {
    return this._value
  }

  public set value(newValue: T) {
    if (newValue !== this._value) {
      this._value = newValue
      this.notifyListeners()
    }
  }

  public addListener(listener: Listener<T>): void {
    this.listeners.push(listener)
  }

  public removeListener(listener: Listener<T>): void {
    const index = this.listeners.indexOf(listener)
    if (index >= 0) {
      this.listeners.splice(index, 1)
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this._value)
    }
  }
}

export function listenable<T>(initial: T): ListenableValue<T> {
  return new ListenableValue<T>(initial)
}
