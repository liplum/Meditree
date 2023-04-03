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
    { name: "time", type: Number, defaultValue: 12, alias: "t" },
    { name: "ext", multiple: true, defaultValue: ["mp4"], alias: "x" },
    { name: "overwrite", type: Boolean, defaultValue: false, alias: "w" }
  ]
  const opt = commandLineArgs(genDef, { argv, stopAtFirstUnknown: true })
  const fileStat = fs.statSync(opt.path)
  if (fileStat.isFile()) {
    console.log(`processing on a file ${opt.path}`)
    convertVideo({
      filepath: opt.path,
      time: opt.time,
      overwrite: opt.overwrite,
    })
  } else if (fileStat.isDirectory()) {
    console.log(`processing on a folder ${opt.path}`)
    for (const filepath of visitFiles(opt.path, (f) => opt.ext.includes(removePrefix(path.extname(f), ".")))) {
      console.log(`processing on a file ${filepath}`)
      convertVideo({
        filepath,
        time: opt.time,
        overwrite: opt.overwrite,
      })
    }
  }
}

function removePrefix(str, prefix) {
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length)
  }
  return str
}
function convertVideo({ filepath, time, overwrite }) {
  const pureName = path.basename(filepath, path.extname(filepath))
  const parentDir = path.dirname(filepath)
  const outputDir = path.join(parentDir, pureName)
  if (fs.existsSync(outputDir) && !fs.statSync(outputDir).isDirectory()) {
    console.log(`${outputDir} exists but it's not a directory.`)
    process.exit(1)
  }
  const m3u8File = path.join(parentDir, `${pureName}.m3u8`)
  if (fs.existsSync(m3u8File) && fs.existsSync(outputDir) && !overwrite) {
    console.log(`${m3u8File} already exists.`)
    return
  }
  fs.mkdirSync(outputDir, { recursive: true })
  const bar = new ProgressBar(`:percent [:bar] ${filepath}`, {
    complete: "=",
    head: ">",
    incomplete: " ",
    width: 25,
    total: 100
  })
  new Ffmpeg(filepath)
    .outputOptions([
      '-c:v libx264', // video codec
      '-c:a aac', // audio codec
      '-hls_list_size 0', // maximum number of playlist entries (0 means unlimited)
    ])
    // segment duration (in seconds)
    .outputOptions("-hls_time", time)
    .outputOptions("-segment_list", encodeURI(`${pureName}/%d.ts`))
    // segment filename format
    .outputOptions("-hls_segment_filename", path.join(outputDir, "%d.ts"))
    .output(path.join(parentDir, `${pureName}.m3u8`))
    .on("progress", (progress) => {
      bar.update(progress.percent / 100)
    })
    .run()
}

function* visitFiles(parentDir, predicate) {
  for (const file of fs.readdirSync(parentDir, { withFileTypes: true })) {
    if (file.isFile()) {
      if (predicate(file.name)) {
        yield path.join(parentDir, file.name)
      }
    } else if (file.isDirectory()) {
      yield* visitFiles(path.join(parentDir, file.name), predicate)
    }
  }
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