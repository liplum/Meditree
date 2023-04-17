# JavaScript Backend

## Getting Started

Run `npm start` to compile and start the server.

```shell
npm install
npm start
```

When you first start the server, an error will be thrown,
which will prompt you to configure it.

A file named `meditree.json` will then be generated in the current working directory.
From there, you can move this file up the file tree until you reach the root "/" directory.

## Plugins

`backend-js` supports loading built-in plugins and external plugins from file.

The key can be a built-in plugin name or an external plugin path,
and the value is an object for configuring the plugin.

```json5
"plugin": {
  // loading built-in plugins
  "cache": {},
  "minify": {
    "removeHidden": true,
    "removePath": true
  },
  // loading external plugins from file
  "path/to/plugin.js":{
    "myConfig": true
  }
}
```

Built-in plugins:

- [cache](#cache): for caching files from subnodes.
- [homepage](#homepage): for hosting a static website.
- [minify](#minify): for minifying list json for client rendering.
- [statistics](#statistics): for counting file access times.
- [watch](#watch): for watching the root directory changing and frequently rebuilding file tree.
- [hls](#hls):

### Cache

Properties:

- **`maxSize`** (number?): The maximum file size, in bytes, that can be cached. Defaults to 10MB.
- **`maxAge`** (number?): The maximum time, in milliseconds, that a file can be cached before it is invalidated. Defaults to 24 hours.
- **`root`** (string?): The root directory for the cache. Defaults to "meditree-cache".

Example:

```json5
{
  "maxSize": 5242880, // Cache files with a maximum size of 5MB.
  "maxAge": 3600000, // Invalidate cached files after 1 hour (3600000 milliseconds).
  "root": "./my-cache-directory" // Use the directory "./my-cache-directory" as the root directory for the cache.
}
```

### Homepage

Properties:

- **`root`** (string?): The root path for static resources. By default, a simple built-in homepage will be served.
- **`requirePasscode`** (boolean?): Whether the built-in homepage requires a passcode to access. True by default.

Example:

```json5
{
  "root": "./public", // Serve static resources from the "./public" directory.
  "requirePasscode": false // Allow access to the built-in homepage without a passcode.
}
```

### Minify

Properties:

- **`removeHidden`** (boolean?): Whether to remove hidden files and folders from the entire tree. False by default.
- **`removeSize`** (boolean?): Whether to remove size information from the minified output. False by default.
- **`removePath`** (boolean?): Whether to remove path from the minified output. If so, client will take the responsibility to compose it. False by default.

Example:

```json5
{
  "removeHidden": true, // Remove hidden files and folders from the entire tree.
  "removeSize": true, // Remove size information from the minified output.
  "removePath": true // Remove path from the minified output.
}
```

### Statistics

### Hls

### Watch
