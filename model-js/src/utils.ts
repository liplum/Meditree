import type { FileInfo, DirectoryInfo } from "./model.js"

export function parseFile(fso: FileInfo | DirectoryInfo): FileInfo | undefined {
  if (typeof fso["*type"] === "string") return fso as FileInfo
  else return
}

export function parseDirectory(fso: FileInfo | DirectoryInfo): DirectoryInfo | undefined {
  if (fso["*type"] === undefined) return fso as DirectoryInfo
  else return
}

export function isFile(fso: FileInfo | DirectoryInfo): fso is FileInfo {
  if (typeof fso["*type"] === "string") return true
  else return false
}

export function isDirectory(fso: FileInfo | DirectoryInfo): fso is DirectoryInfo {
  if (fso["*type"] === undefined) return true
  else return false
}

/**
 * ## Usage
 * ```js
 * for (const [name, file] of extractFromDirectory(Object.entries(directory))){
 *  //...
 * }
 * ```
 * 
 * @param tree the entires of {@link DirectoryInfo}.
 */
export function* extractFromDirectory(
  tree: Iterable<[string, DirectoryInfo[keyof DirectoryInfo]]>
): Iterable<[string, FileInfo | DirectoryInfo]> {
  for (const entry of tree) {
    if (entry[0] === "*hide" || entry[0] === "*tag") {
      continue
    }
    yield entry as [string, FileInfo | DirectoryInfo]
  }
}