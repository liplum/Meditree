import fs from 'fs';
class File {
  constructor(fileType, fileName) {
    this.fileType = fileType
    this.fileName = fileName
  }
  static local(fileName){
    return new File('local',fileName)
  }
}