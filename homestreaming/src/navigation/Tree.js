import React from 'react'
import TreeView from '@mui/lab/TreeView'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TreeItem from '@mui/lab/TreeItem'


export class FileTreeNavigation extends React.Component {

  render() {
    const { renderObject, id2File } = createTreeViewRenderObject(this.props.fileTree)
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

function createTreeViewRenderObject(rootFileTree) {
  let id = 0
  const id2File = new Map()
  function createNode(parentUrl, name, fsEntry) {
    let curId = `${id++}`
    // if file is an object, it presents a directory
    if (fsEntry instanceof Object) {
      const children = []
      for (const [fileName, file] of Object.entries(fsEntry)) {
        let path
        if (fsEntry === rootFileTree) {
          path = ""
        } else if (parentUrl.length > 0) {
          path = `${parentUrl}/${name}`
        } else {
          path = name
        }
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
      return <TreeItem key={curId} nodeId={curId} label={name} />
    }
  }
  const rootObj = createNode("", "My Directory", rootFileTree)
  return {
    renderObject: rootObj,
    id2File
  }
}
