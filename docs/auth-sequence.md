# GitHub OAuth sequence

Implemented for Expo web and Android. Spring Boot exchanges the code and issues
the app JWT; Supabase hosts PostgreSQL only, not authentication endpoints.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as Expo web / Android
    participant Browser as Popup / Android browser
    participant GitHub
    participant API as Spring Boot API
    participant DB as PostgreSQL

    User->>App: Tap Sign in with GitHub
    App->>App: Generate state, PKCE verifier and S256 challenge
    App->>Browser: Open authorization URL with challenge, state and callback
    Browser->>GitHub: Sign in and authorize user:email
    GitHub-->>Browser: Redirect with single-use code and state
    Browser-->>App: Web /auth or Android client://auth
    App->>App: Validate state and retain original verifier
    App->>API: POST /api/v1/auth/github {code, codeVerifier, redirectUri}
    API->>API: Validate input and exact callback allowlist
    API->>GitHub: Exchange code using verifier and server-held client secret
    GitHub-->>API: GitHub access token
    API->>GitHub: GET /user and GET /user/emails
    GitHub-->>API: Numeric provider ID and verified primary email
    API->>DB: Transaction: find identity or create user and identity
    Note over API,DB: Existing identity reuses user. Conflicting email returns 409 without linking.
    DB-->>API: Persisted user and role
    API->>API: Sign short-lived app JWT (HS256, default 1 hour)
    API-->>App: 200 {token, user}, Cache-Control: no-store
    App->>App: Store app JWT in SecureStore / web sessionStorage
    App->>API: GET /api/v1/me with Bearer app JWT
    API->>API: Validate signature, issuer, expiry and UUID subject
    API->>DB: Load current user by UUID
    DB-->>API: Public profile fields
    API-->>App: 200 user profile, Cache-Control: no-store
```

- Client secrets and GitHub access tokens stay on the API. The client receives
  only the app JWT; browser callbacks carry the code and state, not tokens.
- Invalid input/code/verifier, an unapproved callback, or no verified primary email
  returns 400. An existing email under another provider returns 409 naming it;
  unusable GitHub responses return 502. Rejected identities create no account.
- App startup restores the saved JWT through `/me`. Invalid/expired tokens or
  unavailable accounts return 401 and clear the saved session. Network failures
  preserve the token and allow retry.
- Cancellation makes no exchange request. Android callbacks without a pending
  request offer a fresh sign-in; interrupted sign-ins are not resumed after app death.
- Logout removes local token/profile state. It does not revoke GitHub authorization
  or an already issued JWT. Refresh tokens and account linking are not implemented.

Google remains planned and is not represented as an implemented flow here.
