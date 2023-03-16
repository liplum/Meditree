import "./app.css"
import React, { createContext, useContext, useEffect, useState } from "react"
import { FileTreeNavigation } from "./fileTreeNavi";
import { emitter } from "./event"
import MenuIcon from '@mui/icons-material/Menu';

import { Input, Space, Button } from 'antd';
import * as ft from "./fileTree"
import {
  Outlet,
  useLoaderData,
  useNavigate,
} from "react-router-dom";
import { Box, Divider, Drawer, CssBaseline, Toolbar, AppBar, IconButton, Tooltip } from "@mui/material"
import { StarBorder, Star } from '@mui/icons-material';
import { backend } from "./env";

const { Search } = Input;

export const FileTreeDeleagteContext = createContext()
export const IsDrawerOpenContext = createContext()
export const AstrologyContext = createContext()
const drawerWidth = 320;

export async function loader() {
  console.log(`fetching ${backend.listUrl}`)
  const response = await fetch(backend.listUrl, {
    method: "GET",
  })
  const data = await response.json()
  const fileTreeDelegate = ft.createDelegate(data.files, data.name)
  document.title = data.name
  return { fileTreeDelegate }
}

export function App(props) {
  const { fileTreeDelegate } = useLoaderData()
  const [isDrawerOpen, setIsDrawerOpen] = useState()
  const lastSelectedFile = JSON.parse(window.localStorage.getItem("lastSelectedFile"))
  const [searchPrompt, setSearchPrompt] = useState()
  const [onlyShowStarred, setOnlyShowStarred] = useState()
  const navigate = useNavigate()

  useEffect(() => {
    function goFile(curFile, delta) {
      if (!(curFile && "key" in curFile)) return
      let nextKey = curFile.key + delta
      while (0 <= nextKey && nextKey < fileTreeDelegate.maxKey) {
        const next = fileTreeDelegate.key2File.get(nextKey)
        if (!next) {
          nextKey += delta
        } else {
          navigate(`/${nextKey}`)
          return
        }
      }
    }
    const goNext = (curFile) => goFile(curFile, +1)
    const goPrevious = (curFile) => goFile(curFile, -1)

    emitter.on("go-next", goNext)
    emitter.on("go-previous", goPrevious)
    return function cleanup() {
      emitter.on("go-next", goNext)
      emitter.on("go-previous", goPrevious)
    }
  }, [fileTreeDelegate])

  const astrology = JSON.parse(window.localStorage.getItem("astrology")) ?? {}

  const filterByPrompt = (file) => {
    if (onlyShowStarred && !astrology[file.path]) {
      return false;
    }
    if (!searchPrompt) return true
    return file.path.toLowerCase().includes(searchPrompt.toLocaleLowerCase())
  }

  const drawer = <>
    <AppBar position="fixed"
      sx={{
        width: { sm: `${drawerWidth}px` },
        left: 0,
      }}>
      <div style={{ display: "flex", alignItems: 'center' }}>
        <Tooltip title="Only Show Starred">
          <IconButton onClick={() => setOnlyShowStarred(!onlyShowStarred)}>
            {onlyShowStarred ? <Star /> : <StarBorder />}
          </IconButton>
        </Tooltip>
        <Search
          placeholder="search files or folders"
          onSearch={(prompt) => setSearchPrompt(prompt)}
        />
      </div>
    </AppBar>
    <FileTreeNavigation
      onSelectFile={(newFile) => {
        window.localStorage.setItem("lastSelectedFile", JSON.stringify(newFile))
      }}
      searchDelegate={filterByPrompt}
      lastSelectedFile={lastSelectedFile}
    />
  </>
  const body = (
    <Box sx={{
      display: 'flex', height: "100vh",
    }}>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false)
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
        <Outlet />
      </Box>
    </Box>
  )
  return <IsDrawerOpenContext.Provider value={[isDrawerOpen, setIsDrawerOpen]}>
    <FileTreeDeleagteContext.Provider value={[fileTreeDelegate]}>
      <AstrologyContext.Provider value={[astrology]}>
        {body}
      </AstrologyContext.Provider>
    </FileTreeDeleagteContext.Provider>
  </IsDrawerOpenContext.Provider>
}

export function ResponsiveAppBar(props) {
  const [isDrawerOpen, setIsDrawerOpen] = useContext(IsDrawerOpenContext);
  return <AppBar
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
        onClick={() => {
          setIsDrawerOpen(!isDrawerOpen)
        }}
        sx={{ mr: 2, display: { sm: 'none' } }}
      >
        <MenuIcon />
      </IconButton>
      {props.children}
    </Toolbar>
  </AppBar>
}