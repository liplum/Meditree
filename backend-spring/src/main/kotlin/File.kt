package net.liplum.meditree

import java.nio.file.Files
import java.nio.file.Paths

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