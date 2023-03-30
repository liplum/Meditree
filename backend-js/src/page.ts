import { MediaType } from "./config.js"
import { type FileTreeJson, type File } from "./file.js"
export function buildIndexHtml(
  mediaType: Record<string, MediaType>,
  fileTree: FileTreeJson,
): string {
  let maxIndent = 0
  const indentClassName = (indent: number): string => `i${indent}`
  const local = buildFromFileTree(fileTree, mediaType, indentClassName)
  maxIndent = Math.max(maxIndent, local.maxIndent)
  const indent = buildIndentStyleClass(maxIndent, indentClassName, 15)

  const html: string[] = []
  html.push("<!DOCTYPE html>")
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
  .preview {
    position: absolute;
    max-height: 16rem;
    max-width: 16rem;
    border: 1px solid #F0F0F0;
    z-index: 999;
  }
  a:link { color: #4CAF50; }
  a:visited { color: #039BE5; }
  `)
  html.push("</style>")
  html.push("</head>")
  // body
  html.push("<body>")
  appendArray(html, local.tags)
  html.push("<script>")
  html.push(script)
  html.push("</script>")
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
  mediaType: Record<string, MediaType>,
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
        const fi = file as File
        const clz = mediaType[fi.type] === MediaType.image ? "class=\"has-preview\"" : ""
        div.push(`<a href="/file/${fi.path}" ${clz}>${name}</a>,`)
      } else {
        // it's directory
        div.push(`<details ${indent === 0 ? "open" : ""}>`)
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

const script = `
const previewLinks = document.querySelectorAll('.has-preview');

previewLinks.forEach(link => {
  let previewImg = null;

  link.addEventListener('mouseover', event => {
    const imgUrl = link.href;

    previewImg = new Image();
    previewImg.src = imgUrl;
    previewImg.classList.add('preview');

    document.body.appendChild(previewImg);
  });

  link.addEventListener('mousemove', event => {
    if (!previewImg) {
      return;
    }

    const previewImgRect = previewImg.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const previewImgX = mouseX + 10 + previewImgRect.width > viewportWidth ? mouseX - previewImgRect.width - 10 : mouseX + 10;
    const previewImgY = mouseY + 10 + previewImgRect.height > viewportHeight ? mouseY - previewImgRect.height - 10 : mouseY + 10;

    previewImg.style.top = \`\${previewImgY}px\`;
    previewImg.style.left = \`\${previewImgX}px\`;
  });

  link.addEventListener('mouseout', () => {
    if (previewImg) {
      previewImg.parentNode.removeChild(previewImg);
      previewImg = null;
    }
  });
});
`
