import { FileTree } from "./file.js"
export function buildIndexHtml(
  name: string,
  localFileTree: FileTree,
): string {
  let maxIndent = 0
  const indentClassName = (indent: number): string => `i${indent}`
  const local = buildDivFromLocalFileTree(name, localFileTree, indentClassName)
  maxIndent = Math.max(maxIndent, local.maxIndent)
  const indent = buildIndentStyleClass(maxIndent, indentClassName, 15)

  const html: string[] = []
  html.push("<html>")
  // head
  html.push("<head>")
  html.push("<style>")
  appendArray(html, indent.tags)
  html.push(`body{
    font-size: 1.2rem;
  }`)
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
function buildDivFromLocalFileTree(
  fileTreeName: string,
  tree: FileTree,
  getIndentClz: IndentClassNameBuilder,
): { tags: string[], maxIndent: number } {
  const div: string[] = []
  let maxIndent = 0
  div.push("<div>")
  function buildSubtree(ancestorPath: string, curTree: FileTree, indent: number): void {
    maxIndent = Math.max(indent, maxIndent)
    for (const [name, file] of curTree.name2File.entries()) {
      const fullPath = ancestorPath.length === 0 ? name : `${ancestorPath}/${name}`
      if (file instanceof FileTree) {
        div.push("<details>")
        div.push(`<summary class="${getIndentClz(indent)}"><a>${name}\\</a></summary>`)
        div.push(`<div class="${getIndentClz(indent)}">`)
        buildSubtree(fullPath, file, indent + 1)
        div.push("<div>")
        div.push("</details>")
      } else {
        div.push(`<a href="/file/${fileTreeName}/${fullPath}">${name}</a>, `)
      }
    }
  }
  buildSubtree("", tree, 0)
  div.push("</div>")
  return { tags: div, maxIndent, }
}
