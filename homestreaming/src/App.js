import logo from './logo.svg'
import './App.css'
import React from 'react'
import { FileTreeNavigation } from './navigation/Tree.js'
const url = "http://localhost/list"
export class HomestreamingApp extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      fileTree: {}
    }
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        this.setState({
          fileTree: data
        })
        console.log(data)
      })
  }
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <FileTreeNavigation fileTree={this.state.fileTree}></FileTreeNavigation>
        </header>
      </div >
    );
  }
}
