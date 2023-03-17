import "./app.css"
import React, { createContext, useContext, useEffect, useState } from "react"
import { FileTreeNavigation } from "./fileTreeNavi";
import { emitter } from "./event"
import MenuIcon from '@mui/icons-material/Menu';

import * as ft from "./fileTree"
import {
  useLoaderData,
} from "react-router-dom";
import { Box, Divider, Drawer, CssBaseline, Toolbar, AppBar, IconButton, Tooltip } from "@mui/material"
import { StarBorder, Star } from '@mui/icons-material';
import { backend } from "./env";
import { FileDisplayBoard } from "./playground";
import { i18n } from "./i18n";
import { SearchBar } from "./searchbar";

export const FileTreeDeleagteContext = createContext()
export const IsDrawerOpenContext = createContext()
export const AstrologyContext = createContext()
export const SelectedFileContext = createContext()
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
  const [selectedFile, setSelectedFile] = useState(lastSelectedFile)
  const [searchPrompt, setSearchPrompt] = useState()
  const [onlyShowStarred, setOnlyShowStarred] = useState()

  useEffect(() => {
    function goFile(curFile, delta) {
      if (!(curFile && "key" in curFile)) return
      let nextKey = curFile.key + delta
      while (0 <= nextKey && nextKey < fileTreeDelegate.maxKey) {
        const next = fileTreeDelegate.key2File.get(nextKey)
        if (!next) {
          nextKey += delta
        } else {
          setSelectedFile(next)
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
  })

  const astrology = JSON.parse(window.localStorage.getItem("astrology")) ?? {}

  const filterByPrompt = (file) => {
    if (onlyShowStarred && !astrology[file.path]) {
      return false;
    }
    if (!searchPrompt) return true
    return file.path.toLowerCase().includes(searchPrompt.toLocaleLowerCase())
  }

  const drawer = <>
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "10px 0px 10px 0px",
      justifyContent: "space-evenly",
    }}>
      <Tooltip title={i18n.search.starFilter}>
        <IconButton onClick={() => setOnlyShowStarred(!onlyShowStarred)}>
          {onlyShowStarred ? <Star /> : <StarBorder />}
        </IconButton>
      </Tooltip>
      <SearchBar
        placeholder={i18n.search.placeholder}
        onSearch={(prompt) => setSearchPrompt(prompt)}
      />
    </div>
    <FileTreeNavigation
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
        <FileDisplayBoard />
      </Box>
    </Box>
  )
  const astrologyCtx = {
    astrology,
    isStarred(file) {
      return file && astrology[file.path] === true
    },
    star(file) {
      const path = file?.path
      if (path && astrology[path] !== true) {
        astrology[path] = true
        window.localStorage.setItem("astrology", JSON.stringify(astrology))
      }
    },
    unstar(file) {
      const path = file?.path
      if (path && path in astrology) {
        delete astrology[path]
        window.localStorage.setItem("astrology", JSON.stringify(astrology))
      }
    }
  }
  return <IsDrawerOpenContext.Provider value={[isDrawerOpen, setIsDrawerOpen]}>
    <FileTreeDeleagteContext.Provider value={[fileTreeDelegate]}>
      <AstrologyContext.Provider value={astrologyCtx}>
        <SelectedFileContext.Provider value={[selectedFile, setSelectedFile]}>
          {body}
        </SelectedFileContext.Provider>
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