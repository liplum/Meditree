import { DirectoryTags, FileTags } from "./tag"
/**
 * Represents a file.
 */
export interface FileInfo {
  /**
   * The content type of the file.
   * @example "image/png"
   */
  "*type": string

  /**
   * Tags associated with the file.
   */
  "*tag"?: FileTags

  /**
   * Determines whether the file is hidden.
   * @example true
   */
  "*hide"?: boolean

  /**
   * The size of the file in bytes.
   * @example 1024
   */
  size?: number
}

/**
 * Represents a directory.
 */
export interface DirectoryInfo {
  /**
   * Tags associated with the directory.
   * @example { "main": "index.m3u8" }
   */
  "*tag"?: DirectoryTags

  /**
   * Determines whether the directory is hidden.
   * @example true
   */
  "*hide"?: boolean

  /**
   * Holds files and sub-directories.
   * @example
   * ```json
   * {
   *   "file1": { "*type": "image/png", "size": 100 },
   *   "subdir": {
   *     "*tag": { "main": "file2" },
   *     "file2": { "*type": "application/pdf", "size": 150 }
   *   }
   * }
   * ```
   */
  [name: string]: FileInfo | DirectoryInfo | DirectoryInfo["*tag"] | DirectoryInfo["*hide"]
}
