import https from "https"
import fs from "fs"
import commandLineArgs from "command-line-args"
import path from "path"
import Ffmpeg from "fluent-ffmpeg"
import ProgressBar from "progress"

const mainDef = [
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
  const opt = commandLineArgs(getDef, { argv, stopAtFirstUnknown: true })
  const url = opt.url
  const converted = opt.abs
    ? await convertRelativeUrlsToAbsolute(url)
    : await fetchTextFile(url)
  let outputPath = opt.output
  if (fs.statSync(outputPath).isDirectory()) {
    outputPath = path.join(outputPath, randomFileName)
  }
  if (path.extname(outputPath) !== ".m3u8") {
    outputPath = `${outputPath}.m3u8`
  }
  fs.writeFileSync(outputPath, converted)
} else if (mainCmd.cmd === "gen") {
  const genDef = [
    { name: "path", defaultOption: true },
  ]
  const opt = commandLineArgs(genDef, { argv, stopAtFirstUnknown: true })
  if (!fs.statSync(opt.path).isFile()) {
    console.log(`${opt.path} file not found.`)
    process.exit(1)
  }
  const pureName = path.basename(opt.path, path.extname(opt.path))
  const parentDir = path.dirname(opt.path)
  const outputDir = path.join(parentDir, pureName)
  if (fs.existsSync(outputDir) && !fs.statSync(outputDir).isDirectory()) {
    console.log(`${outputDir} exists but it's not a directory.`)
    process.exit(1)
  }
  fs.mkdirSync(outputDir, { recursive: true })
  const bar = new ProgressBar("converting [:bar] :percent", {
    complete: "=",
    head: ">",
    incomplete: " ",
    width: 20,
    total: 100
  });
  new Ffmpeg(opt.path)
    .outputOptions([
      '-c:v libx264', // video codec
      '-c:a aac', // audio codec
      '-hls_time 12', // segment duration (in seconds)
      '-hls_list_size 0', // maximum number of playlist entries (0 means unlimited)
    ])
    .outputOptions("-segment_list_entry", `${pureName}/%d.ts`)
    // segment filename format
    .outputOptions("-hls_segment_filename", path.join(outputDir, "%d.ts"))
    .output(path.join(parentDir, `${pureName}.m3u8`))
    .on("progress", (progress) => {
      bar.update(progress.percent / 100)
    })
    .run()
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