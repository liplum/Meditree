import React from "react"
import {
  createHashRouter,
  RouterProvider,
} from "react-router-dom"
import { ConfigProvider, theme } from "antd"
import ReactDOM from "react-dom/client"
import { App } from "./pages/View"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import "./index.css"
import { LoginDialog } from "./pages/Login"
import { CssBaseline } from "@mui/material"

const router = createHashRouter([
  {
    index: true,
    element: <LoginDialog />,
  },
  {
    path: "/view",
    element: <App />,
    shouldRevalidate: () => false,
  }
])

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "16px",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "16px",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: "16px",
        },
      }
    }
  },
})
const root = ReactDOM.createRoot(document.getElementById("root")!)
root.render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#0A0A0A",
          },
          algorithm: theme.darkAlgorithm,
        }}>
        <RouterProvider router={router} />
      </ConfigProvider>
    </ThemeProvider>
  </React.StrictMode>
)
