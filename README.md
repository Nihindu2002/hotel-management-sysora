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
