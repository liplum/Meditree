import * as fs from 'fs';

enum FileType {
  local = "local"
}

class File {
  type: FileType
  path: String
  constructor(type: FileType, path: String) {
    this.type = type
    this.path = path
  }
  static local(path: String): File {
    return new File(FileType.local, path)
  }
}