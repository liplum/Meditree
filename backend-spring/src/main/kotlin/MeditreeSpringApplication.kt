package net.liplum.meditree

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.runApplication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@SpringBootApplication
@EnableConfigurationProperties(MeditreeConfiguration::class)
class MeditreeSpringApplication

@RestController
class MessageController {
    @Autowired
    lateinit var config: MeditreeConfiguration
    @GetMapping("/")
    fun index(@RequestParam("name") name: String) = "Hello, $name!"
}

fun main(args: Array<String>) {
    runApplication<MeditreeSpringApplication>(*args)
}
