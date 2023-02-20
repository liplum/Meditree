import logo from './logo.svg'
import './App.css'
import React from 'react'
import { FileTreeNavigation } from './navigation/Tree.js'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { VideoPlayer } from './playground/Video.js'
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MailIcon from '@mui/icons-material/Mail';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

const backendUrl = "http://localhost"
const backendListUrl = `${backendUrl}/list`
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
      mobileOpen: false,
    }
    fetch(backendListUrl)
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
    const drawer = (
      <div>
        <Toolbar />
        <Divider />
        <FileTreeNavigation
          onSelectFile={this.onSelectFile}
          fileTree={this.state.fileTree}>
        </FileTreeNavigation>
      </div>
    )
    const content = (
      <VideoPlayer></VideoPlayer>
    )
    return (
      <ThemeProvider theme={theme}>
        <FileTreeNavigationDrawer
          drawer={drawer} content={content}
        />
      </ThemeProvider>
    )
  }
}

const drawerWidth = 240

class FileTreeNavigationDrawer extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      mobileOpen: false,
    }
  }
  render() {
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
            <Typography variant="h6" noWrap component="div">
              Responsive drawer
            </Typography>
          </Toolbar>
        </AppBar>
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="mailbox folders"
        >
          {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
          <Drawer
            container={container}
            variant="temporary"
            open={this.state.mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {this.props.drawer}
          </Drawer>
          <Drawer
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