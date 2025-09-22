# Project Specification: Finance Tracker (AI-Assisted Development)

<br>

## 1. Introduction & Project Goal

This project involves building, FinTrac, a finance tracker as a capstone project for the AI for Developers II program. The application is a privacy-friendly, local-first personal finance dashboard that allows users to do the following:

- manually record financial transactions
- visualize their balances and spending
- store their financial data locally

My primary goal of building this project is to apply everything I’ve learned about AI-assisted development, schema-aware coding, automated reviews, and in-IDE tooling in the AI for Developers II course by ALX Africa.

I will actively use AI tools for planning, UI generation, code writing, testing, debugging, and deployment as I build this application.

## Migration to PouchDB + CouchDB Sync

This project implements a custom bidirectional sync system between Dexie.js and CouchDB. The implementation phases:

- **Phase 1 (One-way Sync)**: ✅ Completed - Upload local changes to CouchDB with conflict resolution
- **Phase 2 (Bidirectional Sync)**: ✅ Completed - Download remote changes from CouchDB with conflict handling
- **Phase 3 (Multi-device Sync)**: Planned - Advanced conflict detection and resolution
- **Phase 4 (Real-time Sync)**: Planned - WebSocket/SSE for live updates
- **Phase 5 (Advanced Features)**: Planned - Selective sync, compression, optimization

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
  - All data stored locally in browser using IndexedDB (Dexie.js)
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
   │ ├── db/ # Legacy Dexie setup (to be removed)
   │ ├── pouchdb/ # PouchDB configuration and schema
   │ ├── repos/ # Data repositories (CRUD, sync adapter)
   │ ├── utils/ # Date, currency, number helpers
   ├── hooks/ # Custom React hooks (useTransactions, useDashboardData)
   ├── App.tsx
   └── main.tsx
   ```

- **Data Flow**

  - UI → Hooks → Repositories → PouchDB + CouchDB Sync

- **System Boundary**
  - Frontend only (PWA in browser)
  - Database: IndexedDB via Dexie with custom CouchDB bidirectional sync

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

- **Frontend:** React + Vite
- **Styling:** Tailwind CSS
- **Charts/Visualization:** Recharts
- **Local Database:** IndexedDB via PouchDB + CouchDB sync
- **Data Format:** JSON (schema enforced in repos)
- **Deployment Platform:** Vercel

<br>

## 7. Data Model (MVP Draft)

**Transactions**

```ts
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

```ts
{
  id: string;
  name: string; // e.g. "Food", "Transport"
  color: string; // Tailwind color class for chart legend
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

<br>

## 9. Testing

This project uses Vitest as the testing framework, integrated with React Testing Library for component and hook testing. The test suite includes unit tests for utilities, repositories, hooks, and integration tests for components to ensure code quality and prevent regressions.

### Running Tests

#### Prerequisites
Ensure all dependencies are installed:
```bash
npm install
```

#### Run All Tests
Execute the full test suite:
```bash
npm test
```
This runs tests in watch mode, re-running on file changes.

#### Run Tests Once
Run all tests once without watch mode:
```bash
npm run test:run
```

#### Generate Coverage Report
Run tests with coverage analysis:
```bash
npm run test:coverage
```
This generates a coverage report in the `coverage/` directory.

### Test Structure

Tests are co-located with the code they test, following the pattern `ComponentName.test.tsx` or `utilityName.test.ts`. The test files are organized as follows:

- **Unit Tests:**
  - `src/services/utils/currencyUtils.test.ts` - Currency formatting and parsing
  - `src/services/utils/dateUtils.test.ts` - Date formatting utilities
  - `src/services/repos/TransactionRepository.test.ts` - Database repository operations
  - `src/hooks/useCategories.test.tsx` - Category state management hook
  - `src/features/dashboard/hooks/useDashboardData.test.tsx` - Dashboard data processing hook

- **Integration Tests:**
  - `src/features/transactions/components/TransactionForm.test.tsx` - Form submission and validation
  - `src/features/dashboard/components/DashboardChart.test.tsx` - Chart rendering and data visualization

### Adding New Tests

#### 1. Test File Naming Convention
Create test files with the `.test.tsx` extension for React components/hooks or `.test.ts` for utilities/repositories. Place them in the same directory as the code being tested.

#### 2. Test Setup
All tests use the setup configured in `src/test/setup.ts`, which includes:
- Jest DOM matchers for DOM assertions
- jsdom environment for browser simulation

#### 3. Writing Unit Tests

For utility functions (e.g., adding a test to `currencyUtils.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './currencyUtils';

describe('formatCurrency', () => {
  it('formats amount with default currency', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
  });

  it('handles edge cases', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(-500)).toBe('-$500.00');
  });
});
```

For repository tests (e.g., `TransactionRepository.test.ts`):

```typescript
import { describe, it, expect, vi } from 'vitest';
import { TransactionRepository } from './TransactionRepository';

// Mock dependencies
vi.mock('../db/db', () => ({
  db: { transactions: { toArray: vi.fn() } }
}));

describe('TransactionRepository', () => {
  it('retrieves all transactions', async () => {
    // Arrange
    const repo = new TransactionRepository();
    // Mock setup

    // Act
    const result = await repo.getAll();

    // Assert
    expect(result).toEqual(expectedTransactions);
  });
});
```

#### 4. Writing Component Tests

For React components (e.g., `TransactionForm.test.tsx`):

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionForm } from './TransactionForm';

describe('TransactionForm', () => {
  it('renders form fields', () => {
    render(<TransactionForm addTransaction={mockFn} />);

    expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument();
  });

  it('submits valid form data', async () => {
    const mockAddTransaction = vi.fn();
    const user = userEvent.setup();

    render(<TransactionForm addTransaction={mockAddTransaction} />);

    await user.type(screen.getByPlaceholderText('Description'), 'Test transaction');
    await user.type(screen.getByPlaceholderText('Amount'), '100');
    await user.click(screen.getByRole('button', { name: 'Add Transaction' }));

    expect(mockAddTransaction).toHaveBeenCalledWith({
      description: 'Test transaction',
      amount: 100,
      // ... other expected fields
    });
  });
});
```

#### 5. Writing Hook Tests

For custom hooks (e.g., `useDashboardData.test.tsx`):

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardData } from './useDashboardData';

// Mock dependencies
vi.mock('../hooks/useTransactions', () => ({
  useTransactions: () => ({ transactions: mockTransactions })
}));

describe('useDashboardData', () => {
  it('calculates balance correctly', () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.balance).toBe(expectedBalance);
    expect(result.current.totalIncome).toBe(expectedIncome);
  });
});
```

#### 6. Mocking Strategy

- **Database Operations:** Mock Dexie tables using `vi.mock()` to avoid actual IndexedDB interactions
- **External Libraries:** Mock Recharts components for chart testing
- **Hooks and Components:** Mock child components or hooks to isolate unit tests
- **Async Operations:** Use `vi.fn().mockResolvedValue()` for promises

#### 7. Best Practices

- **Test Isolation:** Each test should be independent and not rely on shared state
- **Descriptive Names:** Use clear, descriptive test names that explain what is being tested
- **Edge Cases:** Include tests for error conditions, empty states, and boundary values
- **Coverage:** Aim for high coverage of critical business logic and user interactions
- **Performance:** Keep tests fast by mocking expensive operations

#### 8. Running Tests in CI/CD

For continuous integration, add the test command to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm run test:run
```

The test suite serves as guardrails for development, ensuring that new features don't break existing functionality and that refactors maintain correctness.
