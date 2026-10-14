# Hotel Management Sysora

The repository is split into two applications:

- `backend/` — Spring Boot API and Maven project
- `hotel-frontend/` — React and Vite frontend

## Run the backend

From the repository root in PowerShell:

```powershell
cd backend; .\mvnw.cmd spring-boot:run
```

Or, from inside `backend/`:

```powershell
.\mvnw.cmd spring-boot:run
```

On macOS/Linux, run `./mvnw spring-boot:run` from inside `backend/`.

## Run the frontend

From the repository root:

```powershell
cd hotel-frontend
npm install
npm run dev
```

To run the frontend and backend together without Docker, install the root
dependencies once with `npm install`, then run `npm run dev` from the repository
root. This starts Vite from `hotel-frontend/` and Spring Boot from `backend/`.

The backend API runs on port 8080 by default. Backend testing notes are in
[`backend/TESTING.md`](backend/TESTING.md).

## Run the full app with Docker Compose

Install Docker Desktop and set the Neon JDBC URL in the root `.env` file next to
`compose.yaml`. Add the other backend secrets you use locally to that file:

```dotenv
NEON_DATABASE_URL=jdbc:postgresql://YOUR-HOST/YOUR-DATABASE?sslmode=require
HOTEL_BOOTSTRAP_ADMIN_EMAIL=admin@example.com
HOTEL_BOOTSTRAP_ADMIN_PASSWORD=Choose-A-Strong-Password1!
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

The application runs Flyway migrations on startup. Keep `.env` private and out
of source control. For running Spring Boot directly instead of Compose, export
`NEON_DATABASE_URL` in the shell first.

On a fresh Neon database, the bootstrap email and password create the first
administrator at backend startup. After you sign in and confirm the account
works, remove `HOTEL_BOOTSTRAP_ADMIN_PASSWORD` from `.env` and restart. The
administrator can create accounts and assign roles from the Users screen.

Then run from the repository root:

```sh
docker compose up --build
```

Open the frontend at <http://localhost:5173>; the API is available at
<http://localhost:8080>. The frontend source is mounted into the container, so
Vite reloads changes as you work. Stop both services with `Ctrl+C`; run
`docker compose down` to stop and remove the containers.

## Deploy the backend on Render

Create a Render Web Service with **Language: Docker**, set **Root Directory** to
`backend`, and set **Dockerfile Path** to `Dockerfile`. The Dockerfile builds
with Maven and Java 17, then runs the packaged Spring Boot application; Render
does not need separate build or start commands.

Add `NEON_DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` as Render environment variables. For a fresh database,
also set `HOTEL_BOOTSTRAP_ADMIN_EMAIL` and `HOTEL_BOOTSTRAP_ADMIN_PASSWORD`, then
remove the password after the first admin is created. `CORS_ALLOWED_ORIGINS`
accepts comma-separated origins or
origin patterns. For Vercel deployments, use
`https://hotel-management-sysora.vercel.app,https://hotel-management-sysora-*.vercel.app`
to allow the stable site and this project's generated deployment URLs. The
application uses these as defaults. If the variable is already set on Render,
update it to include both entries because it overrides the defaults.



npm install
npm install --prefix hotel-frontend
npm run dev
