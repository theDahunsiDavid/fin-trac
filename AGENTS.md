---
description: Core rules, conventions, and architectural guidelines for the FinTrac personal finance tracker app that's privacy-friendly and local-first.
globs:
alwaysApply: true
---

## Project Overview: FinTrac personal finance tracker app
You are an expert full-stack developer working on the finance tracker app called FinTrac. Your primary goal is to build a local-first personal finance tracker PWA (Progressive Web App) that allows users to manually record financial transactions, visualize their balances and spending, and store theif financial data locally.

Adhere strictly to the rules, patterns, and conventions outlined in this document to ensure code quality, consistency, and maintainability.

## Technology stack
The project uses the following technologies. Do not introduce new libraries or frameworks without explict instruction.

- Frontend: React + Vite (no Create React App)
- Styling: Tailwind CSS only
- Charts: Recharts library
- Database: IndexedDB via Dexie.js
- Deployment: Vercel
- Data Format: JSON with strict typing

## Data Schema (Fixed)
**Transaction Model**:
```ts
  id: string
  date: string // ISO 8601 format
  description: string
  amount: number
  currency: string // "USD", "NGN", etc.
  type: "credit" | "debit"
  category: string // "Food", "Transport", etc.
  tags?: string[]
  createdAt: string // ISO 8601 format
  updatedAt: string // ISO 8601 format
```

**Category Model**:
```ts
  id: string
  name: string // "Food", "Transport", etc.
  color: string // Tailwind color class for chart legend
```

## Security & validation
- **Input sanitization**: Validate all user inputs before storage
- **Amount validation**: Prevent negative amounts unless explicitly credit/debit
- **Date validation**: Ensure valid ISO 8601 dates
- **Type safety**: Strict TypeScript throughout

## Architecture & Code Style

### Directory Structure
Follow this scalable React App structure:
  - src/
    - components/ # Reusable UI components (buttons, forms, charts)
    - features/ # Feature modules organized by domain
      - transactions/ # Transaction form, list, detail views
      - dashboard/ # Charts & summary views
    - services/ # App services layer
      - db/ # Dexie setup, schema definitions
      - repos/ # Data repositories (CRUD operations)
      - utils/ # Date, currency, number helpers
    - hooks/ # Custom React hooks (useTransactions, useDashboardData)
    - App.tsx
    - main.tsx

### Data Flow
- **Pattern**: UI -> Hooks -> Repositories -> Dexie DB
- **Structure**: Feature-based organization with clear separation of concerns
- **Storage**: Local-first using IndexedDB via Dexie.js, no backend
- **System Boundary**: Frontend-only PWA in browser

### Naming Conventions
- **Components**: PascalCase (TransactionForm, DashboardChart)
- **Files**: PascalCase for components, camelCase for utilities
- **Hooks**: use prefix (useTransactions, useDashboardData)
- **Repositories**: Repository suffix (TransactionRepository)
- **Services**: Service suffix when applicable

### Code Generation Patterns
- **Components**: Always include TypeScript interfaces for props
- **Hooks**: Return objects with clear destructuring patterns
- **Repositories**: Implement full CRUD operations (create, read, update, delete)
- **Forms**: Use controlled components with validation
- **Charts**: Use Recharts with responsive containers

### Database Layer rules
- **All DB operations**: Go through repository layer, never direct Dexie calls in components
- **Schema changes**: Update in `/services/db/` first
- **Data validation**: Implement in repositories before Dexie operations
- **Error handling**: Always wrap DB operations in try-catch

### Feature Module Pattern
Each feature should contain:
- `index.ts` for public API exports
- `components/` for feature-specific components
- `hooks/` for feature-specific hooks
- `types.ts` for TypeScript definitions
- `utils.ts` for feature utilities (if needed)

## Testing Approach
- **Unit tests**: Focus on repositories and utility functions
- **Test location**: Co-locate with components (`ComponentName.test.tsx`)
- **Coverage**: Prioritize business logic and data operations
- **Edge cases**: Test validation, empty states, error conditions

## Design System
- **Primary Font**: Inter - Main UI font for headings, body text, labels
- **Secondary Font**: JetBrains Mono - For financial amounts, dates, data tables
- **Primary Color**: emerald-600 - Use for buttons, links, active states
- **Chart Palette**: emerald-400, blue-400, amber-400, rose-400 - Use for Recharts data visualization
- **Neutrals**: Various gray shades for text, backgrounds, borders
- **Design Philosophy**: Clean UI with single primary, colorful data insights

## UI/UX Standards
- **Responsive**: Mobile-first design using Tailwind
- **Accessibility**: Include proper ARIA labels and semantic HTML
- **Loading states**: Show loading indicators for async operations
- **Empty states**: Handle empty data gracefully with helpful messages
