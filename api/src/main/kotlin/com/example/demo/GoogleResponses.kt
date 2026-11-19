package com.example.demo

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

/** Internal provider response; never return or log this object. */
@JsonIgnoreProperties(ignoreUnknown = true)
internal class GoogleTokenResponse(
    @param:JsonProperty("id_token")
    val idToken: String? = null,
    val error: String? = null,
)
