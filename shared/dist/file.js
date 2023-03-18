import fs from "fs";
import path from "path";
import { promisify } from "util";
export class File {
    type;
    path;
    constructor(path, type = null) {
        this.path = path;
        this.type = type;
    }
    toJSON() {
        return {
            type: this.type,
            path: this.path
        };
    }
}
export function findFileInFileTree(dir, fileName) {
    let lastDir = null;
    while (dir !== lastDir) {
        const configFile = path.join(dir, fileName);
        if (fs.existsSync(configFile)) {
            return configFile;
        }
        else {
            lastDir = dir;
            dir = path.dirname(dir);
        }
    }
    return null;
}
export const statAsync = promisify(fs.stat);
export const readFileAsync = promisify(fs.readFile);
export const readdirAsync = promisify(fs.readdir);
const alwaysNull = (_) => null;
export class FileTree {
    classifier = alwaysNull;
    parent = null;
    allowNullFileType = false;
    name2File = new Map();
    rootPath;
    name;
    constructor(rootPath) {
        this.rootPath = rootPath;
        this.name = path.basename(rootPath);
    }
    get ancestorFullPath() {
        const parts = [];
        let curTree = this.parent;
        while (curTree != null) {
            parts.unshift(curTree.name);
            curTree = curTree.parent;
        }
        return parts.join("/");
    }
    resolveFile(filePath) {
        const parts = filePath.split("/");
        let currentFsEntry = this;
        while (parts.length > 0 && currentFsEntry instanceof FileTree) {
            const currentPart = parts.shift();
            if (currentPart === undefined)
                break;
            currentFsEntry = currentFsEntry.name2File.get(currentPart);
        }
        if (currentFsEntry instanceof File) {
            return currentFsEntry;
        }
        else {
            return null;
        }
    }
    get subtreeChildrenCount() {
        let total = 0;
        for (const file of this.name2File.values()) {
            if (file instanceof FileTree) {
                total += file.subtreeChildrenCount;
            }
            else {
                total++;
            }
        }
        return total;
    }
    addFileSystemEntry(name, file) {
        this.name2File.set(name, file);
    }
    removeFileSystemEntry(name) {
        this.name2File.delete(name);
    }
    static async createFrom(options) {
        const root = options.root;
        const stats = await statAsync(root);
        if (!stats.isDirectory()) {
            throw Error(`${root} isn't a directory`);
        }
        const tree = new FileTree(root);
        tree.classifier = options.classifier;
        tree.allowNullFileType = options.allowNullFileType;
        const pruned = options.pruned;
        const walk = async (tree, currentDirectory) => {
            let files;
            try {
                files = await readdirAsync(currentDirectory);
            }
            catch (e) {
                console.error(e.message);
                return;
            }
            for (const fileName of files) {
                const filePath = path.join(currentDirectory, fileName);
                try {
                    const stat = fs.statSync(filePath);
                    if (stat.isFile()) {
                        const fileType = tree.classifier(filePath);
                        if (tree.allowNullFileType || fileType != null) {
                            const file = new File(filePath, fileType);
                            tree.addFileSystemEntry(fileName, file);
                        }
                    }
                    else if (stat.isDirectory()) {
                        const subtree = tree.createSubtree(filePath);
                        tree.addFileSystemEntry(fileName, subtree);
                        await walk(subtree, filePath);
                        if (pruned && subtree.subtreeChildrenCount === 0) {
                            tree.removeFileSystemEntry(fileName);
                        }
                    }
                    else {
                        console.log("Unknown file type", filePath);
                    }
                }
                catch (e) {
                    continue;
                }
            }
        };
        await walk(tree, root);
        return tree;
    }
    createSubtree(rootPath) {
        const subtree = new FileTree(rootPath);
        subtree.allowNullFileType = this.allowNullFileType;
        subtree.classifier = this.classifier;
        subtree.parent = this;
        return subtree;
    }
    toJSON() {
        const obj = Object();
        for (const [name, file] of this.name2File.entries()) {
            if (file instanceof File) {
                obj[name] = file.type;
            }
            else if (file instanceof FileTree) {
                obj[name] = file.toJSON();
            }
        }
        return obj;
    }
}
//# sourceMappingURL=file.js.map