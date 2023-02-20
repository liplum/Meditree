import React from 'react'
import TreeView from '@mui/lab/TreeView'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TreeItem from '@mui/lab/TreeItem'

export class FileTreeNavigation extends React.Component {

  constructor(props) {
    super(props)
    this.renderObject = createTreeViewRenderObject(this.props.fileTree)
  }
  render() {
    const renderTree = (nodes) => (
      <TreeItem key={nodes.id} nodeId={nodes.id} label={nodes.name}>
        {Array.isArray(nodes.children)
          ? nodes.children.map((node) => renderTree(node))
          : null}
      </TreeItem>
    );
    return <TreeView
      aria-label="file system navigator"
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
      defaultExpanded={['root']}
      sx={{ height: 110, flexGrow: 1, maxWidth: 400, overflowY: 'auto' }}
    >
      {renderTree(this.renderObject)}
    </TreeView>
  }

}

function createTreeViewRenderObject(fileTree) {
  const rootChildren = []
  const rootObj = {
    id: "root",
    name: "MyDirectory",
    children: rootChildren
  }
  let id = 1
  function createNode(children, fileTree) {
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
        createNode(myChildren, file)
      } else {
        // otherwise, it presents a file
        children.push({
          id: curId,
          name
        })
      }
    }
  }
  createNode(rootChildren, fileTree)
  return rootObj
}
