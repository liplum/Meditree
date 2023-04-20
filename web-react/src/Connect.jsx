// Import required modules
import { Button, TextField, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, DialogActions, DialogTitle, Card, CardActions, InputAdornment, IconButton, OutlinedInput, InputLabel } from '@mui/material';
import React, { useEffect, useState } from 'react';
import {
  redirect,
  Form,
} from 'react-router-dom';

import {
  backend,
  storage, updatePageTitle
} from "./Env.js"
import "./Connect.css"
import { i18n } from './I18n.js';
import { Visibility, VisibilityOff } from '@mui/icons-material'
import Cookies from 'js-cookie'

/**
 * Handle log in
 */
export async function action({ request }) {
  const formData = await request.formData()
  let { account, password } = Object.fromEntries(formData)
  storage.lastConnected = {
    account,
    password,
  }
  const loginRes = await fetch(backend.loginUrl, {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      account, password,
    })
  })
  if (loginRes.ok) {
    const { jwt } = await loginRes.json()
    Cookies.set('jwt', jwt);
    return redirect("/view")
  } else {
    return null
  }
}
export function ConnectDialog(props) {
  useEffect(() => {
    updatePageTitle(i18n.connect.title)
  }, [])
  const lastConnected = storage.lastConnected
  const [showPasscode, setShowPasscode] = useState(false)
  return (
    <Card id="connect-dialog">
      <h1>{i18n.connect.title}</h1>
      <Form method="post" id="connect-form" style={{
        flexDirection: "column", display: "flex",
      }}>
        <FormControl variant="outlined">
          <InputLabel htmlFor="outlined-adornment">{i18n.connect.account}</InputLabel>
          <OutlinedInput
            type='text'
            label={i18n.connect.account}
            placeholder={i18n.connect.accountPlaceholder}
            defaultValue={lastConnected?.account}
            name="account"
          />
        </FormControl>
        <FormControl variant="outlined">
          <InputLabel htmlFor="outlined-adornment-password">{i18n.connect.password}</InputLabel>
          <OutlinedInput
            type={showPasscode ? 'text' : 'password'}
            label={i18n.connect.password}
            placeholder={i18n.connect.passwordPlaceholder}
            defaultValue={lastConnected?.password}
            name="password"
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  onClick={() => { setShowPasscode(!showPasscode) }}
                  onMouseDown={() => { setShowPasscode(!showPasscode) }}
                  aria-label="toggle password visibility"
                >
                  {showPasscode ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              </InputAdornment>
            }
          />
        </FormControl>
        <DialogActions>
          <Button type="submit">{i18n.connect.connectBtn}</Button>
        </DialogActions>
      </Form>
    </Card>
  );
};