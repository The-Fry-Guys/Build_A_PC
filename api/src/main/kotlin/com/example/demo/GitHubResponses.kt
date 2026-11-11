package com.example.demo

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

/** Internal token response; never return or log this object. */
@JsonIgnoreProperties(ignoreUnknown = true)
internal class GitHubTokenResponse(
    @param:JsonProperty("access_token")
    val accessToken: String? = null,
    val error: String? = null,
)

/** GitHub's stable user ID and optional display information. */
@JsonIgnoreProperties(ignoreUnknown = true)
internal class GitHubUserResponse(
    val id: Long? = null,
    val login: String? = null,
    val name: String? = null,
)

/** Email verification information obtained directly from GitHub. */
@JsonIgnoreProperties(ignoreUnknown = true)
internal class GitHubEmailResponse(
    val email: String? = null,
    val primary: Boolean = false,
    val verified: Boolean = false,
)
