import { createServer } from 'http'
//import { Video } from 'homestreaming-shared/src/model/video'
import { config } from './app.js';
import express from 'express';
const app = express()


export function startServer() {
  app.get('/', function (req, res) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json;charset=utf-8')
    res.send('Hello World')
  })
  
  app.listen(config.port, config.hostname)
  console.log(`Server running at http://${config.hostname}:${config.port}/`)
}

function onGetVideo(req, res) {

}