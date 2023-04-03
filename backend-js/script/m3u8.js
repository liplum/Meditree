import https from "https"
import fs from "fs"
import commandLineArgs from "command-line-args"
import path from "path"

let mainDef = [
  { name: "cmd", defaultOption: true }
]
const mainCmd = commandLineArgs(mainDef, { stopAtFirstUnknown: true })
let argv = mainCmd._unknown || []

if (mainCmd.cmd === "get") {
  const randomFileName = `${Math.random()}.m3u8`
  const getDef = [
    { name: "url", defaultOption: true },
    { name: "output", defaultValue: randomFileName, alias: "o" },
    { name: "abs", defaultValue: true, type: Boolean }
  ]
  const getOptions = commandLineArgs(getDef, { argv, stopAtFirstUnknown: true })
  const url = getOptions.url
  const converted = getOptions.abs
    ? await convertRelativeUrlsToAbsolute(url)
    : await fetchTextFile(url)
  let outputPath = getOptions.output
  if (fs.statSync(outputPath).isDirectory()) {
    outputPath = path.join(outputPath, randomFileName)
  }
  if (path.extname(outputPath) !== ".m3u8") {
    outputPath = `${outputPath}.m3u8`
  }
  fs.writeFileSync(outputPath, converted)
}

async function fetchTextFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = ""
      response.on("data", (chunk) => { data += chunk })
      response.on("end", () => { resolve(data) })
    }).on("error", (error) => { reject(error) });
  });
}

async function convertRelativeUrlsToAbsolute(playlistUrl) {
  const text = await fetchTextFile(playlistUrl)
  const baseUrl = new URL(playlistUrl)
  const lines = text.trim().split("\n")
  const result = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith("#")) {
      result.push(line)
    } else {
      const url = new URL(line, baseUrl)
      result.push(url.toString())
    }
  }
  return result.join("\n")
}