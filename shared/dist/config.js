import fs from "fs";
import { findFileInFileTree } from "./file.js";
import path from "path";
import { listenable } from "./foundation.js";
import chokidar from "chokidar";
export function findConfig(args) {
    const { rootDir, filename, defaultConfig } = args;
    function readConfig(configFile) {
        const config = Object.assign({}, defaultConfig, JSON.parse(fs.readFileSync(configFile).toString()));
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        return config;
    }
    const curDir = rootDir;
    let configFile = findFileInFileTree(curDir, filename);
    if (!configFile) {
        configFile = path.join(curDir, filename);
        fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
        throw new Error(`Configuration not found. ${configFile} is created.`);
    }
    const config = listenable(readConfig(configFile));
    chokidar.watch(configFile, {
        ignoreInitial: true,
    }).on("all", (event, filePath) => {
        console.log(`[${event}] Configuration was changed. ${filePath}`);
        try {
            config.value = readConfig(filePath);
        }
        catch (e) {
        }
    });
    return config;
}
//# sourceMappingURL=config.js.map