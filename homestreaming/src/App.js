import logo from './logo.svg'
import './App.css'
import React from 'react'
import { FileTreeNavigation } from './navigation/Tree.js'
const url = "http://localhost/list"
export class HomestreamingApp extends React.Component {
  constructor(props) {
    super(props)
    fetch(url)
      .then((response) => response.json())
      .then((data) => console.log(data))
  }
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileTreeNavigation></FileTreeNavigation>
          </a>
        </header>
      </div >
    );
  }
}
