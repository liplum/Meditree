// Import required modules
import { Button, TextField, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel } from '@mui/material';
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
  const { server, passcode, protocol } = info
  storage.lastConnected = info
  return redirect(`/connect?protocol=${protocol}&server=${server}`)
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
      <Form method="post" id="connect-form" style={{ flexDirection: "column", display: "flex" }}>
        <FormControl style={{ alignSelf: "center" }}>
          <RadioGroup name="protocol" row value={protocol} onChange={(e) => {
            setProtocol(e.target.value)
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
              setServer(removePrefix(url, "http://"))
              setProtocol("http")
            } else if (url.startsWith("https://")) {
              setServer(removePrefix(url, "https://"))
              setProtocol("https")
            } else {
              setServer(url)
            }
          }}
          label={i18n.connect.server}
        />
        <TextField
          multiline
          rows={3}
          type="password"
          label={i18n.connect.passcode}
          name="passcode"
        />
        <br />
        <Button type="submit">{"Connect"}</Button>
      </Form>
    </div>
  );
};