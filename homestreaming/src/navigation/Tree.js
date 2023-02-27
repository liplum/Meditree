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
    if (curFile && "id2File" in this && "nodeId" in curFile) {
      const previousId = curFile.nodeId - 1
      const previous = this.id2File.get(previousId)
      if (previous) {
        this.props.onSelectFile?.({
          ...previous,
          nodeId: previousId,
        })
        this.setState({
          selected: [`${previousId}`]
        })
      }
    }
  }

  onGoNext(curFile) {
    if (curFile && "id2File" in this && "nodeId" in curFile) {
      const nextId = curFile.nodeId + 1
      const next = this.id2File.get(nextId)
      if (next) {
        this.props.onSelectFile?.({
          ...next,
          nodeId: nextId,
        })
        this.setState({
          selected: [`${nextId}`]
        })
      }
    }
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
    let fileTree = this.props.fileTree
    if (this.props.searchPrompt) {
      fileTree = filterFileTree(fileTree, this.props.searchPrompt)
    }
    const { renderObject, id2File } = createTreeViewRenderObject(fileTree)
    this.id2File = id2File
    return <TreeView
      aria-label="file system navigator"
      onNodeSelect={(_, nodeId) => this.onNodeSelect(id2File, nodeId)}
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

function createTreeViewRenderObject(rootFileTree) {
  let id = 0
  const id2File = new Map()
  function createNode(parentUrl, name, fsEntry) {
    let curId = id++
    let curIdStr = `${curId}`
    // if file is an object, it presents a directory
    if (fsEntry instanceof Object) {
      let path
      if (fsEntry === rootFileTree) {
        path = ""
      } else if (parentUrl.length > 0) {
        path = `${parentUrl}/${name}`
      } else {
        path = name
      }
      const children = []
      for (const [fileName, file] of Object.entries(fsEntry)) {
        children.push(createNode(path, fileName, file))
      }
      return <TreeItem key={curIdStr} nodeId={curIdStr} label={name}>
        {children}
      </TreeItem>
    } else {
      // otherwise, it presents a file
      const path = parentUrl.length > 0 ? `${parentUrl}/${name}` : name
      id2File.set(curId, {
        name,
        path: path,
        type: fsEntry,
      })
      return <TreeItem key={curIdStr} nodeId={curIdStr} label={name} />
    }
  }
  const rootObj = createNode("", "My Directory", rootFileTree)
  return {
    renderObject: rootObj,
    id2File,
  }
}
