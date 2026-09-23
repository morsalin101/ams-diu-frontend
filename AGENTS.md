# AI Agent Context: AMS-DIU (Backend & Frontend)

This document provides complete technical context, architectural guidelines, conventions, and operational commands for AI agents working across the **AMS-DIU** ecosystem (Academic Management System — Daffodil International University).

---

## 1. System Ecosystem Overview

The AMS project consists of interconnected sub-projects located in this repository:

| Component | Path | Tech Stack | Default Port | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Backend** | `ams-diu-backend/` | Python 3.11, Django 5.2, DRF, SimpleJWT, PostgreSQL / SQLite | `8000` | Core REST API, Auth, Exam generation, Viva & Admission processing |
| **Admin Frontend** | `ams-diu-frontend/` | React 19, Vite, Tailwind CSS v3, Radix UI, React Router v7 | `5173` / `5174` | Admin, SuperAdmin & Faculty dashboard |
| **Student Portal** | `ams-diu-student/` | Next.js, React, Tailwind CSS | `3000` | Student admission, exam, and result portal |

---

## 2. Quick Run Commands

### A. Run Everything (One Command)
From the repository root `e:\ams`:

- **PowerShell (Windows)**:
  ```powershell
  .\run-ams.ps1
  ```
- **Git Bash / WSL / Linux**:
  ```bash
  ./run-ams.sh
  ```
*This launches Django backend (`:8000`), Admin frontend (`:5173`), and Student frontend (`:3000`) in parallel.*

---

### B. Running ams-diu-backend Separately

The Django app entry point (`manage.py`) is located inside `ams-diu-backend/amsapp/`.

#### 1. Setup Virtual Environment & Dependencies:
```powershell
cd e:\ams\ams-diu-backend

# Activate existing venv (Windows)
.venv\Scripts\activate

# Install / update required dependencies
pip install -r requirements.txt
```

#### 2. Run Database Migrations & Initial Seeds:
```powershell
cd e:\ams\ams-diu-backend\amsapp

# Apply migrations
python manage.py migrate

# Seed initial roles and menu structure
python manage.py seed_menus

# (Optional) Create superuser
python manage.py createsuperuser
```

#### 3. Start Development Server:
```powershell
cd e:\ams\ams-diu-backend\amsapp
python manage.py runserver 0.0.0.0:8000
```
- API Base URL: `http://127.0.0.1:8000`
- Swagger UI Documentation: `http://127.0.0.1:8000/api/schema/swagger-ui/`
- Django Admin: `http://127.0.0.1:8000/admin/`

---

### C. Running ams-diu-frontend Separately

The Admin dashboard is a Vite + React application in `ams-diu-frontend/`.

#### 1. Install Dependencies:
```powershell
cd e:\ams\ams-diu-frontend

# Preferred package manager: pnpm
pnpm install

# If using npm (legacy-peer-deps required due to React 19):
npm install --legacy-peer-deps
```

#### 2. Start Vite Dev Server:
```powershell
cd e:\ams\ams-diu-frontend
pnpm dev
# or: npm run dev
```
- Local URL: `http://localhost:5173` (or `5174` if busy)

#### 3. Verification Commands:
```powershell
npm run lint    # Runs ESLint across the project
npm run build   # Tests production Vite bundling
npm run preview # Previews the built production bundle
```

---

## 3. ams-diu-backend Architecture & Conventions

### Directory Layout
```
ams-diu-backend/
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variables template
├── amsapp/                    # Django project root
│   ├── manage.py              # CLI management script
│   ├── db.sqlite3             # Local SQLite database (if used)
│   ├── amsapp/                # Core Django settings & root routing
│   │   ├── settings.py        # Database, CORS, JWT, App configurations
│   │   ├── urls.py            # Root URL router
│   │   └── wsgi.py / asgi.py
│   └── mainapp/               # Primary application module
│       ├── models/            # Domain models (User, Student, Exam, Viva, Menu, Department)
│       ├── views/             # Modular API views & viewsets
│       ├── serializers/       # DRF serializers
│       ├── services/          # Business logic & AI scraping (e.g. gemini_scraper.py)
│       ├── management/        # Custom management commands (seed_menus)
│       └── urls.py            # API route definitions (/api/...)
```

### Core Backend Guidelines:
1. **Authentication**: Uses SimpleJWT. Endpoints: `/api/token/` (login), `/api/token/refresh/`. JWT access token is passed via `Authorization: Bearer <token>`.
2. **Database Configuration**:
   - Production uses PostgreSQL configured via `DATABASE_URL` or `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.
   - Local development defaults to PostgreSQL if available, or fallback SQLite (`db.sqlite3`).
3. **Role & Menu Control**:
   - Roles: `superadmin`, `teacher`, `student`, etc.
   - Dynamic menus are served via `/api/menus/user/` based on role permissions (`read`, `write`, `edit`, `delete`).
4. **Environment Variables**:
   - `SECRET_KEY`, `DEBUG`, `DATABASE_URL`, `CORS_ALLOW_ALL_ORIGINS`, `GEMINI_API_KEY` (for AI question scraper).

---

## 4. ams-diu-frontend Architecture & Conventions

### Directory Layout
```
ams-diu-frontend/
├── vite.config.js             # Vite configuration (Note: NO '@/' alias!)
├── tailwind.config.js         # Tailwind CSS v3 configuration
├── package.json               # Dependencies (React 19, Radix UI, Lucide)
├── src/
│   ├── App.jsx                # Main entry, Router, Dynamic route mapper, Toast container
│   ├── index.css              # Global styles & CSS color variable tokens
│   ├── contexts/              # Global state providers
│   │   ├── AuthContext.tsx    # Auth state, login/logout, tokens in localStorage
│   │   └── MenuContext.tsx    # Dynamic menu fetching, fallback menus, Lucide iconMap
│   ├── hooks/                 # Reusable React hooks
│   │   ├── usePermissions.ts  # Granular CRUD permission checker (canRead, canWrite, etc.)
│   │   └── useEffectiveDepartment.ts # Department scoping & CSE fallback logic
│   ├── services/
│   │   └── api.js             # 1,280+ line centralized Axios API layer (18 namespaces)
│   ├── components/            # Reusable UI & Layouts
│   │   ├── Layout.tsx         # Main layout wrapper (Navbar + Sidebar + Outlet)
│   │   ├── AppSidebar.tsx     # Dynamic role-based sidebar
│   │   └── ui/                # Complete shadcn/ui Radix component library
│   ├── lib/                   # Utilities & PDF generators
│   │   ├── utils.ts           # Class merging (cn = clsx + twMerge)
│   │   ├── student-report.ts  # jsPDF student report generator
│   │   ├── result-sheet.ts    # jsPDF result sheet generator
│   │   └── diu-report-pdf.ts  # jsPDF DIU template generator
│   └── pages/                 # Page components (all TypeScript .tsx)
```

### Critical Frontend Guidelines & Pitfalls for AI Agents:

1. **NO Path Alias (`@/`)**:
   - `vite.config.js` does NOT have an alias for `@/`.
   - **Always use relative imports** (e.g., `import { Button } from '../components/ui/button';`, NOT `@/components/ui/button`).

2. **No `tsconfig.json`**:
   - The project uses `.tsx` and `.ts` files, but transpilation is handled purely by Vite's esbuild (`@vitejs/plugin-react`).
   - Do not attempt `tsc` commands.

3. **Dynamic Routing & Adding New Pages**:
   - When creating a new page in `src/pages/MyPage.tsx`:
     1. Import and register it in `componentMap` inside `src/App.jsx`.
     2. Add the corresponding static fallback route inside `<ProtectedRoutes />` in `src/App.jsx`.
     3. If an icon is needed, import the Lucide icon and register it in `iconMap` in `src/contexts/MenuContext.tsx`.
     4. Use `usePermissions()` in the page to enforce read/write/edit/delete button visibility.

4. **API Communication**:
   - **Never make direct `axios` or `fetch` calls in components.**
   - All endpoints must be added to `src/services/api.js`.
   - The Axios instance automatically attaches the JWT `access_token` from `localStorage`.
   - 18 modular namespaces exist in `api.js`: `examAPI`, `studentsAPI`, `scheduleAPI`, `authAPI`, `usersAPI`, `roleAPI`, `menuAPI`, `departmentAPI`, `subjectAPI`, `subjectDepartmentAPI`, `studentAssignmentAPI`, `fileAPI`, `vivaRubricsAPI`, `marksDistributionAPI`, `vivaAssignmentAPI`, `vivaMarksAPI`, `thresholdAPI`, `admissionResultsAPI`.
   - `BASE_URL` in `src/services/api.js` points to `http://127.0.0.1:8000`.

5. **Toast Notifications**:
   - The root toaster mounted in `src/App.jsx` is `react-hot-toast` (`<Toaster position="top-right" />`).
   - Import `toast` from `react-hot-toast` for user alerts.

6. **Department Scoping**:
   - Use `useEffectiveDepartment()` in admission/exam pages to automatically scope queries to the user's assigned department or apply CSE fallback for superadmins.

---

## 5. Summary Checklist Before Submitting Code Changes

- [ ] **Backend**: Did you run `python manage.py check` inside `amsapp/`?
- [ ] **Backend**: Did you create migrations if models changed (`python manage.py makemigrations`)?
- [ ] **Frontend**: Are all imports strictly **relative** (no `@/...`)?
- [ ] **Frontend**: Did you verify that `npm run build` bundles without JSX or syntax errors?
- [ ] **Frontend**: Did you verify `npm run lint` passes without unused variables or unescaped characters?
- [ ] **Frontend**: Did you check permissions via `usePermissions()` for sensitive operations?
