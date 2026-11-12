package com.example.demo

import org.springframework.boot.CommandLineRunner
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.Bean

/** Starts the Spring Boot API and its configured services. */
@SpringBootApplication
class Application {

	/** Lists registered beans after application startup. */
	@Bean
	fun commandLineRunner(ctx: ApplicationContext) = CommandLineRunner {
		println("Let's inspect the beans provided by Spring Boot:")
		val beanNames = ctx.beanDefinitionNames
		beanNames.sorted().forEach { println(it) }
	}
}

/** Launches the API with command-line arguments. */
fun main(args: Array<String>) {
	runApplication<Application>(args = args)
}
