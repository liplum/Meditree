export interface FileInfo {
  "*type": string
  "*tag"?: Record<string, number | string | boolean>
  "*hide"?: boolean
  size?: number
}

export interface DirectoryInfo {
  "*tag"?: Record<string, number | string | boolean>
  "*hide"?: boolean
  [name: string]: FileInfo | DirectoryInfo | DirectoryInfo["*tag"] | DirectoryInfo["*hide"]
}
