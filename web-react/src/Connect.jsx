// Import required modules
import { Button, TextField, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, DialogActions, DialogTitle, Card, CardActions, InputAdornment, IconButton, OutlinedInput, InputLabel } from '@mui/material';
import React, { useEffect, useState } from 'react';
import {
  redirect,
  Form,
} from 'react-router-dom';

import {
  storage, updatePageTitle
} from "./Env.js"
import "./Connect.css"
import { i18n } from './I18n.js';
import { makeUrl, removePrefix } from './Utils.js';
import { Visibility, VisibilityOff } from '@mui/icons-material';

export async function load() {
  const backendUrl = import.meta.env.VITE_BACKEND
  const passcode = import.meta.env.VITE_PASSCODE
  if (backendUrl) {
    const protocol = backendUrl.startsWith("https://") ? "https" : "http"
    const server = protocol === "https" ? removePrefix(backendUrl, "https://") : removePrefix(backendUrl, "http://")
    if (passcode) {
      return redirect(`/connect?protocol=${protocol}&server=${server}&passcode=${passcode}`)
    } else {
      return redirect(`/connect?protocol=${protocol}&server=${server}`)
    }
  }
  return null
}

/**
 * Handle log in
 */
export async function action({ request }) {
  const formData = await request.formData()
  let { server, protocol, passcode } = Object.fromEntries(formData)
  if (server.startsWith("https")) {
    server = removePrefix(server, "https://")
  } else if (server.startsWith("http://")) {
    server = removePrefix(server, "http://")
  }
  server = `${protocol}://${server}`
  storage.lastConnected = {
    server,
    passcode,
    protocol,
  }
  return redirect(makeUrl("/connect?", {
    server: server,
    passcode: passcode ? passcode : undefined,
  }))
}

const serverPattern = /^((http|https):\/\/)?[^\s/$.?#].[^\s]*$/;
export function ConnectDialog(props) {
  useEffect(() => {
    updatePageTitle(i18n.connect.title)
  }, [])
  const lastConnected = storage.lastConnected
  const [server, setServer] = useState(lastConnected?.server ?? window.location.href)
  // true means "http", while false means "https"
  const [protocol, setProtocol] = useState(lastConnected?.protocol ?? "http")
  const [showPasscode, setShowPasscode] = useState(false)
  return (
    <Card id="connect-dialog">
      <h1>{i18n.connect.title}</h1>
      <Form method="post" id="connect-form" style={{
        flexDirection: "column", display: "flex",
      }}>
        <FormControl style={{ alignSelf: "center" }}>
          <RadioGroup name="protocol" row value={protocol}
            onChange={(e) => {
              if (server.startsWith("http://")) {
                setProtocol("http")
              } else if (server.startsWith("https://")) {
                setProtocol("https")
              } else {
                setProtocol(e.target.value)
              }
            }}>
            <FormControlLabel value="http" label="HTTP" control={<Radio />} />
            <FormControlLabel value="https" label="HTTPS" control={<Radio />} />
          </RadioGroup>
        </FormControl>
        <TextField
          type="text" required
          autoFocus
          name="server"
          value={server}
          error={!serverPattern.test(server)}
          onChange={(e) => {
            const url = e.target.value
            if (url.startsWith("http://")) {
              setProtocol("http")
            } else if (url.startsWith("https://")) {
              setProtocol("https")
            }
            setServer(url)
          }}
          label={i18n.connect.server}
        />
        <FormControl variant="outlined">
          <InputLabel htmlFor="outlined-adornment-password">{i18n.connect.passcode}</InputLabel>
          <OutlinedInput
            type={showPasscode ? 'text' : 'password'}
            label={i18n.connect.passcode}
            placeholder={i18n.connect.passcodePlaceholder}
            defaultValue={lastConnected?.passcode}
            name="passcode"
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