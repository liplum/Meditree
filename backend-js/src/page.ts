import { type FileTreeJson, type File } from "./file.js"
export function buildIndexHtml(
  fileTree: FileTreeJson,
): string {
  let maxIndent = 0
  const indentClassName = (indent: number): string => `i${indent}`
  const local = buildFromFileTree(fileTree, indentClassName)
  maxIndent = Math.max(maxIndent, local.maxIndent)
  const indent = buildIndentStyleClass(maxIndent, indentClassName, 15)

  const html: string[] = []
  html.push("<html>")
  // head
  html.push("<head>")
  html.push("<style>")
  appendArray(html, indent.tags)
  html.push(`
  body {
    font-size: 1.2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #0F0F0F;
    color: #FAFAFA;
  }
  a:link { color: #4CAF50; }
  a:visited { color: #039BE5; }
  `)
  html.push("</style>")
  html.push("</head>")
  // body
  html.push("<body>")
  appendArray(html, local.tags)
  html.push("</body>")
  html.push("</html>")
  return html.join("")
}

function appendArray(a: any[], b: any[]): void {
  /* You should include a test to check whether other_array really is an array */
  b.forEach(function (v) { a.push(v) })
}

type IndentClassNameBuilder = (indent: number) => string

function buildIndentStyleClass(
  maxIndent: number,
  getIndentClz: IndentClassNameBuilder,
  indentLength: number = 15,
): { tags: string[] } {
  const tags: string[] = []
  for (let indent = 0; indent < maxIndent; indent++) {
    tags.push(`.${getIndentClz(indent)}{margin-left: ${indentLength * indent}px;}`)
  }
  return { tags, }
}
function buildFromFileTree(
  tree: FileTreeJson,
  getIndentClz: IndentClassNameBuilder,
): { tags: string[], maxIndent: number } {
  const div: string[] = []
  let maxIndent = 0
  div.push("<div>")
  function buildSubtree(curTree: FileTreeJson, indent: number): void {
    maxIndent = Math.max(indent, maxIndent)
    for (const [name, file] of Object.entries(curTree)) {
      if (file.type) {
        // it's file
        div.push(`<a href="/file/${(file as File).path}">${name}</a>, `)
      } else {
        // it's directory
        div.push("<details>")
        div.push(`<summary class="${getIndentClz(indent)}"><a>${name}\\</a></summary>`)
        div.push(`<div class="${getIndentClz(indent)}">`)
        buildSubtree(file as FileTreeJson, indent + 1)
        div.push("<div>")
        div.push("</details>")
      }
    }
  }
  buildSubtree(tree, 0)
  div.push("</div>")
  return { tags: div, maxIndent, }
}
