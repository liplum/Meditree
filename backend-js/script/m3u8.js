import fs from "fs"
import { extname, join } from "path"
import { promisify } from "util"
import { removePrefix, processOnFileTree } from "./utils.js"
import esMain from "es-main"
import { cli } from '@liplum/cli'
import {
  convertRelativeUrlsToAbsolute,
  fetchTextFile,
  convertVideo2M3u8,
  extractTsFileUrlListFromText,
} from "./lib/m3u8.js"

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

async function main(argv) {
  const args = cli({
    name: "",
    description: "",
    commands: [{
      name: 'get-m3u8',
      description: '',
      examples: ['',],
      require: ['url'],
      options: [{
        name: 'url',
        alias: "u",
        defaultOption: true,
        description: ''
      }, {
        name: 'output',
        alias: "o",
        defaultValue: `${(new Date).getTime()}.m3u8`,
        description: ''
      }, {
        name: 'abs',
        type: Boolean,
        defaultValue: true,
        description: ''
      },],
    }, {
      name: 'get-ts',
      description: '',
      examples: ['',],
      require: [['path', 'url']],
      options: [{
        name: 'url',
        alias: "u",
        description: ''
      }, {
        name: 'path',
        alias: "p",
        description: '',
      }, {
        name: 'output',
        alias: "o",
        defaultValue: `${(new Date).getTime()}`,
        description: ''
      },],
    }, {
      name: 'gen',
      description: '',
      examples: ['',],
      require: ['path'],
      options: [{
        name: 'path',
        alias: "p",
        defaultOption: true,
        description: '',
      }, {
        name: 'time',
        alias: "t",
        defaultValue: 5,
        type: Number,
        defaultOption: true,
        description: '',
      }, {
        name: 'ext',
        alias: "x",
        multiple: true,
        defaultValue: ["mp4"],
        defaultOption: true,
        description: '',
      }, {
        name: 'overwrite',
        type: Boolean,
        defaultValue: false,
        alias: "w",
        description: '',
      }, {
        name: 'dest',
        alias: "d",
        description: '',
      }],
    },]
  }, { argv })

  switch (args._command) {
    case "get-m3u8":
      await getM3u8(args)
      break
    case "get-ts":
      await getTs(args)
      break
    case "gen":
      await gen(args)
      break
  }
}

async function getM3u8(args) {
  const content = await fetchTextFile(args.url)
  const convertedContent = args.abs
    ? convertRelativeUrlsToAbsolute({ playlistUrl: args.url, content })
    : content
  let outputPath = args.output
  if (extname(outputPath) !== ".m3u8") {
    outputPath = `${outputPath}.m3u8`
  }
  await writeFile(outputPath, convertedContent)
}

async function getTs(args) {
  if (args.path) {
    await getTsPath(args)
  } else if (args.url) {
    await getTsUrl(args)
  }
}

async function getTsPath(args) {
  const content = await readFile(args.path, { encoding: "utf-8" })
  const tsFileList = extractTsFileUrlListFromText(content)
  console.log(tsFileList)

}

async function getTsUrl(args) {

}

async function gen(args) {
  const ext = args.ext.map(e => e.toLocaleLowerCase())
  await processOnFileTree(args.path,
    (filepath) => ext.includes(removePrefix(extname(filepath).toLocaleLowerCase(), ".")),
    async (filepath) => {
      await convertVideo2M3u8({
        videoPath: filepath,
        time: args.time,
        overwrite: args.overwrite,
        destDir: args.dest,
      })
    })
}


if (esMain(import.meta)) {
  main(process.argv)
}
