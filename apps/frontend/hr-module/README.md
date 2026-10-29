# ELVA TECH HR and Payroll ERP - Frontend

React-based frontend for the ELVA TECH HR & Payroll ERP application.

## Prerequisites
- Node.js and npm compatible with the project's Vite setup.
- Access to the HRMS backend.
- A valid authentication session for protected features.

## Installation

Run from this directory:

```powershell
npm install
```

## Environment Configuration

Create a local `.env.local` file if a custom backend URL is required:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

The frontend defaults to `http://localhost:3000` when this variable is not configured.

Do not store secrets in `VITE_` environment variables because they may be exposed to the browser.

Restart the Vite development server after changing environment variables.

## Development

```powershell
npm run dev
```

## Available Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm test` | Run automated tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build |

## Authentication and API

- API requests use session cookies through `credentials: include`.
- Protected API authorization and tenant isolation must be enforced by the backend.
- Protected requests returning HTTP 401 dispatch the `hrms:unauthorized` event, with special handling for login, logout, session lookup, and invitation endpoints.
- Client-side navigation permissions do not replace backend authorization.

## Testing

Run:

```powershell
npm test
```

Current tests cover API request behavior, unauthorized-event handling, query parameters, and navigation access rules.

## Production Build

```powershell
npm run build
```

The production files are generated in `dist/`. Review build warnings and verify backend integration before deployment.

## Limitations

Automated unit tests do not replace end-to-end testing against a running backend. Payroll behavior must be validated against approved company policies and real backend responses.
