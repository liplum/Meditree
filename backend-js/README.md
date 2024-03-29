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
  "minify": {
    "removeHidden": true,
    "removeSize": true
  },
  // loading external plugins from file
  "path/to/plugin.js":{
    "myConfig": true
  }
}
```

Built-in plugins:

- [homepage](#homepage): for hosting a static website.
- [minify](#minify): for minifying list json for client rendering.
- [statistics](#statistics): for counting file access times.
- [watch](#watch): for watching the root directory changing and frequently rebuilding file tree.
- [hls](#hls):
- [jsondb](#jsondb):

### Homepage

Properties:

- **`root`** (string?): The root path for static resources. By default, a simple built-in homepage will be served.
- **`requireAuth`** (boolean?): Whether the built-in homepage requires authentication. True by default.

Example:

```json5
{
  "root": "./public", // Serve static resources from the "./public" directory.
  "requireAuth": false // Allow access to the built-in homepage without authentication.
}
```

### Minify

Properties:

- **`removeHidden`** (boolean?): Whether to remove hidden files and folders from the entire tree. True by default.
- **`removeSize`** (boolean?): Whether to remove size information from the minified output. True by default.

Example:

```json5
{
  "removeHidden": true, // Remove hidden files and folders from the entire tree.
  "removeSize": true, // Remove size information from the minified output.
}
```

### Statistics

### Hls

### Watch

### JsonDB

[JsonDB](https://github.com/Belphemur/node-json-db)
