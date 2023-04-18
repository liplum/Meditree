# Meditree

## Backend

### Node.js /backend-js

A express.js server.

Features:

1. To serve a local file tree and watch changes.
2. A plugin system to turn on additional features.

To learn more about `backend-js` please see its [README](/backend-js/README.md).

### Go /backend-go

To learn more about `backend-go` please see its [README](/backend-go/README.md).

## Frontend

### React /web-react

A SPA(single-page application) in JavaScript and React.

Features:

1. The ability to connect to a server on one page. Therefore, users can connect to multiple servers by opening a new page.
2. Direcotry-Tree-like view makes it easy to browse files in a place.
3. Finding files in the root directory case-insensitively.
4. Client-side routing is for better loading UX and dissolve the server-side overhead. Note you can share others any URL, and they will open the same file.

To learn more about `web-react` please see its [README](/web-react/README.md).

### Vue /web-vue

To learn more about `web-vue` please see its [README](/web-vue/README.md).

## Application

### Flutter /app-flutter

To learn more about `app-flutter` please see its [README](/app-flutter/README.md).

## Deployment

You can combine ANY frontend implmenetation with ANY backend implmenetation
on the same server or multiple servers for free.

Here's an example to deploy the `backend-js` + `web-react` + `nginx`.

First, run `npm run build` to build the bundled production of `web-react`.

Then you can configure the `meditree.json` like below.
Note when you runs the `backend-js`, some essential settings will be generated on the fly.

```json5
{
  "name": "My-Meditree-Node", // better to be unique.
  "port": 8080, // 8080 doesn't require sudo on linux.
  "root": "/path/to/root", // [optional] the root direcotry of a local file tree.
  "rebuildInterval": 3000, // [optional] how often to rebuild the local file tree when watching changes.
  "plugin": {
    "homepage": { // Use homepage plugin to serve a static webiste.
      "root": "/path/to/web-react/dist"
    },
    "watch": {
      // Use watch plugin to watch local file changes.
    }
  }
}
```

After configuring, run `npm start` in `backend-js`.
You can access the "http://localhost:8080" to check if the homepage is available,
and access "http://localhost:8080/list" to ensure the backend is working.

Finally, configure the nginx for port forwarding.

```ruby
server {
    listen 80;
    server_name your_site.com;

    # For example, serving the frontend on 8080 port internally and "/" externally.
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # For Meditree node communication via websocket.
    location /ws {
        proxy_pass http://localhost:8080/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Interface

The payload for client rendering:

```ts
interface File {
  "*type": string;
  "*hide"?: boolean;
  size?: string;
}

interface Directory {
  "*hide"?: boolean;
  [name: string]: File | Directory | any;
}
```

The payload for server communication:

```ts
interface File {
  "*type": string;
  "*hide"?: boolean;
  size: string;
}

interface Directory {
  "*hide"?: boolean;
  [name: string]: File | Directory | any;
}
```
