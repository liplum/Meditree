import { type FileType, type File } from "./file"
class M3u8File implements File {
  type: FileType
  path: string
  localPath: string
  constructor(type: FileType, localPath: string, path: string) {
    this.type = type
    this.localPath = localPath
    this.path = path
  }
}
