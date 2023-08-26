import type { FileInfo, DirectoryInfo } from "./model.js"

/**
 * Parses the given object as a file.
 *
 * @param fso The object to parse as a file.
 * @returns The parsed file information or undefined.
 */
export function parseFile(fso: FileInfo | DirectoryInfo): FileInfo | undefined {
  if (typeof fso["*type"] === "string") return fso as FileInfo
  else return
}

/**
 * Parses the given object as a directory.
 *
 * @param fso The object to parse as a directory.
 * @returns The parsed directory information or undefined.
 */
export function parseDirectory(fso: FileInfo | DirectoryInfo): DirectoryInfo | undefined {
  if (fso["*type"] === undefined) return fso as DirectoryInfo
  else return
}

/**
 * Checks if the given object is a file.
 *
 * @param fso The object to check.
 * @returns True if the object is a file, false otherwise.
 */
export function isFile(fso: FileInfo | DirectoryInfo): fso is FileInfo {
  if (typeof fso["*type"] === "string") return true
  else return false
}

/**
 * Checks if the given object is a directory.
 *
 * @param fso The object to check.
 * @returns True if the object is a directory, false otherwise.
 */
export function isDirectory(fso: FileInfo | DirectoryInfo): fso is DirectoryInfo {
  if (fso["*type"] === undefined) return true
  else return false
}

/**
 * Extracts file and directory entries from a directory tree, excluding metadata.
 *
 * This function takes an iterable of directory entries and yields the extracted entries
 * as tuples containing the name of the entry and its associated information (either a
 * FileInfo or DirectoryInfo).
 *
 * @example
 * ```ts
 * const directory: DirectoryInfo = {
 *   "*tag": { main: "my-directory" },
 *   "file1": { "*type": "file", size: 100 },
 *   "subdir": {
 *     "*tag": { main: "sub-directory" },
 *     "file2": { "*type": "file", size: 150 },
 *   },
 * }
 *
 * for (const [name, entry] of extractFromDirectory(Object.entries(directory))) {
 *   if (isFile(entry)) {
 *     console.log("${name} is File")
 *   } else if (isDirectory(entry)) {
 *     console.log("${name} is Directory")
 *   }
 * }
 * ```
 *
 * @param tree The entries of a DirectoryInfo object.
 * @yields A tuple containing the name of the entry and its associated information.
 */
export function* extractFromDirectory(
  tree: Iterable<[string, DirectoryInfo[keyof DirectoryInfo]]>
): Iterable<[name: string, file: FileInfo | DirectoryInfo]> {
  for (const entry of tree) {
    if (entry[0] === "*hide" || entry[0] === "*tag") {
      continue
    }
    yield entry as [string, FileInfo | DirectoryInfo]
  }
}