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
      selected: []
    }
    this.onGoNext = this.onGoNext.bind(this)
    this.onGoPrevious = this.onGoPrevious.bind(this)
    let fileTree = props.fileTree
    if (props.searchPrompt) {
      fileTree = filterFileTree(fileTree, props.searchPrompt)
    }
    const delegate = createFileTreeDelegate(fileTree)
    this.delegate = delegate
    console.log(delegate)
  }

  componentDidMount() {
    emitter.on("go-next", this.onGoNext)
    emitter.on("go-previous", this.onGoPrevious)
  }

  componentWillUnmount() {
    emitter.off("go-next", this.onGoNext)
    emitter.off("go-previous", this.onGoPrevious)
  }

  onGoPrevious(curFile) {
    if (!(curFile && "nodeId" in curFile)) return
    const findPreviousFileTilEnd = () => {
      let previousId = curFile.nodeId - 1
      while (previousId >= 0) {
        const previous = this.delegate.id2File.get(previousId)
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
    const findNextFileTilEnd = () => {
      let nextId = curFile.nodeId + 1
      while (nextId < this.delegate.maxId) {
        const next = this.delegate.id2File.get(nextId)
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
    const renderObject = buildFileTreeView(this.delegate.tree)
    return <TreeView
      aria-label="file system navigator"
      onNodeSelect={(_, nodeId) => this.onNodeSelect(this.delegate.id2File, nodeId)}
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
}

/**
 *  @author chatGPT
 */
function filterFileTree(tree, searchPrompt) {
  const filteredTree = {}
  Object.entries(tree).forEach(([key, value]) => {
    if (key.toLowerCase().includes(searchPrompt.toLowerCase())) {
      filteredTree[key] = value
    } else if (typeof value === "object" && value !== null) {
      const subtree = filterFileTree(value, searchPrompt)
      if (Object.keys(subtree).length > 0) {
        filteredTree[key] = subtree
      }
    }
  })
  return filteredTree
}

function createFileTreeDelegate(rootFileTree) {
  const rootChildren = []
  let id = 0
  const rootObj = {
    id: id,
    name: "My Directory",
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

function buildFileTreeView(node) {
  const id = `${node.id}`
  return <TreeItem key={id} nodeId={id} label={node.name}>
    {Array.isArray(node.children)
      ? node.children.map((n) => buildFileTreeView(n))
      : null}
  </TreeItem>
}