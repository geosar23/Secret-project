# HR SaaS Application

A full-stack HR management system built with modern web technologies. This monorepo contains both the Angular frontend and the Node.js/Express backend.

## Stack Overview

- **Frontend**: Angular 21 with Material Design
- **Backend**: Node.js + Express + TypeScript with MongoDB
- **Authentication**: JWT-based with bcryptjs hashing
- **Security**: Helmet, CORS, rate limiting, and validation
- **Development Tools**: Prettier, ESLint, Husky, Commitlint

## Prerequisites

- **Node.js** >= 16 and **npm**
- **MongoDB** (local or cloud instance)
- Optional: **Angular CLI** for enhanced frontend development

## Project Structure

```
.
├── client/               # Angular frontend application
│   ├── src/
│   ├── public/
│   └── package.json
├── server/               # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # API route definitions
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── api/          # API utilities
│   │   └── server.ts     # Entry point
│   └── package.json
└── package.json          # Root workspace configuration
```

## Getting Started

### 1. Install Dependencies

Install dependencies for the entire workspace:

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file in the `server` directory with the following variables:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/hrms
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

**Security Note**: Do NOT commit `.env` files. The `.env` file is included in `.gitignore`.

### 3. Run Development Mode

Run both client and server concurrently:

```bash
npm run dev
```

This launches:

- **Backend**: `http://localhost:3000` (Node + Express)
- **Frontend**: `http://localhost:4200` (Angular development server)

### Individual Development

**Backend only** (with auto-reload):

```bash
npm run dev:server
```

**Frontend only**:

```bash
npm run dev:client
```

## Building for Production

Build both frontend and backend:

```bash
# Backend
cd server
npm run build    # TypeScript → dist/
npm start        # Run compiled code

# Frontend
cd client
npm run build    # Angular → dist/
```

## Available Scripts

### From Root

- `npm run dev` — Run both client and server
- `npm run dev:server` — Run backend with watch mode
- `npm run dev:client` — Run frontend dev server
- `npm run format` — Format and lint all code
- `npm run lint` — Run ESLint with auto-fix

### Backend (server/)

- `npm run dev` — Start with ts-node
- `npm run dev:watch` — Start with auto-reload via nodemon
- `npm run build` — Compile TypeScript
- `npm start` — Run compiled JavaScript
- `npm run format` — Format code
- `npm run lint` — Lint TypeScript

### Frontend (client/)

- `npm start` — Run dev server
- `npm run build` — Build for production
- `npm run test` — Run unit tests

## API Endpoints

The backend provides REST API endpoints under `/api`:

- **Auth**: `/api/auth/*` — Login, logout, token refresh
- **Users**: `/api/users/*` — User management
- **Roles**: `/api/roles/*` — Role-based access control
- **Companies**: `/api/companies/*` — Company data

## Key Features

- User authentication and authorization
- Role-based access control (RBAC)
- Company and employee management
- Secure session handling with JWT
- API rate limiting and request validation
- Code formatting and linting automation
- Git hooks for commit quality (Husky + Commitlint)

## Troubleshooting

**Backend won't start**

- Verify MongoDB is running and `MONGO_URI` is correct
- Check that port 3000 is not in use
- Review error logs in the terminal

**Frontend won't connect to backend**

- Ensure backend is running on the correct port
- Check CORS configuration in `server/src/app.ts`
- Verify network connectivity

**npm install fails**

- Try clearing npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then reinstall
- Ensure Node.js version matches prerequisites

## Contributing

Follow the commit guidelines enforced by Commitlint. The project uses Prettier for formatting and ESLint for code quality.

Run before committing:

```bash
npm run format
npm run lint
```

## License

[Add license information]
