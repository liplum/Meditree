export function makeUrl(base: string, segments: Record<string, string>) {
  let url = base
  const entires = Object.entries(segments)
  for (let i = 0; i < entires.length; i++) {
    if (i != 0) url += "&"
    const e = entires[i];
    if (e[1] === undefined) continue
    url += `${e[0]}=${encodeURIComponent(e[1])}`
  }
  return url
}

export function removePrefix(str: string, prefix: string) {
  return str.startsWith(prefix) ? str.slice(prefix.length) : str
}

export function removeSuffix(str: string, suffix: string) {
  return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str
}

export function truncateString(str: string, maxLength: number) {
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str
}