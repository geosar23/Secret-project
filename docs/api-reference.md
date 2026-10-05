# API Reference

All endpoints are prefixed with `/api`. All protected endpoints require a `Authorization: Bearer <token>` header.

---

## Health

| Method | Path          | Auth | Description                   |
| ------ | ------------- | ---- | ----------------------------- |
| GET    | `/api/health` | No   | Returns API status and uptime |

---

## Auth

| Method | Path              | Auth | Description                                        |
| ------ | ----------------- | ---- | -------------------------------------------------- |
| POST   | `/api/auth/login` | No   | Authenticate with email + password; returns JWT    |
| GET    | `/api/auth/me`    | Yes  | Returns the currently authenticated user's context |

---

## Users

| Method | Path                                | Auth | Description                                                                                            |
| ------ | ----------------------------------- | ---- | ------------------------------------------------------------------------------------------------------ |
| GET    | `/api/users`                        | Yes  | List users (company-scoped, filterable by role/department/country)                                     |
| GET    | `/api/users/org-chart`              | Yes  | Org chart data for every employee (no permission needed; name, email, manager, title, department only) |
| POST   | `/api/users`                        | Yes  | Create a new user                                                                                      |
| GET    | `/api/users/:id`                    | Yes  | Get a single user by ID                                                                                |
| PUT    | `/api/users/:id`                    | Yes  | Update a user                                                                                          |
| DELETE | `/api/users/:id`                    | Yes  | Delete a user                                                                                          |
| PUT    | `/api/users/:id/password`           | Yes  | Change a user's password                                                                               |
| POST   | `/api/users/:id/permissions/grant`  | Yes  | Grant an individual permission to a user                                                               |
| POST   | `/api/users/:id/permissions/revoke` | Yes  | Revoke an individual permission from a user                                                            |
| POST   | `/api/users/:id/profile-image`      | Yes  | Upload a profile image (multipart, field: `image`, max 5 MB, images only)                              |
| GET    | `/api/users/:id/profile-image-url`  | Yes  | Get a signed URL for the user's profile image                                                          |
| DELETE | `/api/users/:id/profile-image`      | Yes  | Delete the user's profile image                                                                        |

---

## Roles

| Method | Path             | Auth | Description                     |
| ------ | ---------------- | ---- | ------------------------------- |
| GET    | `/api/roles`     | Yes  | List all roles (company-scoped) |
| POST   | `/api/roles`     | Yes  | Create a role                   |
| GET    | `/api/roles/:id` | Yes  | Get a single role               |
| PUT    | `/api/roles/:id` | Yes  | Update a role                   |
| DELETE | `/api/roles/:id` | Yes  | Delete a role                   |

---

## Permissions

| Method | Path               | Auth | Description                        |
| ------ | ------------------ | ---- | ---------------------------------- |
| GET    | `/api/permissions` | Yes  | List all available permission keys |

---

## Companies

| Method | Path                 | Auth | Description                                      |
| ------ | -------------------- | ---- | ------------------------------------------------ |
| GET    | `/api/companies/:id` | Yes  | Get a signed URL for the company's logo and name |

---

## Countries

| Method | Path                 | Auth | Description                     |
| ------ | -------------------- | ---- | ------------------------------- |
| GET    | `/api/countries`     | Yes  | List countries (company-scoped) |
| POST   | `/api/countries`     | Yes  | Create a country                |
| GET    | `/api/countries/:id` | Yes  | Get a single country            |
| PUT    | `/api/countries/:id` | Yes  | Update a country                |
| DELETE | `/api/countries/:id` | Yes  | Delete a country                |

---

## Departments

| Method | Path                   | Auth | Description                       |
| ------ | ---------------------- | ---- | --------------------------------- |
| GET    | `/api/departments`     | Yes  | List departments (company-scoped) |
| POST   | `/api/departments`     | Yes  | Create a department               |
| GET    | `/api/departments/:id` | Yes  | Get a single department           |
| PUT    | `/api/departments/:id` | Yes  | Update a department               |
| DELETE | `/api/departments/:id` | Yes  | Delete a department               |

---

## Sub-Departments

| Method | Path                       | Auth | Description                           |
| ------ | -------------------------- | ---- | ------------------------------------- |
| GET    | `/api/sub-departments`     | Yes  | List sub-departments (company-scoped) |
| POST   | `/api/sub-departments`     | Yes  | Create a sub-department               |
| GET    | `/api/sub-departments/:id` | Yes  | Get a single sub-department           |
| PUT    | `/api/sub-departments/:id` | Yes  | Update a sub-department               |
| DELETE | `/api/sub-departments/:id` | Yes  | Delete a sub-department               |

---

## Employment Titles

| Method | Path                         | Auth | Description                             |
| ------ | ---------------------------- | ---- | --------------------------------------- |
| GET    | `/api/employment-titles`     | Yes  | List employment titles (company-scoped) |
| POST   | `/api/employment-titles`     | Yes  | Create an employment title              |
| GET    | `/api/employment-titles/:id` | Yes  | Get a single employment title           |
| PUT    | `/api/employment-titles/:id` | Yes  | Update an employment title              |
| DELETE | `/api/employment-titles/:id` | Yes  | Delete an employment title              |

---

## Levels

| Method | Path              | Auth | Description                            |
| ------ | ----------------- | ---- | -------------------------------------- |
| GET    | `/api/levels`     | Yes  | List seniority levels (company-scoped) |
| POST   | `/api/levels`     | Yes  | Create a level                         |
| GET    | `/api/levels/:id` | Yes  | Get a single level                     |
| PUT    | `/api/levels/:id` | Yes  | Update a level                         |
| DELETE | `/api/levels/:id` | Yes  | Delete a level                         |

---

## Offices

| Method | Path               | Auth | Description                   |
| ------ | ------------------ | ---- | ----------------------------- |
| GET    | `/api/offices`     | Yes  | List offices (company-scoped) |
| POST   | `/api/offices`     | Yes  | Create an office              |
| GET    | `/api/offices/:id` | Yes  | Get a single office           |
| PUT    | `/api/offices/:id` | Yes  | Update an office              |
| DELETE | `/api/offices/:id` | Yes  | Delete an office              |

---

## User Documents

| Method | Path                                     | Auth | Description                                           |
| ------ | ---------------------------------------- | ---- | ----------------------------------------------------- |
| GET    | `/api/user-documents`                    | Yes  | List documents for a user                             |
| POST   | `/api/user-documents`                    | Yes  | Create a document record (optionally with attachment) |
| GET    | `/api/user-documents/:id`                | Yes  | Get a single document                                 |
| PUT    | `/api/user-documents/:id`                | Yes  | Update a document record                              |
| DELETE | `/api/user-documents/:id`                | Yes  | Delete a document record and its attachment           |
| GET    | `/api/user-documents/:id/attachment-url` | Yes  | Get a signed URL for the document attachment          |
| DELETE | `/api/user-documents/:id/attachment`     | Yes  | Remove the attachment from a document                 |

---

## Common Response Patterns

**Success** — `2xx` with a JSON body containing the result.

**Validation error** — `400 Bad Request` with an error message.

**Unauthenticated** — `401 Unauthorized` when no or invalid token is provided.

**Forbidden** — `403 Forbidden` when the user lacks the required permission.

**Not found** — `404 Not Found` when the resource does not exist or is outside the user's company scope.

**Server error** — `500 Internal Server Error`; details logged server-side only.
