export function makeUrl(base, segments) {
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

export function removePrefix(str, prefix) {
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length);
  }
  return str;
}

export function removeSuffix(str, suffix) {
  if (str.endsWith(suffix)) {
    return str.slice(0, -suffix.length);
  }
  return str;
}