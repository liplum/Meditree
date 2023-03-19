import React, { createContext, useContext, useEffect, useState } from "react"
import { FileTreeNavigation } from "./fileTreeNavi";
import { emitter } from "./event"
import MenuIcon from '@mui/icons-material/Menu';

import * as ft from "./fileTree"
import {
  useLoaderData,
  defer,
  Await,
} from "react-router-dom";
import { Box, Divider, Drawer, CssBaseline, Toolbar, AppBar, IconButton, Tooltip } from "@mui/material"
import { StarBorder, Star } from '@mui/icons-material';
import { backend, storage } from "./env";
import { FileDisplayBoard } from "./playground";
import { i18n } from "./i18n";
import { SearchBar } from "./searchbar";
import "./dashboard.css"
import { Failed, Loading } from "./loading";
import useForceUpdate from "use-force-update";

export const FileTreeDeleagteContext = createContext()
export const IsDrawerOpenContext = createContext()
export const AstrologyContext = createContext()
export const SelectedFileContext = createContext()
export const BackendContext = createContext()
const drawerWidth = 320;

export async function loader({ request }) {
  const url = new URL(request.url);
  const urlParams = new URLSearchParams(url.search);
  const params = Object.fromEntries(urlParams.entries());
  params.baseUrl = `${params.protocol}://${params.server}`
  const task = new Promise((resolve, reject) => {
    const listUrl = backend.listUrl(params.baseUrl)
    console.log(`fetching ${listUrl}`)
    fetch(listUrl, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        const fileTreeDelegate = ft.createDelegate(data.files, data.name)
        document.title = data.name
        resolve(fileTreeDelegate)
      })
      .catch((e) => {
        console.error(e)
        reject(e)
      })
  })
  return defer({
    fileTreeDelegate: task,
    params,
  });
}
export function App(props) {
  const { fileTreeDelegate, params } = useLoaderData();

  return (
    <main>
      <React.Suspense
        fallback={<Loading />}
      >
        <Await
          resolve={fileTreeDelegate}
          errorElement={<Failed text={i18n.loading.failed} />}
        >
          {(delegate) => (
            <Body fileTreeDelegate={delegate} params={params} />
          )}
        </Await>
      </React.Suspense>
    </main>
  );
}

function Body(props) {
  const { fileTreeDelegate, params } = props
  const { baseUrl } = params
  const [isDrawerOpen, setIsDrawerOpen] = useState()
  const lastSelectedFile = storage.getLastSelectedFileOf(baseUrl)
  const [selectedFile, setSelectedFile] = useState(lastSelectedFile)
  const [searchPrompt, setSearchPrompt] = useState()
  const [onlyShowStarred, setOnlyShowStarred] = useState()

  useEffect(() => {
    storage.setLastSelectedFileOf(baseUrl, selectedFile)
  }, [selectedFile])

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
  const forceUpdate = useForceUpdate()
  const astrology = storage.getAstrologyOf(baseUrl)
  const astrologyCtx = {
    astrology,
    isStarred(file) {
      return file && astrology[file.path]
    },
    star(file) {
      const path = file?.path
      if (path && !astrology[path]) {
        // `1` instead of `true` to shrink the json size
        astrology[path] = 1
        storage.setAstrologyOf(baseUrl, astrology)
        // rebuild for prompt filter
        forceUpdate()
      }
    },
    unstar(file) {
      const path = file?.path
      if (path && path in astrology) {
        delete astrology[path]
        storage.setAstrologyOf(baseUrl, astrology)
        // rebuild for prompt filter
        forceUpdate()
      }
    }
  }
  const filterByPrompt = (file) => {
    if (onlyShowStarred && !astrology[file.path]) {
      return false;
    }
    if (!searchPrompt) return true
    return file.path.toLowerCase().includes(searchPrompt.toLocaleLowerCase())
  }

  const drawer = <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
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
    <div style={{ flex: 1, overflow: 'auto' }}>
      <FileTreeNavigation
        searchDelegate={filterByPrompt}
      />
    </div>
  </div>
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
  return <IsDrawerOpenContext.Provider value={[isDrawerOpen, setIsDrawerOpen]}>
    <FileTreeDeleagteContext.Provider value={[fileTreeDelegate]}>
      <AstrologyContext.Provider value={astrologyCtx}>
        <SelectedFileContext.Provider value={[selectedFile, setSelectedFile]}>
          <BackendContext.Provider value={params}>
            {body}
          </BackendContext.Provider>
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