# Architecture

## Context — C4 level 1

Members browse parts and manage PC builds. Administrators search users and parts.
GitHub sign-in works; Google sign-in is required but still planned.

```mermaid
flowchart LR
    Member["Member"] -->|"Browse parts and manage builds"| System["Build A PC"]
    Admin["Administrator"] -->|"Search users and parts"| System
    System <-->|"Sign in"| GitHub["GitHub"]
    System <-.->|"Sign in — planned"| Google["Google"]
```

## Containers — C4 level 2

Web and Android share Expo screens, session handling, and API client code. Supabase
hosts PostgreSQL; it is not the authentication provider. Render is the intended API
host; production deployment has not been verified here.

```mermaid
flowchart TB
    Person["Member or administrator"]
    subgraph System["Build A PC"]
        Web["Web client — Expo / React Native Web"]
        Android["Android client — Expo / React Native"]
        API["API — Spring Boot / Kotlin"]
        DB[("Database — Supabase PostgreSQL")]
        Web -->|"HTTPS JSON + app JWT"| API
        Android -->|"HTTPS JSON + app JWT"| API
        API -->|"SQL through JDBC / HikariCP"| DB
    end
    Person --> Web
    Person --> Android
    Web -->|"Authorization popup + PKCE"| GitHub["GitHub"]
    Android -->|"Browser + PKCE"| GitHub
    API -->|"Exchange code; fetch verified identity"| GitHub
    Web -.->|"Planned sign-in"| Google["Google"]
    Android -.->|"Planned native sign-in"| Google
    API -.->|"Planned ID token verification"| Google
```

The API issues a one-hour app JWT and enforces ownership and current database admin
roles. Android stores the token in SecureStore; web uses sessionStorage. Provider
secrets stay on the API. Local development uses HTTP; production must use HTTPS.

See [OAuth sequence](auth-sequence.md), [data model](erd.md),
[API contract](openapi.yaml), [security](security.md), and [decisions](adr/).
