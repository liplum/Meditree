package net.liplum.meditree

import java.io.File

interface IFile {
    val name: String
    val path: String
    val size: Long
}

class LocalFile(
    val parent: LocalFileTree,
    override val name: String,
    val local: File,
    override val path: String,
    override val size: Long,
) : IFile {

}

class LocalFileTree(
    val parent: LocalFileTree?,
    val local: File,
    val path: String,
) {
    val name2File: MutableMap<String, LocalFile> = mutableMapOf()
    val isRoot: Boolean = parent == null
}

fun buildFileTreeFromLocal(root: File): LocalFileTree {
    fun walk(curDir: File, tree: LocalFileTree) {
        val files = curDir.listFiles() ?: return
        for (file in files) {
            if (file.isFile) {
                tree.name2File[file.name] = LocalFile(
                    parent = tree,
                    name = file.name,
                    local = file,
                    path = "${tree.path}/${file.name}",
                    size = file.length()
                )
            } else if (file.isDirectory) {
                val fileTree = LocalFileTree(
                    parent = tree,
                    local = file,
                    path = "${tree.path}/${file.name}",
                )
                walk(file, fileTree)
            }
        }
    }

    val rootTree = LocalFileTree(
        parent = null,
        local = root,
        path = ""
    )
    walk(root, rootTree)
    return rootTree
}

fun findFsEntryInTree(root: File, fileName: String): File? {
    var dir = root
    var lastDir: File? = null
    while (dir != lastDir) {
        val configFile = dir.resolve(fileName)
        if (configFile.exists()) {
            return configFile
        } else {
            lastDir = dir
            dir = configFile.parentFile
        }
    }
    return null
}
