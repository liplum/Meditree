import './App.css'
import React from 'react'
import { FileTreeNavigation } from './navigation/Tree.js'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import CssBaseline from '@mui/material/CssBaseline'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { FileDisplayBoard } from './playground/FileDisplayBoard'

import { SearchBar } from './navigation/Search'
import { Tooltip } from '@mui/material'
import emitter from "./Event"


const backend = {
  url: process.env.REACT_APP_BACKEND_URL,
  reolsveFileUrl(path) {
    return encodeURI(`${this.fileUrl}/${path}`)
  }
}
Object.assign(backend, {
  listUrl: `${backend.url}/list`,
  fileUrl: `${backend.url}/file`
})

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
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
})
export class HomestreamingApp extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      fileTree: {},
      selectedFile: null,
      mobileOpen: false,
      searchPrompt: "",
    }
    this.handleKeyPress = this.handleKeyPress.bind(this)
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyPress);
    fetch(backend.listUrl)
      .then((response) => response.json())
      .then((data) => {
        this.setState({
          fileTree: data
        })
      })
  }

  onSelectFile(file) {
    this.setState({
      selectedFile: file
    })
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyPress);
  }

  handleKeyPress(event) {
    if (event.key === "ArrowLeft") {
      emitter.emit("go-previous", this.state.selectedFile)
    } else if (event.key === "ArrowRight") {
      emitter.emit("go-next", this.state.selectedFile)
    }
  }

  onSearchPromptChange(prompt) {
    this.setState({
      searchPrompt: prompt
    })
  }
  render() {
    const drawer = (
      <div>
        <Toolbar>
          <SearchBar
            onPromptChange={(prompt) => this.onSearchPromptChange(prompt)}>
          </SearchBar>
        </Toolbar>
        <Divider />
        <FileTreeNavigation
          onSelectFile={(file) => this.onSelectFile(file)}
          searchPrompt={this.state.searchPrompt}
          fileTree={this.state.fileTree}>
        </FileTreeNavigation>
      </div>
    )

    const selectedFile = this.state.selectedFile
    if (selectedFile) {
      selectedFile.url = backend.reolsveFileUrl(selectedFile.path)
    }
    let content = (
      <FileDisplayBoard file={selectedFile}></FileDisplayBoard>
    )

    const title = selectedFile ? selectedFile.name : "No file selected"
    return (
      <ThemeProvider theme={theme}>
        <FileTreeNavigationDrawer
          drawer={drawer}
          content={content}
          title={title}
        />
      </ThemeProvider>
    )
  }
}


class FileTreeNavigationDrawer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      mobileOpen: false,
    }
  }
  render() {
    const drawerWidth = 350
    const { window } = this.props;
    const container = window !== undefined ? () => window().document.body : undefined;

    const handleDrawerToggle = () => {
      this.setState({
        mobileOpen: !this.state.mobileOpen
      })
    }

    return (
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Tooltip title={this.props.title}>
              <Typography variant="h6" noWrap component="div">
                {this.props.title}
              </Typography>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
          <Drawer // for small screens
            container={container}
            variant="temporary"
            open={this.state.mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {this.props.drawer}
          </Drawer>
          <Drawer // for large screens
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {this.props.drawer}
          </Drawer>
        </Box>
        <Box
          component="main"
          sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
        >
          <Toolbar />
          {this.props.content}
        </Box>
      </Box>
    )
  }
}