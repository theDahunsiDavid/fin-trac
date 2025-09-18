# Project Specification: Finance Tracker (AI-Assisted Development)

<br>

## 1. Introduction & Project Goal

This project involves building a finance tracker as a capstone project for the AI for Developers II program. The application is a privacy-friendly, local-first personal finance dashboard that allows users to do the following:

- manually record financial transactions
- visualize their balances and spending
- store their financial data locally

The primary goal of building this project is to apply everything I’ve learned about AI-assisted development, schema-aware coding, automated reviews, and in-IDE tooling in the AI for Developers II course by ALX Africa.

I will actively use AI tools for planning, UI generation, code writing, testing, debugging, and deployment as I build this application.
<br>

## 2. Core Application Features

The completed application will include the following features:

- **Transaction Management**
  - Ability to add income/expense transactions manually
  - Fields: date, description, amount, currency (placeholder field), type (credit/debit), category, tags
  - Ability to edit/delete transactions
- **Visualization Dashboard**
  - Totals by category
  - Spending trends over time
  - Balance summary
  - Interactive charts (Recharts)
- **Local-First Storage**
  - All data stored locally in browser using IndexedDB ([Dexie.js](http://dexie.js))
  - JSON-based schema
    <br>

## 3. User Roles within the Application

- **Primary User (Individual)**
  - Records personal transactions
  - Views dashboard insights
  - Manages their data locally
    <br>

## 4. Technical Foundation

- **Frontend Structure (React + Vite)**

  ```bash
  src/
  ├── components/ # Reusable UI components (buttons, forms, charts)
  ├── features/ # Feature modules (transactions, dashboard, categories)
  │ ├── transactions/ # Transaction form, list, detail views
  │ ├── dashboard/ # Charts & summary views
  ├── services/ # App services
  │ ├── db/ # Dexie setup, schema definitions
  │ ├── repos/ # Data repositories (CRUD, future sync adapter)
  │ ├── utils/ # Date, currency, number helpers
  ├── hooks/ # Custom React hooks (useTransactions, useDashboardData)
  ├── App.tsx
  └── main.tsx
  ```

- **Data Flow**

  - UI → Hooks → Repositories → Dexie DB

- **System Boundary**
  - Frontend only (PWA in browser)
  - Database: IndexedDB via Dexie.js
    <br>

## 5. AI Tool Integration During Development

- **Code & Feature Generation**

  - Use Zed Text Editor as IDE and Claude for CLI agent
  - Generate boilerplate for React components, Dexie models, Tailwind layouts
  - Speed up repetitive CRUD/UI scaffolding

- **Testing Support**

  - Use AI to generate unit test stubs for repositories and utility functions
  - Prompt: _Write tests for the actions in @TransactionForm.tsx and add a “test” script shortcut to @package.json to run tests_
  - Prompt 2: _Generate a test suite for this fetchExpenses function in TransactionList.tsx_
  - Help design edge cases for validation (negative amounts, future dates)

- **Documentation Support**

  - Use AI to generate docstrings, inline comments in complex logic areas.
  - Use AI to generate a living documentation in the README file that’s updated intentionally every time code significantly changes

- **Schema-aware / API-aware Generation**
  - Use AI to draft Dexie schemas, JSON typing
    <br>

## 6. Chosen Technology Stack

**Frontend:** React + Vite
**Styling:** Tailwind CSS
**Charts/Visualization:** Recharts
**Local Database:** IndexedDB via Dexie.js
**Data Format:** JSON (schema enforced in repos)
**Deployment Platform:** Vercel
<br>

## 7. Data Model (MVP Draft)

**Transactions**

```json
{
  id: string;
  date: string;          // ISO 8601
  description: string;
  amount: number;
  currency: string;      // e.g. "USD", "NGN" (multi-currency placeholder)
  type: "credit" | "debit";
  category: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}
```

**Categories (preset + user-defined)**

```json
{
  id: string;
  name: string;          // e.g. "Food", "Transport"
  color: string;         // Tailwind color class for chart legend
}
```

<br>

## 8. Project Outcomes

1.  **Completed Source Code:** A Git repository (e.g., on GitHub) containing the full source code of the finance tracker, with a commit history reflecting the AI-assisted development process.
2.  **Live Deployed Application:** A working, privacy-friendly, local-first PWA. Users can enter/edit/delete transactions, categorize them, and view visual dashboards.
3.  **Comprehensive README file:** A detailed README file within the repository explaining:
    - The project’s purpose and features
    - Instructions for setting up and running the project locally
    - The specific technology stack used
    - Key examples and explanations of how different AI tools were integrated and utilized during the build process

