package net.liplum.meditree
import kotlinx.serialization.*
import org.springframework.boot.context.properties.ConfigurationProperties

@Serializable
@ConfigurationProperties(prefix = "meditree")
data class MeditreeConfiguration(
    val root: String? = null,
)
