import { DirectoryInfo, FileInfo, extractFromDirectory } from "@liplum/meditree-model"

export interface FileTreePayload {
  name: string
  root: DirectoryInfo
}

export interface RenderTreeNode {
  key: number
  title: string
  path: string
  tracking: number[]
}

export interface FileNode extends RenderTreeNode {
  name: string
  isLeaf: true
  url: string
  type: string
  size?: number
}

export interface DirectoryNode extends RenderTreeNode {
  children: (DirectoryNode | FileNode)[]
  isLeaf?: false
}

export interface FileTreeDelegate {
  renderTree: DirectoryNode
  key2File: Map<number, FileNode>
  path2File: Map<string, FileNode>
  maxKey: number
  name: string
}

export function createDelegate({ name, root, }: FileTreePayload): FileTreeDelegate {
  let key = 0
  const rootRenderTree: DirectoryNode = {
    key: key++,
    title: name,
    children: [],
    path: "",
    tracking: [key]
  }
  const key2File = new Map<number, FileNode>()
  const path2File = new Map<string, FileNode>()
  function createNode(parentNode: DirectoryNode, curDir: DirectoryInfo) {
    const entries = Object.entries(curDir)
    reorder(entries)
    for (const [name, fso] of extractFromDirectory(entries)) {
      const tag = fso["*tag"]
      const curKey = key++
      // if file has a type, it presents a file
      if (typeof fso["*type"] === "string") {
        const file = fso as FileInfo
        // fileObj is for both TreeView component and actual FileTree.
        const fileObj: FileNode = {
          name,
          isLeaf: true,
          title: name,
          key: curKey,
          path: `${parentNode.path}/${name}`,
          url: `file/${parentNode.path}/${name}`,
          type: file["*type"],
          size: file.size,
          tracking: [...parentNode.tracking, curKey],
        }
        path2File.set(fileObj.path, fileObj)
        key2File.set(curKey, fileObj)
        parentNode.children.push(fileObj)
      } else {
        const dir = fso as DirectoryInfo
        // otherwise, it presents a directory
        if (typeof tag?.main === "string" && dir[tag.main]) {
          const mainFile = dir[tag.main] as FileInfo
          const fileObj: FileNode = {
            name,
            isLeaf: true,
            title: name,
            key: curKey,
            path: `${parentNode.path}/${name}`,
            url: `file/${parentNode.path}/${name}/${tag.main}`,
            type: mainFile["*type"],
            size: mainFile.size,
            tracking: [...parentNode.tracking, curKey],
          }
          path2File.set(fileObj.path, fileObj)
          key2File.set(curKey, fileObj)
          parentNode.children.push(fileObj)
        } else {
          const dirObj: DirectoryNode = {
            key: curKey,
            title: name,
            path: parentNode !== rootRenderTree ? `${parentNode.path}/${name}` : name,
            children: [],
            tracking: [...parentNode.tracking, curKey],
          }
          parentNode.children.push(dirObj)
          createNode(dirObj, dir)
        }
      }
    }
  }
  createNode(rootRenderTree, root)
  return {
    renderTree: rootRenderTree,
    key2File,
    path2File,
    maxKey: key,
    name,
  }
}

/**
 *  @author chatGPT
 *  @returns the render tree
 */
export function filter(renderTree: DirectoryNode, searchDelegate: (file: FileNode) => boolean): DirectoryNode {
  function filterTree(tree: DirectoryNode | FileNode): DirectoryNode | FileNode | null {
    // base case: leaf node
    if (!("children" in tree)) {
      return searchDelegate(tree) ? tree : null
    }

    // filter children recursively
    const filteredChildren = tree.children.map(child => filterTree(child)).filter(child => child !== null) as FileNode[]

    // return null if no children match
    if (filteredChildren.length === 0) {
      return null
    }

    // create a new node with the filtered children
    return {
      ...tree,
      children: filteredChildren
    } as DirectoryNode
  }
  let root = filterTree(renderTree)
  if (!root) {
    root = {
      ...renderTree,
      children: []
    }
  }
  return root as DirectoryNode
}

/**
 *  @author chatGPT
 */
function reorder(array: [string, unknown][]) {
  array.sort((a, b) => {
    const [fileNameA, fileA] = a
    const [fileNameB, fileB] = b
    // if both fileA and fileB are directories
    if (typeof fileA === "object" && typeof fileB === "object") {
      // just compare in string
      return fileNameA.localeCompare(fileNameB)
    }

    const extensionA = fileNameA.split(".").pop()
    const extensionB = fileNameB.split(".").pop()

    // Group files with the same extension together
    if (extensionA !== extensionB && extensionA !== undefined && extensionB !== undefined) {
      return extensionA.localeCompare(extensionB)
    }

    // Compare files without the extension
    const fileNameOnlyA = fileNameA.replace(/\.[^/.]+$/, "")
    const fileNameOnlyB = fileNameB.replace(/\.[^/.]+$/, "")

    // Check if both file names contain only numbers
    if (/^\d+$/.test(fileNameOnlyA) && /^\d+$/.test(fileNameOnlyB)) {
      return parseInt(fileNameOnlyA) - parseInt(fileNameOnlyB)
    }

    // Check if both file names have a number in them
    const numberA = parseInt(fileNameOnlyA.match(/\d+/)?.[0] ?? "")
    const numberB = parseInt(fileNameOnlyB.match(/\d+/)?.[0] ?? "")
    if (numberA && numberB && numberA !== numberB) {
      return numberA - numberB
    }

    // Use lexicographic order as a fallback
    return fileNameA.localeCompare(fileNameB)
  })
}
