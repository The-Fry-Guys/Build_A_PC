# Runbook

Target: Expo web/Android, Spring Boot on Render, Supabase PostgreSQL. Production
URLs, release automation, and deployment access still need team confirmation.

## Deploy

1. Review the release commit and passing teammate CI checks. Run the checks in
   [admin tools](admin-tools.md#checks-for-the-reviewer-to-run); confirm the required
   vertical slice separately. Create a tagged GitHub release for the approved commit.
2. Deploy that exact commit to the Render API service using `api/Dockerfile` with
   repository-root build context. Configure database credentials, signing key,
   provider credentials/callbacks, and the HTTPS CORS origin through hosting secrets.
   Never enable `e2e`; use the production profile.
3. Publish matching web and Android builds with the reachable HTTPS API URL ending
   in `/api/v1`. Frontend settings contain public client IDs only.
4. Confirm `/actuator/health` returns 200/UP, then check sign-in, parts, and admin
   denial for a regular account. Record tag, commit, deployment, and app versions.

## Roll back and forward

Select the previous known-good tagged deployment in Render and restore its matching
web/app release when needed. Check database compatibility first; do not undo data or
run destructive schema changes. Recheck health and sign-in. To roll forward, deploy
the corrected tagged commit and repeat those checks. Rehearse on a test deployment.

## Rotate a secret

Replace a leaked provider secret at GitHub, update Render's secret, and restart the
API. For the app signing key, securely generate at least 32 random bytes, update
`APP_JWT_SECRET_BASE64`, and restart every API instance together. Existing JWTs become
invalid; users must sign in again. Rotate database credentials in Supabase and update
every API instance when affected. Verify health/login; never paste secrets into
tickets, logs, or commits.

## Logs and health

Use Render's service logs, or `docker compose logs --tail 100 api` from `api/` for
the local stack. Check `/actuator/health`: 200/UP is healthy; 503/DOWN indicates a
failed dependency. Correlate failures by time and route. Request-ID logging is still
pending; the required request-ID demonstration cannot yet be claimed.

## Database unreachable

Check Supabase service status, connectivity, configured pooler host/port, and the
project-qualified database username. Check credentials through the secret manager,
not logs. Check connection usage across instances; each normal API pool allows three
connections. Restore connectivity and confirm health plus a parts query. Show the
client's error/retry state while unavailable; do not substitute fabricated data.

## Local checks

Follow [README setup](../README.md) and [isolated acceptance tests](admin-tools.md#isolated-web-acceptance-test).
The disposable e2e stack is for testing only. Stop it afterward to release port 8080.
