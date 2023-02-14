# Homestreaming

## How to Build

### Environment Setup

Step 1: Run `npm install` and `npm link` in `shared` project.

```shell
cd ./shared
npm install
npm link
```

Step 2: Run `npm link homestreaming-shared` and `npm install` in `backend` and `homstreaming` subprojects.

```shell
cd ../backend
npm link homestreaming-shared
npm install
cd ../homestreaming
npm link homestreaming-shared
npm install
```
