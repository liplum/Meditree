package net.liplum.meditree
import kotlinx.serialization.*

@Serializable
class Configuration(
    val port: Int = 80,
    val root: String?,
)
