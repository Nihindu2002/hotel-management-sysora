# API Testing

## Prerequisites

1. In Firebase Console, enable **Authentication > Sign-in method > Email/Password**.
2. Create or select a Firestore database.
3. Configure credentials. For production, set `GOOGLE_APPLICATION_CREDENTIALS` to the service-account JSON path. The bundled JSON under `src/main/resources/firebase/` is a development-only fallback and is ignored by Git.
4. Start the application:

```bash
./mvnw spring-boot:run
```

The API runs at `http://localhost:8080`.

## A. Register a user

In Postman:

```http
POST http://localhost:8080/api/auth/register
Content-Type: application/json
```

Body, using **raw > JSON**:

```json
{
  "email": "john@gmail.com",
  "password": "Password@123",
  "firstName": "John",
  "lastName": "Perera",
  "phone": "0771234567"
}
```

The password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character. A successful response is:

```json
{
  "message": "User registered successfully",
  "uid": "firebase-user-id",
  "email": "john@gmail.com",
  "role": "CUSTOMER"
}
```

The password is sent to Firebase Authentication only. It is never stored in Firestore. The profile is stored at `users/{uid}` with role `CUSTOMER` and enabled status.

## B. Obtain a Firebase ID token

The backend does not provide a password login endpoint and does not create JWTs. Use Firebase Authentication to sign in and obtain an ID token.

For development, enable the Email/Password provider and use either:

- A frontend using the Firebase Web SDK `signInWithEmailAndPassword`, then call `getIdToken()`.
- The Firebase Identity Toolkit REST API `accounts:signInWithPassword` with your Firebase Web API key:

```http
POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_FIREBASE_WEB_API_KEY
Content-Type: application/json
```

```json
{
  "email": "john@gmail.com",
  "password": "Password@123",
  "returnSecureToken": true
}
```

Copy the response `idToken` value. Do not use the service-account private key as an API token.

## C. Authenticated request

```http
GET http://localhost:8080/api/secure-test
Authorization: Bearer FIREBASE_ID_TOKEN
```

A valid Firebase ID token for a registered, enabled user returns JSON containing the verified Firebase UID and email. Missing, malformed, expired, or invalid tokens return HTTP 401.

Expected response:

```json
{
  "message": "Authentication successful",
  "uid": "firebase-user-id",
  "email": "john@gmail.com"
}
```

## D. Customer role

```http
GET http://localhost:8080/api/customer/test
Authorization: Bearer FIREBASE_ID_TOKEN
```

A newly registered user has the `CUSTOMER` role and receives:

```json
{
  "message": "Customer endpoint accessible",
  "uid": "firebase-user-id",
  "email": "john@gmail.com",
  "role": "CUSTOMER"
}
```

## E. Role-based endpoint matrix

Set each test user's Firestore document at `users/{uid}` to the role shown below.
The document must also contain `enabled: true`. The role is read from Firestore
after Firebase verifies the bearer token; a role in a request body, query
parameter, or header is ignored.

| Endpoint | Allowed roles |
| --- | --- |
| `GET /api/admin/test` | `ADMIN` |
| `GET /api/manager/test` | `ADMIN`, `MANAGER` |
| `GET /api/reservations/test` | `ADMIN`, `MANAGER`, `RECEPTIONIST` |
| `GET /api/housekeeping/test` | `ADMIN`, `MANAGER`, `HOUSEKEEPING` |
| `GET /api/finance/test` | `ADMIN`, `MANAGER`, `ACCOUNTANT` |
| `GET /api/customer/test` | `CUSTOMER` |
| `GET /api/staff/test` | `ADMIN`, `MANAGER`, `STAFF` |

For every request, set the header:

```http
Authorization: Bearer FIREBASE_ID_TOKEN
```

Expected Postman checks:

| Token role | Request | Expected status |
| --- | --- | --- |
| `CUSTOMER` | `/api/customer/test` | 200 |
| `CUSTOMER` | `/api/admin/test`, `/api/manager/test` | 403 |
| `ADMIN` | `/api/admin/test`, `/api/manager/test`, `/api/reservations/test` | 200 |
| `MANAGER` | `/api/manager/test` | 200 |
| `MANAGER` | `/api/admin/test` | 403 |
| `RECEPTIONIST` | `/api/reservations/test` | 200 |
| `RECEPTIONIST` | `/api/finance/test` | 403 |
| `HOUSEKEEPING` | `/api/housekeeping/test` | 200 |
| `ACCOUNTANT` | `/api/finance/test` | 200 |
| `STAFF` | `/api/staff/test` | 200 |
| no token | any protected endpoint | 401 |

Missing Firestore profiles, `enabled: false`, malformed roles, invalid tokens,
and expired tokens also return 401. A valid authenticated user with a role not
allowed for the endpoint returns 403.

## F. Maintenance workflow

Maintenance tasks move through `PENDING → ASSIGNED → IN_PROGRESS → COMPLETED`, or
to `CANCELLED` from any state before completion.

| Endpoint | Allowed roles |
| --- | --- |
| `GET /api/maintenance/dashboard` | `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MAINTENANCE` |
| `GET /api/maintenance/tasks` | `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MAINTENANCE` |
| `GET /api/maintenance/tasks/{taskId}` | `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MAINTENANCE` |
| `GET /api/maintenance/rooms/{roomId}/tasks` | `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MAINTENANCE` |
| `GET /api/maintenance/my` | `MAINTENANCE` |
| `GET /api/inventory/items`, `/api/inventory/low-stock` | `ADMIN`, `MANAGER`, `RECEPTIONIST`, `STAFF`, `HOUSEKEEPING`, `MAINTENANCE` |
| `POST /api/maintenance/tasks` | `ADMIN`, `MANAGER`, `RECEPTIONIST` |
| `PATCH /api/maintenance/tasks/{taskId}/assign` | `ADMIN`, `MANAGER` |
| `PATCH /api/maintenance/tasks/{taskId}/start` | `MAINTENANCE` |
| `PATCH /api/maintenance/tasks/{taskId}/complete` | `MAINTENANCE` |
| `PATCH /api/maintenance/tasks/{taskId}/cost` | `ADMIN`, `MANAGER` |
| `PATCH /api/maintenance/tasks/{taskId}/cancel` | `ADMIN`, `MANAGER` |

Expected Postman checks:

| Token role | Request | Expected status |
| --- | --- | --- |
| `RECEPTIONIST` | `POST /api/maintenance/tasks` | 200 |
| `RECEPTIONIST` | `PATCH /api/maintenance/tasks/{id}/assign` | 403 |
| `RECEPTIONIST` | `PATCH /api/maintenance/tasks/{id}/cancel` | 403 |
| `MAINTENANCE` | `GET /api/maintenance/my` | 200 |
| `MAINTENANCE` | `POST /api/maintenance/tasks` | 403 |
| `MAINTENANCE` | `PATCH /api/maintenance/tasks/{id}/start` | 200 (only if assigned to caller) |
| `MANAGER` | `PATCH /api/maintenance/tasks/{id}/assign` | 200 |
| `MANAGER` | `PATCH /api/maintenance/tasks/{id}/start` | 403 |
| `ADMIN` | `PATCH /api/maintenance/tasks/{id}/cancel` | 200 |
| `CUSTOMER` | any `/api/maintenance/**` | 403 |

### Assignment rules

`PATCH /api/maintenance/tasks/{taskId}/assign` applies only to staff whose
profile satisfies **both** `department = MAINTENANCE` and
`employmentStatus = ACTIVE`. Any other staff member returns HTTP 400 with
`Staff member is not active` or `Staff member must belong to MAINTENANCE department`.

### Completion and finance

`PATCH /api/maintenance/tasks/{taskId}/complete` accepts:

```json
{ "actualCost": 2500.0, "completionNotes": "Replaced the mixer tap cartridge." }
```

- `actualCost > 0` creates a Finance `EXPENSE` with category `MAINTENANCE` and
  reference type `MAINTENANCE_TASK`.
- `actualCost` of `0` (or omitted) creates **no** finance transaction.
- Re-sending a completion or calling `PATCH .../cost` updates the existing
  transaction (`updateMaintenanceExpense`) instead of inserting a second one.
  Setting the cost to `0` cancels the existing transaction.
- Cancelling a task cancels any finance transaction already recorded for it.

### Room status

Creating a task sets the room to `MAINTENANCE`. When the last open task for that
room is completed or cancelled, the room is resolved in this order:

1. Another `PENDING`/`ASSIGNED`/`IN_PROGRESS` task exists → stays `MAINTENANCE`
2. A guest is checked in → `OCCUPIED`
3. A housekeeping task is pending/assigned/in progress → `CLEANING`
4. A `CONFIRMED`/`PENDING` reservation has not yet checked out → `RESERVED`
5. Otherwise → `AVAILABLE`

## G. Admin role

```http
GET http://localhost:8080/api/admin/test
Authorization: Bearer FIREBASE_ID_TOKEN
```

A customer receives HTTP 403 because the Firestore profile role is `CUSTOMER`, not `ADMIN`. To test this endpoint, update that user's Firestore document manually to `role: "ADMIN"` and `enabled: true`, then obtain a fresh ID token or retry with the existing token. Public registration never accepts a role field and always writes `CUSTOMER`.

## Public and protected routes

- `GET /api/test` is public.
- `POST /api/auth/register` is public.
- Every other route, including `/api/firebase-test`, requires a valid Firebase ID token.

## Useful checks

```bash
./mvnw test
curl http://localhost:8080/api/test
curl -i http://localhost:8080/api/secure-test
```
