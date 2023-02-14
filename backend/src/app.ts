import { createServer } from 'http'
import { Video } from 'homecasting-shared/model/video'
import * as fs from 'fs'

var config = {
  hostname: '127.0.0.1',
  port: 53552,
}
import * as path from 'path';
import { fileURLToPath } from 'url';
const configFileName = "homecasting-config.json"
function findConfig() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  let curDir = path.dirname(__dirname)
  let configFile: string | null = findFileInFileTree(curDir, configFileName)
  if (configFile == null) {
    configFile = path.join(curDir, configFileName)
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  }
  let rawdata = fs.readFileSync(configFile).toString();
  config = JSON.parse(rawdata);
}

function findFileInFileTree(dir: string, fileName: string): string | null {
  let lastDir: string | null = null
  while (dir != lastDir) {
    const configFile = path.join(dir, fileName)
    if (fs.existsSync(configFile)) {
      return configFile
    } else {
      lastDir = dir
      dir = path.dirname(dir)
    }
  }
  return null
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
findConfig()
startServer()