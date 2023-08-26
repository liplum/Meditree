import type { FileInfo, DirectoryInfo } from "./model.js"

export function parseFile(fso: FileInfo | DirectoryInfo): FileInfo | undefined {
  if (typeof fso["*type"] === "string") return fso as FileInfo
  else return
}

export function parseDirectory(fso: FileInfo | DirectoryInfo): DirectoryInfo | undefined {
  if (fso["*type"] === undefined) return fso as DirectoryInfo
  else return
}