import React from 'react'
import { emitter } from "./event"
import { Tree } from 'antd'
import * as ft from "./fileTree"
const { DirectoryTree } = Tree;

export class FileTreeNavigation extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      delegate: undefined,
    }
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
    const delegate = ft.createDelegate(fileTree.files, fileTree.name)
    if (this.props.searchDelegate) {
      const tree = ft.filter(delegate.renderTree, this.props.searchDelegate,
        (id) => delegate.id2File.get(id)
      )
      delegate.renderTree = tree
    }
    this.setState({
      delegate
    })
  }

  componentWillUnmount() {
    emitter.off("go-next", this.onGoNext)
    emitter.off("go-previous", this.onGoPrevious)
  }

  onNodeSelect(key) {
    this.setState({
      selected: key
    })
    if (typeof key === "string") {
      key = parseInt(key)
      if (isNaN(key)) return
    }
    const file = this.state.delegate.id2File.get(key)
    if (file) this.props.onSelectFile?.({
      key,
      ...file,
    })
  }

  render() {
    const delegate = this.state.delegate
    if (!delegate) return
    const lastSelectedFile = this.props.lastSelectedFile
    return (
      <DirectoryTree
        style={{
          backgroundColor: "#0A0A0A",
          color: "#FAFAFA",
          fontSize: "14pt",
          height: "95vh",
          overflow: "auto",
        }}
        showLine={true}
        showIcon={false}
        defaultSelectedKeys={[lastSelectedFile?.nodeId]}
        defaultExpandedKeys={lastSelectedFile?.tracking}
        onSelect={(keys, _) => {
          if (keys.length > 0) this.onNodeSelect(keys[0])
        }}
        treeData={this.state.delegate.renderTree.children}
      />
    );
  }

  selectFile(key, file) {
    this.props.onSelectFile?.({
      ...file,
      key,
    })
  }
  onGoNext = (curFile) => {
    this.onGoImage(curFile, +1)
  }
  onGoPrevious = (curFile) => {
    this.onGoImage(curFile, -1)
  }

  onGoImage(curFile, delta) {
    if (!(curFile && "key" in curFile)) return
    const delegate = this.state.delegate
    let nextKey = curFile.key + delta
    while (0 <= nextKey && nextKey < this.state.delegate.maxId) {
      const next = delegate.id2File.get(nextKey)
      if (!next) {
        nextKey += delta
      } else {
        this.selectFile(nextKey, next)
        return
      }
    }
  }
}
