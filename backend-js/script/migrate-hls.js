// migrate from the old `hls` file structure.

import fs from "fs"
import path from "path"
const folder = process.argv[2]
if (!fs.statSync(folder).isDirectory()) {
  process.exit(1)
}

convert(folder)

function convert(folder) {
  const files = fs.readdirSync(folder)
  for (const fileName of files) {
    const fullPath = path.join(folder, fileName)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      convert(fullPath)
    } else if (stat.isFile()) {
      const correctPath = path.join(folder, "index.m3u8")
      if (fileName !== "index.m3u8" && path.extname(fileName) === ".m3u8") {
        fs.renameSync(fullPath, correctPath)
      }
      const folderName = encodeURIComponent(path.basename(folder))
      fixM3u8(correctPath, `${folderName}/`)
    }
  }
}

function fixM3u8(filePath, content2Remove) {
  const content = fs.readFileSync(filePath, "utf-8")
  const newContent = content.replace(content2Remove, "")
  fs.writeFileSync(filePath, newContent)
}
