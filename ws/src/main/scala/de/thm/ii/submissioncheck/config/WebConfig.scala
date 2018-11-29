package de.thm.ii.submissioncheck.config

import java.util
import de.thm.ii.submissioncheck.misc.ScalaObjectMapper
import org.springframework.context.annotation.{Bean, Configuration}
import org.springframework.http.converter.HttpMessageConverter
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter
import org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport

/**
  * Additional configuration for SpringBoot.
  * @author Andrej Sajenko
  */
@Configuration
class WebConfig extends WebMvcConfigurationSupport {
  /**
    * Add the scala json mapper to http converters.
    * @return HTTP / JSON Mapper
    */
  @Bean
  def customJackson2HttpMessageConverter: MappingJackson2HttpMessageConverter = {
    val jsonConverter = new MappingJackson2HttpMessageConverter
    val objectMapper = new ScalaObjectMapper
    // objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
    jsonConverter.setObjectMapper(objectMapper)
    jsonConverter
  }

  /**
    * Configure defaults message converts.
    * @param converters The list of converts.
    */
  override def configureMessageConverters(converters: util.List[HttpMessageConverter[_]]): Unit = {
    converters.add(customJackson2HttpMessageConverter)
    super.addDefaultHttpMessageConverters(converters)
  }
}
