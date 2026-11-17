# Runbook

Target: Expo web/Android, Spring Boot on Render, Supabase PostgreSQL. Production
URLs, release automation, and deployment access still need team confirmation.

## Deploy

1. Ensure you're in the root of the project. To launch the app using the Render hosted
   API, you can use this command: `docker compose up --build`. Please allow for
   up to 3 minutes for the Render API to start up.
   - If you're on MacOS or Linux or WSL you can use `curl -i https://build-a-pc-w99e.onrender.com/actuator/health`
     to check if the API is successfully running.
   - Once it is, refresh the app or the website.
   - You can also click on `https://build-a-pc-w99e.onrender.com/` to see if Render API is actually up, **this is the most common issue so if something is not working check on this**
2. If you have the `.env` files loaded into your project and want to host the API locally do:
   `EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1 docker compose --profile local up --build`
3. After choosing which type of API hosing you'd like to access and running one of the commands
   you can go to `http://localhost:8081` to view the frontend.

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

For the class visitor exercise, use the [onboarding checklist](onboarding.md) to
record each command, result, blocker, host/visitor assignment, and triage owner.
