
import fs from "fs"
import { extname, dirname, basename, join } from "path"
import Ffmpeg from "fluent-ffmpeg"
import ProgressBar from "progress"

export async function convertVideo2M3u8({ videoPath, time, overwrite, destDir }) {
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

export async function fetchTextFile(url) {
  const res = await fetch(url)
  return await res.text()
}

export function convertRelativeUrlsToAbsolute({ playlistUrl, content }) {
  const baseUrl = new URL(playlistUrl)
  const lines = content.trim().split("\n")
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

export function extractTsFileUrlListFromText(content) {
  const lines = content.trim().split("\n")
  const result = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith("#")) {
      result.push(line)
    }
  }
  return result
}
