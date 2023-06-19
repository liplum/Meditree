// Import required modules
import { Button, DialogActions, Card, InputAdornment, IconButton, TextField } from "@mui/material"
import React, { useEffect, useState } from "react"
import {
  redirect,
  Form,
} from "react-router-dom"
import { updatePageTitle } from "./Env.js"
import "./Login.css"
import { i18n } from "./I18n.js"
import { Visibility, VisibilityOff } from "@mui/icons-material"
import Cookies from "js-cookie"

// Skip login if jwt is still valid.
export async function loader() {
  const jwt = Cookies.get("jwt")
  if (!jwt) return null
  // if jwt was generated, verify it.
  const validationRes = await fetch("/verify")
  if (validationRes.ok) {
    return redirect("/view")
  } else {
    Cookies.remove("jwt")
    return null
  }
}

/**
 * Handle log in
 */
export async function action({ request }) {
  const formData = await request.formData()
  const { account, password } = Object.fromEntries(formData)
  if (!account) {
    // if no account is posted, assume password is not required.
    return redirect("/view")
  }
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
    return redirect("/view")
  } else {
    Cookies.remove("jwt")
    return null
  }
}
export function LoginDialog(props) {
  useEffect(() => {
    updatePageTitle(i18n.login.title)
  }, [])
  const [showPasscode, setShowPasscode] = useState(false)
  return (
    <Card id="login-dialog">
      <h1>{i18n.login.title}</h1>
      <Form method="post" id="login-form" style={{
        flexDirection: "column", display: "flex",
      }}>
        <TextField
          variant="outlined"
          type='text'
          label={i18n.login.account}
          placeholder={i18n.login.accountPlaceholder}
          name="account"
        />
        <TextField
          variant="outlined"
          type={showPasscode ? "text" : "password"}
          label={i18n.login.password}
          placeholder={i18n.login.passwordPlaceholder}
          name="password"
          InputProps={{
            endAdornment: <InputAdornment position="end">
              <IconButton
                onClick={() => { setShowPasscode(!showPasscode) }}
                onMouseDown={() => { setShowPasscode(!showPasscode) }}
                aria-label="toggle password visibility"
              >
                {showPasscode ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </InputAdornment>
          }}
        />
        <DialogActions>
          <Button type="submit">{i18n.login.loginBtn}</Button>
        </DialogActions>
      </Form>
    </Card>
  )
}
