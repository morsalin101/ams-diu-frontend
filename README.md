# AMS DIU Frontend

This project is a complete admin dashboard application built with React, Vite, and Tailwind CSS, featuring a modern UI with shadcn/ui components.

## 🚀 Features

- **Modern Dashboard Design**: Clean and professional admin panel interface
- **Responsive Layout**: Mobile-first design that works on all devices
- **Dark/Light Theme**: Built-in theme switching capability
- **Sidebar Navigation**: Collapsible sidebar with menu items
- **Statistics Cards**: Dashboard with overview cards and charts
- **Component Library**: Full set of shadcn/ui components
- **Theme Customization**: Built-in theme color selector
- **Mobile Menu**: Responsive mobile navigation

## 🛠️ Tech Stack

- **React 19** - Latest React with modern hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **Radix UI** - Unstyled, accessible UI primitives
- **Lucide React** - Beautiful & consistent icon library
- **Recharts** - Composable charting library

## 📦 Installation

1. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── Dashboard.tsx       # Main dashboard component
│   ├── DashboardContent.tsx # Dashboard content area
│   ├── AppSidebar.tsx     # Sidebar navigation
│   ├── StatsCards.tsx     # Statistics cards
│   ├── CreateQuestions.tsx # Create questions page
│   ├── ThemeColorSelector.tsx # Theme customization
│   └── MobileMenu.tsx     # Mobile navigation
├── lib/
│   └── utils.ts           # Utility functions
├── styles/
│   └── globals.css        # Global styles
├── App.jsx                # Main app component
└── index.css              # Tailwind and custom styles
```

## 🎨 Components Overview

### Main Components
- **Dashboard**: Root dashboard component with layout
- **AppSidebar**: Collapsible sidebar with navigation
- **DashboardContent**: Main content area with stats and charts
- **StatsCards**: Overview statistics cards
- **CreateQuestions**: Question creation interface
- **ThemeColorSelector**: Color theme picker
- **MobileMenu**: Mobile-responsive menu

### UI Components (shadcn/ui)
All standard shadcn/ui components are included:
- Button, Input, Card, Badge, Avatar
- Dialog, Popover, Tooltip, Sheet
- Select, Checkbox, Switch, Slider
- Accordion, Tabs, Separator
- And many more...

## 🎨 Customization

### Theme Colors
The app supports theme customization through CSS variables. You can modify the color scheme in `src/index.css`:

```css
:root {
  --primary: 0 0% 9%;
  --secondary: 0 0% 96.1%;
  --background: 0 0% 100%;
  /* ... more variables */
}
```

### Adding New Components
1. Create your component in `src/components/`
2. Import and use in the main Dashboard
3. Follow the existing patterns for consistency

## 📱 Responsive Design

The dashboard is fully responsive with:
- Mobile-first approach
- Collapsible sidebar
- Mobile navigation menu
- Responsive grid layouts
- Touch-friendly interactions

## 🚀 Deployment

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Preview the build:**
   ```bash
   npm run preview
   ```

3. **Deploy to your preferred platform** (Vercel, Netlify, etc.)

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Code Style
- Uses ESLint for code linting
- Follows React best practices
- Uses TypeScript-style prop definitions
- Consistent component structure

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the repository.

---

Built with ❤️ using React, Vite, and Tailwind CSS+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
