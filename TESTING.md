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

## F. Admin role

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
