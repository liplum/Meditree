import msOf from "ms"
import bytes from "bytes"

export function parseTime(
  ms: string | number | undefined,
  _default?: string | number
): number {
  if (typeof ms === "number") {
    return ms
  } else if (typeof ms === "string") {
    return msOf(ms)
  }
  if (typeof _default === "number") {
    return _default
  } else if (typeof _default === "string") {
    return msOf(_default)
  }
  return 0
}

export function parseBytes(
  value: string | number | undefined,
  _default?: string | number
): number {
  if (value !== undefined) {
    const result = bytes.parse(value)
    if (result !== null) {
      return result
    }
  }
  if (_default !== undefined) {
    return bytes.parse(_default)
  }
  return 0
}
