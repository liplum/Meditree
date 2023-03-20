// Import required modules
import { Button, TextField, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, DialogActions, DialogTitle } from '@mui/material';
import React, { useState } from 'react';
import {
  redirect,
  Form,
} from 'react-router-dom';

import {
  backend,
  storage
} from "./env.js"
import "./connect.css"
import { i18n } from './i18n.js';
import { removePrefix } from './utils.jsx';

/**
 * Handle log in
 */
export async function action({ request }) {
  const formData = await request.formData()
  const info = Object.fromEntries(formData)
  if (info.server.startsWith("http://")) {
    info.server = removePrefix(info.server, "http://")
  } else if (info.server.startsWith("https://")) {
    info.server = removePrefix(info.server, "https://")
  }
  storage.lastConnected = info
  if (info.passcode) {
    return redirect(`/connect?protocol=${info.protocol}&server=${info.server}&passcode=${info.passcode}`)
  } else {
    return redirect(`/connect?protocol=${info.protocol}&server=${info.server}`)
  }
}


const serverPattern = /^((http|https):\/\/)?[^\s/$.?#].[^\s]*$/;
export function ConnectDialog(props) {
  const lastConnected = storage.lastConnected
  const [server, setServer] = useState(lastConnected?.server)
  // true means "http", while false means "https"
  const [protocol, setProtocol] = useState(lastConnected?.protocol ?? "http")
  return (
    <div id="connect-dialog">
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
        <TextField
          multiline
          rows={3}
          type="password"
          label={i18n.connect.passcode}
          placeholder={i18n.connect.passcodePlaceholder}
          defaultValue={lastConnected?.passcode}
          name="passcode"
        />
        <DialogActions>
          <Button type="submit">{"Connect"}</Button>
        </DialogActions>
      </Form>
    </div>
  );
};