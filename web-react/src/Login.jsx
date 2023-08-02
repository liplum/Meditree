// Import required modules
import { Button, DialogActions, Card, InputAdornment, IconButton, TextField, Dialog, DialogTitle } from "@mui/material"
import React, { useEffect, useState } from "react"
import {
  redirect,
  useNavigate
} from "react-router-dom"
import { storage, updatePageTitle } from "./Env.js"
import "./Login.css"
import { i18n } from "./I18n.js"
import { Visibility, VisibilityOff } from "@mui/icons-material"
import Cookies from "js-cookie"

// Skip login if jwt is still valid.
export async function loader() {
  // try to verify the jwt, or the backend doesn't require jwt.
  const validationRes = await fetch("/verify")
  if (validationRes.ok) {
    return redirect("/view")
  } else {
    Cookies.remove("jwt")
    return null
  }
}

export function LoginDialog() {
  useEffect(() => {
    updatePageTitle(i18n.login.title)
  }, [])
  const navigate = useNavigate()
  const [account, setAccount] = useState("")
  const [password, setPassword] = useState("")
  const [showPasscode, setShowPasscode] = useState(false)
  const [failedDialogOpen, setFailedDialogOpen] = React.useState(false)
  const onLogin = async () => {
    const loginRes = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        account, password,
      })
    })
    if (loginRes.ok) {
      const { jwt } = await loginRes.json()
      Cookies.set("jwt", jwt)
      const lastPath = storage.lastFilePathFromUrl
      if (lastPath) {
        navigate(`/view?file=${encodeURIComponent(lastPath)}`)
      } else {
        navigate("/view")
      }
    } else {
      Cookies.remove("jwt")
      setFailedDialogOpen(true)
    }
  }
  return (
    <>
      <Card id="login-dialog">
        <h1>{i18n.login.title}</h1>
        <div id="login-form" style={{
          flexDirection: "column", display: "flex",
        }}>
          <TextField
            variant="outlined"
            type='text'
            label={i18n.login.account}
            onChange={(e) => setAccount(e.value)}
          />
          <TextField
            variant="outlined"
            type={showPasscode ? "text" : "password"}
            label={i18n.login.password}
            onChange={(e) => setPassword(e.value)}
            InputProps={{
              endAdornment: <InputAdornment position="end">
                <IconButton
                  onClick={() => { setShowPasscode(!showPasscode) }}
                  onMouseDown={() => { setShowPasscode(!showPasscode) }}
                  aria-label="toggle-password-visibility"
                >
                  {showPasscode ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              </InputAdornment>
            }}
          />
          <DialogActions>
            <Button type="submit" onClick={onLogin}>{i18n.login.loginBtn}</Button>
          </DialogActions>
        </div>
      </Card>
      <LoginFailedDialog
        open={failedDialogOpen}
        setOpen={setFailedDialogOpen} />
    </>
  )
}

function LoginFailedDialog({ open, setOpen }) {
  const handleClose = () => {
    setOpen(false)
  }
  return (
    <Dialog open={open}>
      <DialogTitle>{i18n.login.failed}</DialogTitle>
      <DialogActions>
        <Button onClick={handleClose} autoFocus>
          {i18n.login.closeBtn}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
