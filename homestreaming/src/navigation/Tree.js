import React from 'react'
import TreeView from '@mui/lab/TreeView'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TreeItem from '@mui/lab/TreeItem'
import Tooltip from '@mui/material/Tooltip'

export class FileTreeNavigation extends React.Component {

  render() {
    let fileTree = this.props.fileTree
    if (this.props.searchPrompt) {
      fileTree = filterFileTree(fileTree, this.props.searchPrompt)
    }
    const { renderObject, id2File } = createTreeViewRenderObject(fileTree)
    return <TreeView
      aria-label="file system navigator"
      onNodeSelect={(event, nodeId) => {
        const file = id2File.get(nodeId)
        if (file) this.props.onSelectFile?.(file)
      }}
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
      defaultExpanded={["0"]}
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
    let curId = `${id++}`
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
      return <TreeItem key={curId} nodeId={curId} label={name}>
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
      return <Tooltip title={path}>
        <TreeItem key={curId} nodeId={curId} label={name} />
      </Tooltip>
    }
  }
  const rootObj = createNode("", "My Directory", rootFileTree)
  return {
    renderObject: rootObj,
    id2File,
  }
}
