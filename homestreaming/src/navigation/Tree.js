import React from 'react'
import TreeView from '@mui/lab/TreeView'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TreeItem from '@mui/lab/TreeItem'
import emitter from "../Event"

export class FileTreeNavigation extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      selected: [],
      delegate: undefined,
    }
    this.onGoNext = this.onGoNext.bind(this)
    this.onGoPrevious = this.onGoPrevious.bind(this)
  }

  componentDidMount() {
    emitter.on("go-next", this.onGoNext)
    emitter.on("go-previous", this.onGoPrevious)
    this.updateAndNotify()
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.searchDelegate !== this.props.searchDelegate ||
      prevProps.fileTree !== this.props.fileTree
    ) {
      this.updateAndNotify()
    }
  }

  updateAndNotify = () => {
    const fileTree = this.props.fileTree
    if (!fileTree) return
    const delegate = createFileTreeDelegate(fileTree.files, fileTree.name)
    if (this.props.searchDelegate) {
      const tree = filterFileTree(delegate.tree, this.props.searchDelegate,
        (id) => delegate.id2File.get(id)
      )
      delegate.tree = tree
    }
    this.setState({
      delegate
    })
  }

  componentWillUnmount() {
    emitter.off("go-next", this.onGoNext)
    emitter.off("go-previous", this.onGoPrevious)
  }

  onNodeSelect(id2File, nodeId) {
    this.setState({
      selected: nodeId
    })
    if (typeof nodeId === "string") {
      nodeId = parseInt(nodeId)
      if (isNaN(nodeId)) return
    }
    const file = id2File.get(nodeId)
    if (file) this.props.onSelectFile?.({
      nodeId,
      ...file,
    })
  }

  render() {
    const delegate = this.state.delegate
    if (!delegate) return
    const renderObject = buildFileTreeView(delegate.tree)
    return <TreeView
      aria-label="file system navigator"
      onNodeSelect={(_, nodeId) => this.onNodeSelect(this.state.delegate.id2File, nodeId)}
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
      defaultExpanded={["0"]}
      selected={this.state.selected}
      sx={{
        height: "100%", flexGrow: 1,
      }}
    >
      {renderObject}
    </TreeView>
  }

  onGoPrevious(curFile) {
    if (!(curFile && "nodeId" in curFile)) return
    const delegate = this.state.delegate
    const findPreviousFileTilEnd = () => {
      let previousId = curFile.nodeId - 1
      while (previousId >= 0) {
        const previous = delegate.id2File.get(previousId)
        if (!previous) {
          previousId--
        } else {
          return {
            id: previousId,
            file: previous
          }
        }
      }
    }
    const previous = findPreviousFileTilEnd()
    if (previous) {
      const { id, file } = previous
      this.selectFile(id, file)
    }
  }

  onGoNext(curFile) {
    if (!(curFile && "nodeId" in curFile)) return
    const delegate = this.state.delegate
    const findNextFileTilEnd = () => {
      let nextId = curFile.nodeId + 1
      while (nextId < this.state.delegate.maxId) {
        const next = delegate.id2File.get(nextId)
        if (!next) {
          nextId++
        } else {
          return {
            id: nextId,
            file: next
          }
        }
      }
    }
    
    const previous = findNextFileTilEnd()
    if (previous) {
      const { id, file } = previous
      this.selectFile(id, file)
    }
  }

  selectFile(nodeId, file) {
    this.props.onSelectFile?.({
      ...file,
      nodeId: nodeId,
    })
    this.setState({
      selected: [`${nodeId}`]
    })
  }
}

/**
 *  @author chatGPT
 */
function filterFileTree(tree, searchDelegate, getFileById) {
  function filterTree(tree) {
    // base case: leaf node
    if (!tree.children) {
      const file = getFileById(tree.id)
      return searchDelegate(file) ? tree : null
    }

    // filter children recursively
    const filteredChildren = tree.children.map(child => filterTree(child)).filter(child => child !== null)

    // return null if no children match
    if (filteredChildren.length === 0) {
      return null
    }

    // create a new node with the filtered children
    return {
      id: tree.id,
      name: tree.name,
      children: filteredChildren
    }
  }
  let root = filterTree(tree)
  if (!root) {
    root = {
      ...tree,
      children: []
    }
  }
  return root
}

function createFileTreeDelegate(rootFileTree, rootName = "") {
  const rootChildren = []
  let id = 0
  const rootObj = {
    id: id++,
    name: rootName,
    children: rootChildren
  }
  const id2File = new Map()
  function createNode(parentUrl, children, fileTree) {
    for (const [name, file] of Object.entries(fileTree)) {
      let curId = id++
      const path = parentUrl.length > 0 ? `${parentUrl}/${name}` : name
      if (file instanceof Object) {
        // if file is an object, it presents a directory
        const myChildren = []
        const obj = {
          id: curId,
          name,
          children: myChildren
        }
        children.push(obj)
        createNode(path, myChildren, file)
        myChildren.sort((a, b) => nameCompare(a.name, b.name))
      } else {
        id2File.set(curId, {
          name,
          path: path,
          type: file,
        })
        // otherwise, it presents a file
        children.push({
          id: curId,
          name
        })
      }
    }
  }
  createNode("", rootChildren, rootFileTree)
  return {
    tree: rootObj,
    id2File,
    maxId: id,
  }
}

function nameCompare(a, b) {
  const numA = parseInt(a.match(/\d+/)?.[0])
  const numB = parseInt(b.match(/\d+/)?.[0])
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB
  } else {
    return a.localeCompare(b)
  }
}

function buildFileTreeView(node) {
  if (!node) return
  const id = `${node.id}`
  return <TreeItem key={id} nodeId={id} label={node.name}>
    {Array.isArray(node.children)
      ? node.children.map((n) => buildFileTreeView(n))
      : null}
  </TreeItem>
}

/**
 *  @author chatGPT
 */
// eslint-disable-next-line no-unused-vars
function fuzzyMatch(test, target) {
  // Convert both strings to lowercase
  test = test.toLowerCase()
  target = target.toLowerCase()

  // If the test string is empty, return 0
  if (test.length === 0) {
    return 0
  }

  // Initialize the matrix
  const matrix = []
  for (let i = 0; i <= target.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= test.length; j++) {
    matrix[0][j] = j
  }

  // Fill the matrix
  for (let i = 1; i <= target.length; i++) {
    for (let j = 1; j <= test.length; j++) {
      if (target.charAt(i - 1) === test.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]) + 1
      }
    }
  }

  // Compute the possibility
  const distance = matrix[target.length][test.length]
  return 1 - distance / Math.max(target.length, test.length)
}