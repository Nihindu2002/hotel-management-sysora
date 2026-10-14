# Backend testing and local setup

## Database and first administrator

Set `NEON_DATABASE_URL` to a Neon JDBC URL before starting the backend. Flyway
creates the PostgreSQL schema at startup. For a fresh database, set these two
additional environment variables once to create the first administrator:

```dotenv
HOTEL_BOOTSTRAP_ADMIN_EMAIL=admin@example.com
HOTEL_BOOTSTRAP_ADMIN_PASSWORD=use-a-unique-strong-password
```

The bootstrap runs only when no local authentication accounts exist. Remove the
bootstrap password from the deployment environment after the first account is
created. Existing user profiles can be given local passwords by that admin from
the Users screen after the password reset control is available.

## Run the automated tests

From `backend/`:

```bash
./mvnw test
```

The unit tests do not need external service credentials. The application context test
requires a reachable PostgreSQL database because the application uses Flyway
and the PostgreSQL JSONB document store.

## API login smoke check

After starting the backend and creating the first admin, log in with the
configured email and password:

```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{"email":"admin@example.com","password":"your-password"}
```

Use the returned `idToken` as a bearer token for API requests. Sessions expire
after eight hours and can be revoked through `POST /api/auth/logout`.
