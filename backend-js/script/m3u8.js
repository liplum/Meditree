import https from "https"
import fs from "fs"
import commandLineArgs from "command-line-args"
import { extname, dirname, basename, join } from "path"
import Ffmpeg from "fluent-ffmpeg"
import ProgressBar from "progress"
import { promisify } from "util"

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

const mainDef = [
  { name: "cmd", defaultOption: true }
]
const mainCmd = commandLineArgs(mainDef, { stopAtFirstUnknown: true })
let argv = mainCmd._unknown || []

if (mainCmd.cmd === "get") {
  const randomFileName = `${(new Date).getTime()}.m3u8`
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
    outputPath = join(outputPath, randomFileName)
  }
  if (extname(outputPath) !== ".m3u8") {
    outputPath = `${outputPath}.m3u8`
  }
  await writeFile(outputPath, converted)
} else if (mainCmd.cmd === "gen") {
  const genDef = [
    { name: "path", defaultOption: true, alias: "p" },
    { name: "time", type: Number, defaultValue: 5, alias: "t" },
    { name: "ext", multiple: true, defaultValue: ["mp4"], alias: "x" },
    { name: "overwrite", type: Boolean, defaultValue: false, alias: "w" },
    { name: "dest", alias: "d" },
  ]
  const opt = commandLineArgs(genDef, { argv, stopAtFirstUnknown: true })
  const ext = opt.ext.map(e => e.toLocaleLowerCase())
  await processOnFileTree(opt.path,
    (filepath) => ext.includes(removePrefix(extname(filepath).toLocaleLowerCase(), ".")),
    async (filepath) => {
      await convertVideo({
        videoPath: filepath,
        time: opt.time,
        overwrite: opt.overwrite,
        destDir: opt.dest,
      })
    })
}

async function processOnFileTree(fileOrDirPath, filter, task) {
  filter ??= () => true
  const fileStat = fs.statSync(fileOrDirPath)
  if (fileStat.isFile()) {
    await task(fileOrDirPath)
  } else if (fileStat.isDirectory()) {
    for (const filepath of visitFiles(fileOrDirPath, filter)) {
      await task(filepath)
    }
  }
}

function removePrefix(str, prefix) {
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length)
  }
  return str
}

async function convertVideo({ videoPath, time, overwrite, destDir }) {
  if (!destDir) {
    destDir = dirname(videoPath)
  }
  const pureName = basename(videoPath, extname(videoPath)).trim()
  const outputDir = join(destDir, pureName)
  return new Promise((resolve, reject) => {
    if (fs.existsSync(outputDir) && !fs.statSync(outputDir).isDirectory()) {
      reject(new Error(`"${outputDir}" exists but it's not a directory.`))
    }
    const m3u8File = join(outputDir, "index.m3u8")
    if (fs.existsSync(m3u8File) && fs.existsSync(outputDir) && !overwrite) {
      console.log(`"${m3u8File}" already exists.`)
      resolve(false)
      return
    }
    fs.mkdirSync(outputDir, { recursive: true })
    const bar = new ProgressBar(`:percent [:bar] "${videoPath}"`, {
      complete: "=",
      head: ">",
      incomplete: " ",
      width: 25,
      total: 100
    })
    new Ffmpeg(videoPath)
      .outputOptions([
        '-c:v libx264', // video codec
        '-c:a aac', // audio codec
        '-hls_list_size 0', // maximum number of playlist entries (0 means unlimited)
      ])
      .outputOptions("-segment_list_flags", "cache")
      // segment duration (in seconds)
      .outputOptions("-hls_time", time)
      // segment filename format
      .outputOptions("-hls_segment_filename", join(outputDir, "%d.ts"))
      .output(m3u8File)
      .on("progress", (progress) => {
        bar.update(progress.percent / 100)
      })
      .on("end", () => {
        bar.update(1)
        console.log(`"${m3u8File}" is done.`)
        resolve(true)
      })
      .on("error", (error) => {
        reject(error)
      })
      .run()
  })
}

function* visitFiles(parentDir, predicate) {
  for (const file of fs.readdirSync(parentDir, { withFileTypes: true })) {
    if (file.isFile()) {
      if (predicate(file.name)) {
        yield join(parentDir, file.name)
      }
    } else if (file.isDirectory()) {
      yield* visitFiles(join(parentDir, file.name), predicate)
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