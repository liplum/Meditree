import React from 'react'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom"
import { ConfigProvider, theme } from 'antd'
import ReactDOM from 'react-dom/client'
import './index.css'
import { HomestreamingApp } from './app'
import reportWebVitals from './reportWebVitals'
import { FileDisplayBoard } from './playground'
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomestreamingApp />,
    children: [
      {
        path: "/:key",
        element: <FileDisplayBoard />,
      }
    ]
  },
]);

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0A0A0A',
          algorithm: theme.darkAlgorithm,
        },
      }}>
      <RouterProvider router={router} />
    </ConfigProvider>
  </React.StrictMode>
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
