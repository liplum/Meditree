import React from 'react'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom"
import { ConfigProvider, theme } from 'antd'
import ReactDOM from 'react-dom/client'
import { App, loader as appLoader } from './dashboard'
import { ThemeProvider, createTheme } from '@mui/material/styles';
import './index.css'
import {
  ConnectDialog,
  action as connectDialogAction,
} from './connect'
const router = createBrowserRouter([
  {
    index: true,
    element: <ConnectDialog />,
    action: connectDialogAction,
  },
  {
    path: "/connect",
    element: <App />,
    loader: appLoader,
    shouldRevalidate: () => false,
  }
]);

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
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
});
const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#0A0A0A',
            algorithm: theme.darkAlgorithm,
          },
        }}>
        <RouterProvider router={router} />
      </ConfigProvider>
    </ThemeProvider>
  </React.StrictMode>
)