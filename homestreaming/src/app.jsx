import "./app.css"
import React, { createContext } from "react"
import { FileTreeNavigation } from "./fileTreeNavi";
import { FileDisplayBoard } from "./playground";

import { Input, Space, Button, Tooltip } from 'antd';
import { StarOutlined, StarFilled } from '@ant-design/icons';
import * as ft from "./fileTree"
import {
  Outlet,
} from "react-router-dom";

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import CssBaseline from '@mui/material/CssBaseline';
import Toolbar from '@mui/material/Toolbar';

const { Search } = Input;

const backend = {
  url: process.env.REACT_APP_BACKEND_URL,
  reolsveFileUrl(path) {
    return encodeURI(`${this.fileUrl}/${path}`);
  },
};
Object.assign(backend, {
  listUrl: `${backend.url}/list`,
  fileUrl: `${backend.url}/file`,
});

export const FileTreeDeleagteContext = createContext()
export const IsDrawerOpenContext = createContext()
const drawerWidth = 240;


export class HomestreamingApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      fileTree: undefined,
      selectedFile: null,
      isDrawerOpen: false,
      searchPrompt: "",
      onlyShowStarred: false,
    };
  }

  componentDidMount() {
    console.log(`fetching ${backend.listUrl}`)
    this.lastSelectedFile = JSON.parse(
      window.localStorage.getItem("lastSelectedFile")
    )
    this.setState({
      selectedFile: this.lastSelectedFile,
    })
    fetch(backend.listUrl)
      .then((response) => response.json())
      .then((data) => {
        this.setState({
          fileTree: data,
        })
        document.title = data.name
      })
  }

  onSelectFile(file) {
    this.setState({
      selectedFile: file,
    })
    window.localStorage.setItem("lastSelectedFile", JSON.stringify(file))
  }

  render() {
    const astrology = JSON.parse(window.localStorage.getItem("astrology")) ?? {}

    const filterByPrompt = (file) => {
      if (this.state.onlyShowStarred && !astrology[file.path]) {
        return false;
      }
      const searchPrompt = this.state.searchPrompt
      if (!searchPrompt) return true
      return file.path.toLowerCase().includes(searchPrompt.toLocaleLowerCase())
    }

    const selectedFile = this.state.selectedFile
    if (selectedFile) {
      selectedFile.url = backend.reolsveFileUrl(selectedFile.path)
    }
    const title = selectedFile ? selectedFile.name : "No file selected"
    const starred = astrology[selectedFile?.path] === true;
    const appBarAction = (
      <Tooltip title="Add to Star">
        <Button icon={starred ? <StarFilled /> : <StarOutlined />}
          onClick={(newIsStarred) => {
            if (newIsStarred) {
              astrology[selectedFile.path] = true;
            } else {
              delete astrology[selectedFile.path];
            }
            window.localStorage.setItem("astrology", JSON.stringify(astrology));
            this.forceUpdate();
          }}>
        </Button>
      </Tooltip>
    );
    const onlyShowStarred = this.state.onlyShowStarred
    const drawer = <>
      <Space>
        <Tooltip title="Only Show Starred">
          <Button
            type="primary" icon={onlyShowStarred ? <StarFilled /> : <StarOutlined />}
            onClick={() => {
              this.setState({
                onlyShowStarred: !onlyShowStarred,
              })
            }}
          />
        </Tooltip>
        <Search
          placeholder="search files or folders"
          onSearch={(prompt) => this.setState({
            searchPrompt: prompt,
          })}
        />
      </Space>
      <FileTreeNavigation
        onSelectFile={(file) => this.onSelectFile(file)}
        searchDelegate={filterByPrompt}
        lastSelectedFile={this.lastSelectedFile}
        fileTree={this.state.fileTree}
      />
    </>
    return (
      <Box sx={{
        display: 'flex', height: "100vh", backgroundColor: "#0A0A0A",
        color: "#FAFAFA",
      }}>
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="mailbox folders"
        >
          <Drawer
            variant="temporary"
            open={this.state.isDrawerOpen}
            onClose={() => {
              this.setState({
                isDrawerOpen: false
              })
            }}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
        <Box
          component="main"
          sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
        >
          <CssBaseline />
          <Toolbar />
          <FileDisplayBoard file={selectedFile} />
        </Box>
      </Box>
    )
  }
}
