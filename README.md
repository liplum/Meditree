# Meditree

## Backend

### Node.js /backend-js

Run `npm start` to compile and start the server.

```shell
npm install
npm start
```

When you first start the server, an error will be thrown,
which will prompt you to configure it.

A file named `meditree.json` will then be generated in the current working directory.
From there, you can move this file up the file tree until you reach the root "/" directory.

### Go /backend-go

Run `go build main.go` to compile and start the server.

## Frontend

### React /web-react

A SPA(single-page application) in JavaScript and React.

#### Features

1. The ability to connect to a server on one page. Therefore, users can connect to multiple servers by opening a new page.
2. Direcotry-Tree-like view makes it easy to browse files in a place.
3. Finding files in the root directory case-insensitively.
4. Client-side routing is for better loading UX and dissolve the server-side overhead. Note you can share others any URL, and they will open the same file.

#### Get Started

Run `npm run dev` to start the website.
Run `npm run build` to build for production.

```shell
npm install
npm run dev
npm run build
```

You can configure the host and port in the [Vite config file](/web-react/vite.config.js).

### Vue /web-vue

Run `npm run dev` to start the website.
Run `npm run build` to build for production.

```shell
npm install
npm run dev
npm run build
```

You can configure the host and port in the [Vite config file](/web-vue/vite.config.js).

## Application

### Flutter /app-flutter

Run `flutter pub get` to in stall dependencies.
Run `flutter build <target>` to build for production.

## Deployment

You can combine ANY frontend implmenetation with ANY backend implmenetation
on the same server or multiple servers for free.

Here's an example to deploy the `backend-js` + `web-react` + `nginx`.

First, run `npm run build` to build the bundled production of `web-react`.

Then you can configure the `meditree.json` like below.
Note when you runs the `backend-js`, some essential settings will be generated on the fly.

```json
{
  "name": "My-Meditree-Node", # better to be unique.
  "port": 8080, # 8080 doesn't require sudo on linux.
  "root": "/path/to/root", # [optional] the root direcotry of a local file tree.
  "rebuildInterval": 3000, # [optional] how often to rebuild the local file tree when watching changes.
  "plugin": {
    "homepage": { # Use homepage plugin to serve a static webiste.
      "root": "/path/to/web-react/dist"
    }
  },
}
```

After configuring, run `npm start` in `backend-js`.
You can access the "http://localhost:8080" to check if the homepage is available,
and access "http://localhost:8080/list" to ensure the backend is working.

Finally, configure the nginx for port forwarding.

```nginx
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
