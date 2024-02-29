export function* visitFiles(parentDir, predicate) {
  for (const file of fs.readdirSync(parentDir, { withFileTypes: true })) {
    if (file.isFile()) {
      if (predicate(file.name)) {
        yield join(parentDir, file.name)
      }
    } else if (file.isDirectory()) {
      yield* visitFiles(join(parentDir, file.name), predicate)
    }
  }
}

export async function processOnFileTree(fileOrDirPath, filter, task) {
  filter ??= () => true
  const fileStat = fs.statSync(fileOrDirPath)
  if (fileStat.isFile()) {
    await task(fileOrDirPath)
  } else if (fileStat.isDirectory()) {
    for (const filepath of visitFiles(fileOrDirPath, filter)) {
      await task(filepath)
    }
  }
}

export function removePrefix(str, prefix) {
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length)
  }
  return str
}
 