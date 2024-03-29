import "./View.css"
import { ReactNode, useEffect, useMemo, useState } from "react"
import { FileTreeNavigation } from "../subviews/FileTreeNavigation"
import { updatePageTitle, storage } from "../Env"
import MenuIcon from "@mui/icons-material/Menu"
import { FileNode, FileTreeDelegate, createDelegate, findNextFile, resolveFileFromPath } from "../models/FileTree"
import {
  Navigate,
  useNavigate, useSearchParams
} from "react-router-dom"
import { Typography, Chip, Box, Button, Drawer, Toolbar, AppBar, IconButton, Tooltip, Fab } from "@mui/material"
import { StarBorder, Star, NavigateBefore, NavigateNext } from "@mui/icons-material"
import { useRequest } from "ahooks"
import { FileDisplayBoard } from "../subviews/Playground"
import { i18n } from "../I18n"
import { SearchBar } from "../components/SearchBar"
import { Failed, Loading } from "../components/Loading"
import useForceUpdate from "use-force-update"
import { StarChart } from "../models/StarChart"
import { filesize } from "filesize"


async function requestFileTree({ file }: { file?: string | null }): Promise<FileTreeDelegate> {
  const lastPath = decodeURIComponent(file ?? "")
  storage.lastFilePathFromUrl = lastPath ? lastPath : null
  const res = await fetch("/api/list", {
    method: "GET",
  })
  if (res.ok) {
    const payload = await res.json()
    const fileTreeDelegate = createDelegate({
      name: payload.name,
      root: payload.root,
    })
    return fileTreeDelegate
  } else {
    const error = await res.text()
    throw new Error(error)
  }
}

export function App() {
  const [searchParams] = useSearchParams()
  const { data: delegate, error, loading } = useRequest(
    async () => requestFileTree({ file: searchParams.get("file") })
  )
  if (error) {
    if (error.message === "Auth Error") return <Navigate to="/" />
    return <LoadErrorBoundary error={error} />
  }
  if (loading || !delegate) return <Loading />
  return <Body fileTreeDelegate={delegate} />
}

function Body({ fileTreeDelegate }: { fileTreeDelegate: FileTreeDelegate }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [searchPrompt, setSearchPrompt] = useState("")
  const [onlyShowStarred, setOnlyShowStarred] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedFile = resolveFileFromPath(decodeURIComponent(searchParams.get("file") ?? ""), fileTreeDelegate)

  useEffect(() => {
    if (selectedFile) {
      updatePageTitle(selectedFile.path)
    }
  }, [selectedFile])

  const forceUpdate = useForceUpdate()
  const starChart = useMemo(() => {
    const starChart = new StarChart()
    starChart.load()
    return starChart
  }, [])

  function goFile(curFile: FileNode, delta: number) {
    const file = findNextFile(fileTreeDelegate, curFile, delta)
    if (!file) return
    navigate(`/view?file=${encodeURIComponent(file.path)}`)
  }
  const isFileStarred = selectedFile && starChart.isStarred(selectedFile.path)

  return <ResponsiveDrawer
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
          searchDelegate={(file) => {
            if (onlyShowStarred && !starChart.isStarred(file.path)) {
              return false
            }
            if (!searchPrompt) return true
            return file.path.toLowerCase().includes(searchPrompt.trim().toLocaleLowerCase())
          }}
          delegate={fileTreeDelegate}
        />
      </div>
    </>}
  >
    <Toolbar />
    <ResponsiveAppBar isDrawerOpen={isDrawerOpen} setIsDrawerOpen={setIsDrawerOpen}>
      <Tooltip title={selectedFile?.path}>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {selectedFile ? selectedFile.name : undefined}
        </Typography>
      </Tooltip>
      {selectedFile && // only display if any file is selected
        <>
          {selectedFile.size && // only display if file has size property
            <Chip label={filesize(selectedFile.size, { base: 2, standard: "jedec" }) as string} />
          }
          <Tooltip title={
            isFileStarred
              ? i18n.playground.unstarBtn
              : i18n.playground.starBtn
          }>
            <IconButton onClick={() => {
              if (isFileStarred) {
                starChart.unstar(selectedFile.path)
              } else {
                starChart.star(selectedFile.path)
              }
              forceUpdate()
            }}>
              {isFileStarred ? <Star /> : <StarBorder />}
            </IconButton>
          </Tooltip>
        </>
      }
    </ResponsiveAppBar>
    <FileDisplayBoard file={selectedFile} />
    <Fab
      sx={{
        position: 'fixed',
        margin: 0,
        top: 'auto',
        right: 84,
        bottom: 20,
        left: 'auto',
      }}
      disabled={!selectedFile} color="primary" aria-label="nav-before" onClick={() => {
        if (selectedFile) {
          goFile(selectedFile, -1)
        }
      }}>
      <NavigateBefore />
    </Fab>
    <Fab
      sx={{
        position: 'fixed',
        margin: 0,
        top: 'auto',
        right: 20,
        bottom: 20,
        left: 'auto',
      }}
      disabled={!selectedFile} color="primary" aria-label="nav-next" onClick={() => {
        if (selectedFile) {
          goFile(selectedFile, +1)
        }
      }}>
      <NavigateNext />
    </Fab>
  </ResponsiveDrawer>
}

/// TODO: Drawer looks bad on tablet portrait mode.
const drawerWidth = "min(max(30%,20rem),30rem)"

export function ResponsiveAppBar({ isDrawerOpen, setIsDrawerOpen, children }: { isDrawerOpen: boolean, setIsDrawerOpen: (open: boolean) => void, children: ReactNode }) {
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

export function ResponsiveDrawer({ isDrawerOpen, setIsDrawerOpen, drawer, children }: {
  isDrawerOpen: boolean
  setIsDrawerOpen: (open: boolean) => void
  drawer: ReactNode
  children: ReactNode
}) {
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
      {children}
    </Box>
  </Box>
}

function LoadErrorBoundary({ error }: { error: Error }) {
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
