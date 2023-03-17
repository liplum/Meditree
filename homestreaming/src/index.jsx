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
import { Loading } from './loading'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Loading />,
    children: [
      {
        path: "dashboard",
        element: <App />,
        loader: appLoader,
        shouldRevalidate: () => false,
      }
    ]
  },
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
    MuiTextField: {
      styleOverrides: {
        root: {
          margin: "8px",
        }
      }
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
