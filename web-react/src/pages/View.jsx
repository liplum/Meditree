import "./View.css"
import React, { createContext, useContext, useEffect, useState } from "react"
import { FileTreeNavigation } from "../subviews/FileTreeNavigation"
import { updatePageTitle, storage } from "../Env"
import MenuIcon from "@mui/icons-material/Menu"
import * as ft from "../models/FileTree"
import {
  useLoaderData,
  defer,
  Await,
  useLocation,
  useNavigate, useAsyncError
} from "react-router-dom"
import { Box, Button, Drawer, Toolbar, AppBar, IconButton, Tooltip } from "@mui/material"
import { StarBorder, Star } from "@mui/icons-material"

import { FileDisplayBoard } from "../subviews/Playground"
import { i18n } from "../I18n"
import { SearchBar } from "../components/SearchBar"
import { Failed, Loading } from "../components/Loading"
import useForceUpdate from "use-force-update"
import { StarChart } from "../models/StarChart"

export const FileTreeDelegateContext = createContext()
export const IsDrawerOpenContext = createContext()
export const StarChartContext = createContext()
export const FileNavigationContext = createContext()

export async function loader({ request }) {
  let lastPath = decodeURIComponent(new URL(request.url).searchParams.get("file"))
  lastPath = lastPath === "null" || lastPath === "undefined" ? null : lastPath
  storage.lastFilePathFromUrl = lastPath
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
  })
}

export function App() {
  const { fileTreeDelegate } = useLoaderData()

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
            <Body fileTreeDelegate={delegate} />
          )}
        </Await>
      </React.Suspense>
    </main>
  )
}

function resolveFileFromPath(path, fileTreeDelegate) {
  if (path) {
    for (const file of fileTreeDelegate.path2File.values()) {
      if (file.path === path) {
        return file
      }
    }
  }
  return null
}

function findNextFile(fileTreeDelegate, curFile, delta) {
  if (!(curFile && "key" in curFile)) return curFile
  let nextKey = curFile.key + delta
  while (nextKey >= 0 && nextKey < fileTreeDelegate.maxKey) {
    const next = fileTreeDelegate.key2File.get(nextKey)
    if (!next) {
      nextKey += delta
    } else {
      return next
    }
  }
}

function Body({ fileTreeDelegate }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState()
  const location = useLocation()
  const [searchPrompt, setSearchPrompt] = useState()
  const [onlyShowStarred, setOnlyShowStarred] = useState()
  const navigate = useNavigate()
  const selectedFile = resolveFileFromPath(decodeURIComponent(new URLSearchParams(location.search).get("file")), fileTreeDelegate)

  useEffect(() => {
    if (selectedFile) {
      updatePageTitle(selectedFile.path)
    }
  }, [selectedFile])

  const goFile = (curFile, delta) => {
    const file = findNextFile(fileTreeDelegate, curFile, delta)
    navigate(`/view?file=${encodeURIComponent(file.path)}`)
  }
  const goNextFile = (curFile) => goFile(curFile, +1)
  const goPreviousFile = (curFile) => goFile(curFile, -1)
  const forceUpdate = useForceUpdate()
  const starChart = new StarChart()
  starChart.load()
  const starChartCtx = {
    starChart,
    isStarred(file) {
      return file && starChart.isStarred(file.path)
    },
    star(file) {
      const path = file?.path
      if (!path) return
      starChart.star(path)
      // rebuild for prompt filter
      forceUpdate()
    },
    unstar(file) {
      const path = file?.path
      if (!path) return
      starChart.unstar(path)
      // rebuild for prompt filter
      forceUpdate()
    }
  }

  const filterByPrompt = (file) => {
    if (onlyShowStarred && !starChart.isStarred(file.path)) {
      return false
    }
    if (!searchPrompt) return true
    return file.path.toLowerCase().includes(searchPrompt.trim().toLocaleLowerCase())
  }

  const main = (
    <ResponsiveDrawer
      isDrawerOpen={isDrawerOpen}
      setIsDrawerOpen={setIsDrawerOpen}
      drawer={<>
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
        <div style={{ flex: 1, overflow: "auto" }}>
          <FileTreeNavigation
            selectedFile={selectedFile}
            searchDelegate={filterByPrompt}
          />
        </div>
      </>}
      body={<>
        <Toolbar />
        <FileDisplayBoard file={selectedFile} />
      </>}
    />
  )
  return <IsDrawerOpenContext.Provider value={[isDrawerOpen, setIsDrawerOpen]}>
    <FileTreeDelegateContext.Provider value={[fileTreeDelegate]}>
      <StarChartContext.Provider value={starChartCtx}>
        <FileNavigationContext.Provider value={{ goFile, goNextFile, goPreviousFile }}>
          {main}
        </FileNavigationContext.Provider>
      </StarChartContext.Provider>
    </FileTreeDelegateContext.Provider>
  </IsDrawerOpenContext.Provider>
}

/// TODO: Drawer looks bad on tablet portrait mode.
const drawerWidth = "min(max(30%,20rem),30rem)"

export function ResponsiveAppBar({ children }) {
  const [isDrawerOpen, setIsDrawerOpen] = useContext(IsDrawerOpenContext)
  return <AppBar
    position="fixed"
    sx={{
      width: { sm: `calc(100% - ${drawerWidth})` },
      ml: { sm: `${drawerWidth}` },
    }}
  >
    <Toolbar variant="dense">
      <IconButton
        color="inherit"
        aria-label="open drawer"
        edge="start"
        onClick={() => {
          setIsDrawerOpen(!isDrawerOpen)
        }}
        sx={{ mr: 2, display: { sm: "none" } }}
      >
        <MenuIcon />
      </IconButton>
      {children}
    </Toolbar>
  </AppBar>
}

export function ResponsiveDrawer({ isDrawerOpen, setIsDrawerOpen, drawer, body }) {
  drawer = <div
    style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
    }}>
    {drawer}
  </div>
  return <Box sx={{
    display: "flex", height: "100vh",
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
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
    <Box // right content
      component="main"
      sx={{
        padding: "1rem",
        flexGrow: 1,
        width: { sm: `calc(100% - ${drawerWidth})` },
        display: "flex",
        flexDirection: "column", 
      }}
    >
      {body}
    </Box>
  </Box>
}

function LoadErrorBoundary() {
  const error = useAsyncError()
  const navigate = useNavigate()
  useEffect(() => {
    const type = error.message
    console.error(error)
    if (type === "Token Invalid" || type === "Token Missing") {
      navigate("/")
    }
  }, [error, navigate])
  return <Failed text={i18n.loading.failed}>
    <Button variant="outlined" onClick={() => {
      navigate("/")
    }}>
      Back
    </Button>
  </Failed>
}
