import msOf from "ms"

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
