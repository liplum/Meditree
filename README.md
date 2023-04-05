# Meditree

## Get Started

### Backend

#### Node.js /backend-js

Run `npm start` to compile and start the server.

```shell
npm install
npm start
```

When you first start the server, an error will be thrown,
which will prompt you to configure it.

A file named `meditree.json` will then be generated in the current working directory.
From there, you can move this file up the file tree until you reach the root "/" directory.

#### Go /backend-go

Run `go build main.go` to compile and start the server.

### Frontend

### React Website /web-react

Run `npm run dev` to start the website.
Run `npm run build` to build for production.

```shell
npm install
npm run dev
npm run build
```

You can configure the host and port in the [Vite config file](/web-react/vite.config.js).

### Vue Website /web-vue

Run `npm run dev` to start the website.
Run `npm run build` to build for production.

```shell
npm install
npm run dev
npm run build
```

You can configure the host and port in the [Vite config file](/web-vue/vite.config.js).

### Deployment

You can deploy both frontend and backend on the same server if you'd like.
Here's an example of how to configure the Nginx.

```nginx
server {
    listen 80;
    server_name your_site.com;
    proxy_intercept_errors off;

    # For example, serving the frontend on 8080 port internally and "/" externally.
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # Catch-all route for client-side routing
        try_files $uri $uri/ /index.html;
    }
    
    location /assets {
        proxy_pass http://localhost:8080/assets;
        expires 1h;
        add_header Cache-Control "public";
    }

    # Serve favicon.ico
    location = /favicon.ico {
        proxy_pass http://localhost:8080/assets;
    }
    
    # For example, serving the backend on 8081 port internally and "/media" externally.
    location /media {
        # Remove "media" prefix.
        rewrite ^/media(/.*)?$ $1/ break;
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # For Meditree node communication via websocket.
    location /media/ws {
        proxy_pass http://localhost:8081/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
