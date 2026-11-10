# Build A PC Architecture

Target architecture, including planned Google and build/compatibility features.
See [the implemented GitHub OAuth sequence](auth-sequence.md) for current sign-in.

```mermaid
flowchart LR
    User --> App["Expo app \nWeb and Android"]
    App -->|"sign in"| OAuth["Google / GitHub"]
    App -->|"API requests with app JWT"| API["Spring Boot API"]
    API -->|"exchange code or verify identity"| OAuth
    API -->|"read and save parts and builds"| DB[("Supabase (Postgres)")]
    API -->|"build and compatibility results"| App
```

The Expo app runs on web and Android and uses the Spring Boot API for app features and sign-in.
The API runs on Render, connects to Supabase Postgres, and returns build and compatibility data
to the app.