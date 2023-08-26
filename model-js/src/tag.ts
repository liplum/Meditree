export type Tags = Record<string, number | string | boolean>

/**
 * Enum representing tags for files.
 */
export const enum FileTag {

}

/**
 * Enum representing tags for directories.
 */
export const enum DirectoryTag {
  main = "main",
}

/**
 * Represents tags associated with a file.
 */
export interface FileTags extends Partial<Tags> {
}

/**
 * Represents tags associated with a directory.
 */
export interface DirectoryTags extends Partial<Tags> {
  [DirectoryTag.main]?: string
}