import { createServer } from 'http'
import { Video } from 'homestreaming-shared/src/model/video'
import * as fs from 'fs'
import { HostTree } from './host.js'
import { FileTree, findFileInFileTree } from './file.js'
var config = {
  hostname: '127.0.0.1',
  port: 53552,
  root: ".",
  allowedFileExtensions: [
    ".mp3", ".avi"
  ]
}
import * as path from 'path'
import { fileURLToPath } from 'url'
const configFileName = "homestreaming-config.json"
function findConfig() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  let curDir = path.dirname(__dirname)
  let configFile: string | null = findFileInFileTree(curDir, configFileName)
  if (configFile == null) {
    configFile = path.join(curDir, configFileName)
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
    throw new Error(`Configuration not found. ${configFile} is created.`)
  }
  const rawdata = fs.readFileSync(configFile).toString()
  const configObj = JSON.parse(rawdata)
  config = Object.assign({}, config, configObj)
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
}

function startServer() {
  const server = createServer((req, res) => {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain')
    res.end('Hello World\n')
  });

  server.listen(config.port, config.hostname, () => {
    console.log(`Server running at http://${config.hostname}:${config.port}/`)
  });
}
function filterByExtension(filePath: string) {
  return config.allowedFileExtensions.includes(path.extname(filePath).toLowerCase())
}
async function hostLocalFile() {
  const tree = new HostTree(config.root,config.allowedFileExtensions)
  tree.startWatching()
}
findConfig()
hostLocalFile()
//startServer()