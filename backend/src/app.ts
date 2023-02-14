import { createServer } from 'http'
import { Video } from 'homecasting-shared/model/video'
const hostname = '127.0.0.1'
const port = 53552

const server = createServer((req, res) => {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain')
  res.end('Hello World\n')
});


server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`)
});
