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

import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { useSwipeable } from 'react-swipeable'

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
      fileTree: undefined,
      selectedFile: null,
      mobileOpen: false,
      searchPrompt: "",
      onlySearchStarred: false,
    }
    this.handleKeyPress = this.handleKeyPress.bind(this)
    this.lastSelectedFile = JSON.parse(window.localStorage.getItem("lastSelectedFile"))
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyPress)
    console.log(`fetching ${backend.listUrl}`)
    this.setState({
      selectedFile: this.lastSelectedFile
    })
    fetch(backend.listUrl)
      .then((response) => response.json())
      .then((data) => {
        this.setState({
          fileTree: data
        })
        console.log(data)
      })
  }

  onSelectFile(file) {
    this.setState({
      selectedFile: file
    })
    window.localStorage.setItem("lastSelectedFile", JSON.stringify(file))
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
    const onlySearchStarred = this.state.onlySearchStarred
    const astrology = JSON.parse(window.localStorage.getItem("astrology") ?? "{}")
    const filterByPrompt = (file) => {
      if (onlySearchStarred && !astrology[file.path]) {
        return false
      }
      const searchPrompt = this.state.searchPrompt
      if (!searchPrompt) return true
      return file.path.toLowerCase().includes(searchPrompt.toLocaleLowerCase())
    }
    const drawerContent = (
      <div>
        <Toolbar>
          <Tooltip title="Only Show Starred">
            <IconButton
              color="inherit"
              onClick={() => {
                this.setState({
                  onlySearchStarred: !onlySearchStarred
                })
              }}>
              {onlySearchStarred ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
          </Tooltip>
          <SearchBar
            onPromptChange={(prompt) => this.onSearchPromptChange(prompt)}>
          </SearchBar>
        </Toolbar>
        <Divider />
        <FileTreeNavigation
          onSelectFile={(file) => this.onSelectFile(file)}
          astrology={astrology}
          searchDelegate={filterByPrompt}
          lastSelectedFile={this.lastSelectedFile}
          fileTree={this.state.fileTree}>
        </FileTreeNavigation>
      </div>
    )

    const selectedFile = this.state.selectedFile
    if (selectedFile) {
      selectedFile.url = backend.reolsveFileUrl(selectedFile.path)
    }

    const title = selectedFile ? selectedFile.name : "No file selected"
    const content = <FileDisplayBoard file={selectedFile} />
    return (
      <ThemeProvider theme={theme}>
        <SwipeArea selectedFile={selectedFile}>
          <FileTreeNavigationDrawer
            astrology={astrology}
            drawer={drawerContent}
            content={content}
            title={title}
            onStarChange={(newIsStarred) => {
              if (newIsStarred) {
                astrology[selectedFile.path] = true
              } else {
                delete astrology[selectedFile.path]
              }
              window.localStorage.setItem("astrology", JSON.stringify(astrology))
              this.forceUpdate()
            }}
            selectedFile={this.state.selectedFile}
          />
        </SwipeArea>
      </ThemeProvider>
    )
  }
}

function SwipeArea(props) {
  const handlers = useSwipeable({
    onSwipedLeft: (_) => emitter.emit("go-next", props.selectedFile),
    onSwipedRight: (_) => emitter.emit("go-previous", props.selectedFile),
  })
  return <div id="swipe-area" style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  }} {...handlers} >
    {props.children}
  </div>
}


class FileTreeNavigationDrawer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      mobileOpen: false,
    }
  }

  buildAppBarAction() {
    const selectedFile = this.props.selectedFile
    if (!selectedFile) return
    const astrology = this.props.astrology
    const starred = astrology[selectedFile.path]
    return <Tooltip title="Add to Star">
      <IconButton
        color="inherit"
        onClick={() => this.props.onStarChange?.(!starred)}>
        {starred ? <StarIcon /> : <StarBorderIcon />}
      </IconButton>
    </Tooltip>

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
    const selectedFile = this.props.selectedFile
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
              sx={{ mr: 2, display: { sm: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Tooltip title={selectedFile ? selectedFile.path : this.props.title}>
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                {this.props.title}
              </Typography>
            </Tooltip>
            {this.buildAppBarAction()}
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
          sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
          <Toolbar />
          {this.props.content}
        </Box>
      </Box>
    )
  }
}
