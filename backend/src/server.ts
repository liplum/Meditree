import { createServer } from 'http'
import { HostTree } from './host.js'
//import { Video } from 'homestreaming-shared/src/model/video'
import { config } from './app.js';
import express from 'express';


export async function startServer() {
  const tree = new HostTree(config.root, config.allowedFileExtensions)
  tree.startWatching()
  await tree.rebuildFileTree()
  const app = express()
  app.get('/', function (req, res) {
    res.status(200)
    res.setHeader('Content-Type', 'text/plain;charset=utf-8')
    res.send('Hello World')
  })

  app.get("/list", function (req, res) {
    res.status(200)
    res.setHeader('Content-Type', 'application/json;charset=utf-8')
    res.send(tree.getJsonString())
  })

  app.listen(config.port, config.hostname)
  console.log(`Server running at http://${config.hostname}:${config.port}/`)
}

function onGetVideo(req, res) {

}