# Meditree

## Backend

### Node.js /backend-js

This is an Express.js server that provides the following features:

1. It serves a local file tree on the file system and monitors changes made to it.
2. It supports plugins to add more features.

To learn more about `backend-js`, please refer to its [README](/backend-js/README.md).

### Go /backend-go

To learn more about `backend-go` please refer to its [README](/backend-go/README.md).

## Frontend

### React /web-react

This is a single-page application (SPA) created with JavaScript and React Functional Component.
It offers the following features:

1. A directory-tree-like view that makes it easy to browse files in one place.
2. Case-insensitive file search in the root directory.
3. Client-side routing for a better loading experience and to reduce server-side overhead.
4. The same URL will end up with the same file. This can be shared across `web-react` and `web-vue`.

To learn more about `web-react` please refer to its [README](/web-react/README.md).

### Vue /web-vue

This is a single-page application (SPA) created with TypeScript and Vue3 Composition API.
It offers the following features:

1. A file-explorer-like view makes more sense for users.
2. Case-insensitive file search in the current directory.
3. Client-side routing for a better loading experience and to reduce server-side overhead.
4. The same URL will end up with the same file. This can be shared across `web-react` and `web-vue`.

To learn more about `web-vue` please refer to its [README](/web-vue/README.md).

## Application

### Flutter /app-flutter

To learn more about `app-flutter` please refer to its [README](/app-flutter/README.md).

## Deployment

You can combine ANY frontend implmenetation with ANY backend implmenetation
on the same server or multiple servers for free.

Here's an example to deploy the `backend-js` + `web-react` + `nginx`.

First, run `npm run build` to build the bundled production of `web-react`.

Then you can configure the `meditree.json` like below.
Note when you runs the `backend-js`, some essential settings will be generated on the fly.

```json5
{
  "name": "My-Meditree", // Name to show.
  "port": 8080, // 8080 doesn't require sudo on linux.
  "root": "/path/to/root", // [optional] the root direcotry of a local file tree.
  "plugin": {
    "homepage": { // Use homepage plugin to serve a static webiste.
      "root": "/path/to/web-react/dist"
    },
    "watch": true // Use watch plugin to watch local file changes.
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

    # For example, serving the backend on 8080 port locally, and proxy it to 80 port and "/" externally.
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Interface

### Payload structure

```ts
interface File {
  "*type": string
  "*tag"?: Record<string, object>
  "*hide"?: boolean
  size?: string
}

interface Directory {
  "*tag"?: Record<string, object>
  "*hide"?: boolean
  [name: string]: File | Directory | any
}
```

### Example

```json5
{
  "name": "MyServer",
  "root": {
      // path: `/myText.txt`
      "myText.txt": {
        "*type": "text/plain",
      },
      // path: `/myFolder`
      "myFolder": {
        // path: `/myFolder/myVideo.mp4`
        "myVideo.mp4": {
          "*type": "video/mp4",
        }
      }
  }
}
```

