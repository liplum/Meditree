export class ListenableValue {
    _value;
    listeners = [];
    constructor(value) {
        this._value = value;
    }
    get value() {
        return this._value;
    }
    set value(newValue) {
        if (newValue !== this._value) {
            this._value = newValue;
            this.notifyListeners();
        }
    }
    addListener(listener) {
        this.listeners.push(listener);
    }
    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index >= 0) {
            this.listeners.splice(index, 1);
        }
    }
    notifyListeners() {
        for (const listener of this.listeners) {
            listener(this._value);
        }
    }
}
export function listenable(initial) {
    return new ListenableValue(initial);
}
export function shallowEqual(obj1, obj2) {
    if (Object.keys(obj1).length !== Object.keys(obj2).length) {
        return false;
    }
    for (const prop in obj1) {
        if (obj1[prop] !== obj2[prop]) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=foundation.js.map