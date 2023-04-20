import React, { createContext, useContext, useEffect, useState } from "react"
import { FileTreeNavigation } from "./FileTreeNavigation";
import { updatePageTitle } from "./Env"
import MenuIcon from '@mui/icons-material/Menu';

import * as ft from "./FileTree"
import {
  useLoaderData,
  defer,
  Await,
  useLocation,
} from "react-router-dom";
import { Box, Button, Drawer, Toolbar, AppBar, IconButton, Tooltip } from "@mui/material"
import { StarBorder, Star } from '@mui/icons-material';
import { storage } from "./Env";
import { FileDisplayBoard } from "./Playground";
import { i18n } from "./I18n";
import { SearchBar } from "./SearchBar";
import "./View.css"
import { Failed, Loading } from "./Loading";
import useForceUpdate from "use-force-update";
import { useNavigate, useAsyncError } from 'react-router-dom';

export const FileTreeDeleagteContext = createContext()
export const IsDrawerOpenContext = createContext()
export const AstrologyContext = createContext()
export const SelectedFileContext = createContext()
export const FileNavigationContext = createContext()

/// TODO: Drawer looks bad on tablet portrait mode.
const drawerWidth = "min(max(30%,20rem),30rem)";

export async function loader() {
  const task = async () => {
    const response = await fetch("/list", {
      method: "GET",
    })
    if (response.ok) {
      const payload = await response.json()
      const fileTreeDelegate = ft.createDelegate({
        name: payload.name,
        root: payload.root,
      })
      return fileTreeDelegate
    } else {
      const error = await response.text()
      throw new Error(error)
    }
  }
  return defer({
    fileTreeDelegate: task(),
  });
}

function LoadErrorBoundary() {
  const error = useAsyncError()
  const navigate = useNavigate()
  console.error(error)
  return <Failed text={i18n.loading.error[error.message] ?? i18n.loading.failed}>
    <Button variant="outlined" onClick={() => {
      navigate("/");
    }}>
      Back
    </Button>
  </Failed>
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
          errorElement={<LoadErrorBoundary />}
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
  const { fileTreeDelegate } = props

  function resolveFileFromPath(path, selectedFile) {
    if (path && selectedFile?.path !== path) {
      for (const file of fileTreeDelegate.key2File.values()) {
        if (file.path === path) {
          return file
        }
      }
    }
    return null
  }

  const [isDrawerOpen, setIsDrawerOpen] = useState()
  const location = useLocation()
  const defaultSelectedFile =
    resolveFileFromPath(decodeURIComponent(new URLSearchParams(location.search).get("file")))
    ?? (
      fileTreeDelegate.key2File.size > 0 ? (
        storage.getLastSelectedFile()
        ?? ft.getFirstFile(fileTreeDelegate)
      ) : null
    )
  const [selectedFile, setSelectedFile] = useState(defaultSelectedFile)
  const [searchPrompt, setSearchPrompt] = useState()
  const [onlyShowStarred, setOnlyShowStarred] = useState()
  const navigate = useNavigate()

  useEffect(() => {
    if (selectedFile) {
      updatePageTitle(selectedFile.path)
      navigate(`/view?file=${encodeURIComponent(selectedFile.path)}`)
    } else {
      updatePageTitle(i18n.noFile)
    }
    storage.setLastSelectedFile(selectedFile)
  }, [selectedFile])

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
  const goNextFile = (curFile) => goFile(curFile, +1)
  const goPreviousFile = (curFile) => goFile(curFile, -1)
  const forceUpdate = useForceUpdate()
  const astrology = storage.getAstrology()
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
        storage.setAstrology(astrology)
        // rebuild for prompt filter
        forceUpdate()
      }
    },
    unstar(file) {
      const path = file?.path
      if (path && path in astrology) {
        delete astrology[path]
        storage.setAstrology(astrology)
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
    return file.path.toLowerCase().includes(searchPrompt.trim().toLocaleLowerCase())
  }

  const drawer = <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
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
      <Box // left drawer
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
      <Box // right content
        component="main"
        sx={{ padding: "1rem", flexGrow: 1, width: { sm: `calc(100% - ${drawerWidth})` } }}
      >
        <Toolbar />
        <FileDisplayBoard />
      </Box>
    </Box>
  )
  return <IsDrawerOpenContext.Provider value={[isDrawerOpen, setIsDrawerOpen]}>
    <FileTreeDeleagteContext.Provider value={[fileTreeDelegate]}>
      <AstrologyContext.Provider value={astrologyCtx}>
        <SelectedFileContext.Provider value={[selectedFile, setSelectedFile]}>
          <FileNavigationContext.Provider value={{ goFile, goNextFile, goPreviousFile }}>
            {body}
          </FileNavigationContext.Provider>
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
      width: { sm: `calc(100% - ${drawerWidth})` },
      ml: { sm: `${drawerWidth}` },
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