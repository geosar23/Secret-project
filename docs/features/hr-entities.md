# HR Entities

These are the core data entities that make up the organisational structure of a tenant. All of them are **company-scoped** — a user from Company A cannot see or modify entities belonging to Company B.

---

## Countries

Represents countries relevant to the company's operations. Used when assigning employees to locations and for document issuance context.

- Full CRUD via `GET/POST/PUT/DELETE /api/countries`
- Company-scoped
- Permission-guarded: write operations require the appropriate `countries` permission key
- Filterable in the Users table

**Frontend:** `client/src/app/features/countries/`

---

## Departments

Top-level organisational units (e.g. Engineering, HR, Finance).

- Full CRUD via `/api/departments`
- Company-scoped
- Users can be assigned to a department
- Filterable in the Users table

**Frontend:** `client/src/app/features/departments/`

---

## Sub-Departments

Subdivisions within a department (e.g. Backend, Frontend within Engineering).

- Full CRUD via `/api/sub-departments`
- Company-scoped
- Each sub-department references a parent `Department`

**Frontend:** `client/src/app/features/sub-departments/`

---

## Employment Titles

Job titles assigned to employees (e.g. Senior Engineer, HR Business Partner).

- Full CRUD via `/api/employment-titles`
- Company-scoped
- Assigned to users through the user create/edit form

**Frontend:** `client/src/app/features/employment-titles/`

---

## Levels

Seniority levels (e.g. Junior, Mid, Senior, Lead). Used to capture career grade independently of job title.

- Full CRUD via `/api/levels`
- Company-scoped
- Assigned to users in their employment profile

---

## Offices

Physical or virtual office locations for the company.

- Full CRUD via `/api/offices`
- Company-scoped
- Assigned to users in their employment profile

---

## Users

The central entity. A user is an employee (or admin) within a company.

### Core fields

- **Identity:** first name, last name, legal name, email, personal email, gender, birthday, marital status, nationalities, religion
- **Contact:** work phone, personal phone, current address, home country address, emergency contact
- **Employment:** employment date, employment type, payroll ID, office, HR representative, level, manager, department, employment title, outsourced flag
- **Education:** institution, degree level, degree title, year achieved (array)
- **Compensation:** salary (stored AES-256-GCM encrypted; excluded from list endpoints, decrypted on single-user fetch)

### User Documents

A separate `UserDocuments` collection stores identity documents attached to a user:

- Document types: passport, national ID, visa, work permit, etc.
- Fields: `type`, `documentNumber`, `expiryDate`, `issuingCountry`, `notes`
- File attachment (PDF or image, ≤ 10 MB) stored in Supabase Storage
- Full CRUD via `/api/user-documents`
- Signed URL endpoint for attachment access
- See [File Storage](./file-storage.md) for the storage layer details

**Frontend:** `client/src/app/features/users/`

---

## Organisational Hierarchy

```
Company
 └── Department
      └── Sub-Department

User
 ├── Department
 ├── Sub-Department
 ├── Employment Title
 ├── Level
 ├── Office
 ├── Country
 └── Manager (→ another User)
```

---

## Related Files

| File                       | Purpose                           |
| -------------------------- | --------------------------------- |
| `server/src/models/`       | Mongoose schemas for all entities |
| `server/src/repositories/` | Company-scoped data access        |
| `server/src/services/`     | Business logic per entity         |
| `server/src/controllers/`  | Route handlers                    |
| `client/src/app/features/` | Management UI per entity          |
