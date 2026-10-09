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

The backend API runs on port 8080 by default. Backend testing notes are in
[`backend/TESTING.md`](backend/TESTING.md).

## Deploy the backend on Render

Create a Render Web Service with **Language: Docker**, set **Root Directory** to
`backend`, and set **Dockerfile Path** to `Dockerfile`. The Dockerfile builds
with Maven and Java 17, then runs the packaged Spring Boot application; Render
does not need separate build or start commands.

Add `FIREBASE_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` as Render environment variables. Provide the Firebase
service account as a Render secret file and set `GOOGLE_APPLICATION_CREDENTIALS`
to its mounted path.
