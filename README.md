# Homestreaming

## Get Started

### Backend

Run `npm install` in `backend` subprojects.

```shell
cd backend
npm install
```

Then you should directly run the backend, and a configuration file,
called `homestreaming-config.json`, will be created.

```shell
npm run serve
```

After configuring the settings, you can run `npm run serve` again.

### Frotend

Run `npm install` in `homstreaming` subprojects.

```shell
cd homestreaming
npm install
```

Then you should setup the environment variables: `HOST` and `PORT`.

```shell
# This works on Linux, macOS and Windows WSL.
HOST="0.0.0.0" PORT=8000 npm run start
```
