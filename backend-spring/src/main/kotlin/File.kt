package net.liplum.meditree

import java.nio.file.Files
import java.nio.file.Paths

interface IFile {
    val name: String
    val path: String
    val size: Int
}

class LocalFile(
    val parent: LocalFileTree,
    override val name: String,
    override val path: String,
    override val size: Int,
) : IFile {
}

class LocalFileTree(
    val parent: LocalFileTree?,
    val path: String,
) {

}

fun buildLocalFileTree(){

}

fun findFsEntryInTree(root: String, fileName: String): String? {
    var dir = root
    var lastDir: String? = null
    while (dir != lastDir) {
        val configFile = Paths.get(dir, fileName).toString()
        if (Files.exists(Paths.get(configFile))) {
            return configFile
        } else {
            lastDir = dir
            dir = Paths.get(dir).parent.toString()
        }
    }
    return null
}
