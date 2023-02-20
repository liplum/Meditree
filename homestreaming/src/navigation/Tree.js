import React from 'react'
import TreeView from '@mui/lab/TreeView'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TreeItem from '@mui/lab/TreeItem'


export class FileTreeNavigation extends React.Component {

  render() {
    const { renderObject, id2File } = createTreeViewRenderObject(this.props.fileTree)
    const renderTree = (nodes) => (
      <TreeItem key={nodes.id} nodeId={nodes.id} label={nodes.name}>
        {Array.isArray(nodes.children)
          ? nodes.children.map((node) => renderTree(node))
          : null}
      </TreeItem>
    );
    return <TreeView
      aria-label="file system navigator"
      onNodeSelect={(event, nodeId) => {
        const file = id2File.get(nodeId)
        if (file) this.props.onSelectFile?.(file)
      }}
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
      defaultExpanded={["root"]}
      sx={{
        height: "100%", flexGrow: 1,
      }}
    >
      {renderTree(renderObject)}
    </TreeView>
  }
}

function createTreeViewRenderObject(fileTree) {
  const rootChildren = []
  const rootObj = {
    id: "root",
    name: "My Directory",
    children: rootChildren
  }
  let id = 1
  const id2File = new Map()
  function createNode(parentUrl, children, fileTree) {
    for (const [name, file] of Object.entries(fileTree)) {
      let curId = `${id++}`
      if (file instanceof Object) {
        // if file is an object, it presents a directory
        const myChildren = []
        const obj = {
          id: curId,
          name,
          children: myChildren
        }
        children.push(obj)
        createNode(`${parentUrl}/${name}`, myChildren, file)
      } else {
        id2File.set(curId, {
          path: `${parentUrl}/${name}`,
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
  createNode("", rootChildren, fileTree)
  return {
    renderObject: rootObj,
    id2File
  }
}
