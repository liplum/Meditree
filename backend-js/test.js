import express from 'express'

const app = express()
app.use(express.static('.'))
const port = 1919
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${port}/.`)
})