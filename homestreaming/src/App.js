import logo from './logo.svg'
import './App.css'
import React from 'react'
import { FileTreeNavigation } from './navigation/Tree.js'
import { ThemeProvider, createTheme } from '@mui/material/styles'

const url = "http://localhost/list"
const theme = createTheme({
  typography: {
    fontSize: 17.5,
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
});
export class HomestreamingApp extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      fileTree: {},
      selectedFile: null,
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

  onSelectFile = (fileName) => {
    console.log(fileName)
  }

  render() {
    return (
      <ThemeProvider theme={theme}>
        <div className="App">
          <header className="App-header">
            <div className="wrapper">
              <div className="sidebar">
                <FileTreeNavigation
                  onSelectFile={this.onSelectFile}
                  fileTree={this.state.fileTree}>
                </FileTreeNavigation>
              </div>
            </div>
          </header>
        </div >
      </ThemeProvider>
    )
  }
}
