# ADR-0001: Choose Supabase for Database Hosting

**Status:** Accepted <br>
**Date:** Sprint 1 (11/4/2026) <br>
**Deciders:** The-Fry-Guys <br>
**Supersedes:** none <br>
**Related PR(s):** None just yet

---

## Context

While designing the project, we considered Railway and Supabase as database hosts.
We decided Supabase was a better fit for the project and its OAuth plans. The application
API, including the OAuth flow, is implemented separately in Spring Boot and hosted on Render.
Supabase can generate a REST API from its database, but that is not the project's application API.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| Railway | Was considered as a hosted database provider. | We expected it would make the project's OAuth integration harder, so it was not the preferred fit. |
| Supabase | We judged it a better fit for the project design and OAuth plans. | Requires configuring the database and its connection to the Spring Boot API. |

## Decision

We will use Supabase to host the project database from the start. The Spring Boot API on Render
will connect to it; the generated Supabase REST API is not the project's application API.

## Consequences

- **Good:** We can create and configure its database on the selected platform from the start.
- **Bad:** The API must be configured with Supabase connection details, which must be kept secret (`.env`).
- **Follow-up:** Create the Supabase database and configure the Spring Boot API on Render to connect to it.