# Meditree

## Get Started

### Backend

Install the dependencies of `backend` subprojects.
Then run `npm start` to start the server.

```shell
cd backend
npm install
npm start
```

At the first time you start the server,
it will throw an error and require you to configure it,
then a file called `meditree.json` will be created in the root.

### Frontend Website

Install the dependencies of `meditree` subprojects.
Create a `.env.local` file in the root, and config it based on `.env` file.
Then run `npm run dev` to start the website.

```shell
cd web
npm install
npm run dev
```

You can configure the host and port in the [Vite config file](/web/vite.config.js).

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
        # Remove "media" path.
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
