import { createServer } from 'http'
import { HostTree } from './host.js'
import { config } from './app.js';
import express from 'express';


export async function startServer() {
  const tree = new HostTree({
    root: config.root,
    allowedFileExtensions: config.allowedFileExtensions,
    fileTypePattern: config.fileTypePattern,
  })
  tree.startWatching()
  await tree.rebuildFileTree()
  const app = express()

  app.get("/list", function (req, res) {
    res.status(200)
    res.contentType("application/json;charset=utf-8")
    res.send(tree.getJsonString())
  })

  app.get("/file",function (req, res) {
    console.log(req)
    console.log(res)
  })

  app.listen(config.port, config.hostname)
  console.log(`Server running at http://${config.hostname}:${config.port}/`)
}

function onGetVideo(req, res) {

}

function supportedClassifier() {

}