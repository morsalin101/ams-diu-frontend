# Dynamic Routing Setup

This project has been set up with dynamic routing using React Router and a menu-driven navigation system.

## Project Structure

### Key Components

1. **Layout Component** (`src/components/Layout.tsx`)
   - Main layout with sidebar and navbar
   - Uses React Router's `<Outlet />` to render child routes
   - Provides theme management

2. **AppSidebar Component** (`src/components/AppSidebar.tsx`)
   - Dynamic sidebar that loads menu items from API
   - Uses `MenuContext` to get menu items
   - Highlights active routes based on current location

3. **MenuContext** (`src/contexts/MenuContext.tsx`)
   - Manages menu items fetched from `/api/menus/user/` endpoint
   - Provides loading states and error handling
   - Maps menu icons to Lucide React components

4. **App Component** (`src/App.jsx`)
   - Main router setup with dynamic route generation
   - Component mapping for dynamic routes
   - Protected routes with authentication

## Dynamic Routing Flow

1. **Authentication Check**: User must be logged in to access protected routes
2. **Menu Loading**: After login, menu items are fetched from the API
3. **Dynamic Route Generation**: Routes are created based on menu items from the API
4. **Component Mapping**: Each menu item's `component` field maps to a React component

## API Response Format

The `/api/menus/user/` endpoint should return data in this format:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "label": "Dashboard",
      "icon": "LayoutDashboard",
      "link": "/dashboard",
      "component": "Dashboard",
      "permissions": {
        "edit": true,
        "read": true,
        "write": true,
        "delete": true
      }
    }
  ],
  "role": "superadmin",
  "message": "Menus for user retrieved successfully"
}
```

## Component Mapping

Components are mapped in `App.jsx`:

```javascript
const componentMap = {
  Dashboard: SimpleDashboard,
  CreateQuestions: SimpleCreateQuestions,
  AllQuestions: SimpleAllQuestions,
  Students,
  ExamSchedule,
  UsersManagement,
  RoleManagement,
  MenuManagement,
  MenuAccessManagement,
  DepartmentManagement,
  SubjectManagement,
  SubjectDepartmentMapping,
};
```

## Adding New Pages

To add a new page:

1. Create the page component in `src/pages/`
2. Add it to the `componentMap` in `App.jsx`
3. Ensure the API returns the correct `component` name
4. Add the corresponding icon to `iconMap` in `MenuContext.tsx`

## Icon Mapping

Icons are mapped using Lucide React icons in `MenuContext.tsx`:

```javascript
const iconMap = {
  'LayoutDashboard': LayoutDashboard,
  'Plus': Plus,
  'FileText': FileText,
  // ... more icons
};
```

## Development Server

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5174/` (or another port if 5174 is in use).

## Features

- ✅ Dynamic menu loading from API
- ✅ Dynamic route generation
- ✅ Role-based menu access
- ✅ Responsive sidebar
- ✅ Active route highlighting
- ✅ Loading states
- ✅ Error handling with fallback menus
- ✅ Theme management
- ✅ Toast notifications