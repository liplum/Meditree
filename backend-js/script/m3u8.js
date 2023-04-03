import https from "https"
import fs from "fs"
import commandLineArgs from "command-line-args"

const optionDefinitions = [
  { name: "root", type: String, defaultOption: true },
  { name: "name", type: String },
  { name: "config", type: String },
]

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
  const baseUrl = new URL(playlistUrl);
  const lines = text.trim().split("\n");
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.startsWith("#")) {
      result.push(line);
    } else {
      const url = new URL(line, baseUrl);
      result.push(url.toString());
    }
  }
  return result.join("\n");
}

if (process.argv[3]) {
  commandLineArgs(optionDefinitions, {
    camelCase: true,
  })
  const converted = await convertRelativeUrlsToAbsolute(process.argv[3])
  const outputPath = process.argv[4] ? process.argv[4] : `${Math.random()}.m3u8`
  fs.writeFileSync(outputPath, converted)
}