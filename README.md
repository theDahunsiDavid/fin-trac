# FinTrac - Personal Finance Tracker

A privacy-friendly, local-first personal finance tracker Progressive Web App (PWA) built with AI-assisted development practices.

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Docker (optional, for CouchDB sync functionality)

### Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd fin-trac
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up CouchDB (Optional - for multi-device sync):**

   The application works fully offline without CouchDB. Set this up only if you want cross-device synchronization.

   **Option A: Using Docker (Recommended)**
   ```bash
   # Install Docker (Arch Linux)
   sudo pacman -S docker docker-compose # If you're on Arch Linux. For other distros, use the appropriate package manager.
   sudo systemctl start docker
   sudo systemctl enable docker

   # Run CouchDB container
   docker run -d \
     --name fintrac-couchdb \
     -p 5984:5984 \
     -e COUCHDB_USER=admin \
     -e COUCHDB_PASSWORD=password \
     -v couchdb-data:/opt/couchdb/data \
     couchdb:3.3
   ```

   **Option B: Direct Installation**
   ```bash
   # Arch Linux
   sudo pacman -S couchdb
   sudo systemctl start couchdb
   sudo systemctl enable couchdb
   ```

4. **Configure CouchDB (If using sync):**

   **Step 1: Access CouchDB Admin Interface**
   ```bash
   # Open in browser
   http://localhost:5984/_utils
   ```

   **Step 2: Set up Admin User**
   - Click "Setup" if this is first time setup
   - Choose "Single Node Setup"
   - Create admin user (username: `admin`, password: `password`)
   - Or if already set up, login with your admin credentials

   **Step 3: Enable CORS (Required for browser access)**

   Navigate to Configuration → CORS or use curl:
   ```bash
   # Enable CORS
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/httpd/enable_cors -d '"true"'
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/origins -d '"*"'
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/credentials -d '"true"'
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/methods -d '"GET, PUT, POST, HEAD, DELETE"'
   curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/headers -d '"accept, authorization, content-type, origin, referer, x-csrf-token"'
   ```

   **Step 4: Create FinTrac Database**
   ```bash
   # Create the database (or it will be created automatically by the app)
   curl -X PUT http://admin:password@localhost:5984/fintrac
   ```

5. **Configure Environment Variables (If using sync):**

   Create a `.env` file in the project root with your CouchDB configuration:

   ```bash
   # Core CouchDB Configuration
   VITE_SYNC_ENABLED=true
   VITE_COUCHDB_URL=http://localhost:5984
   VITE_COUCHDB_DATABASE=fintrac
   VITE_COUCHDB_USERNAME=admin
   VITE_COUCHDB_PASSWORD=password

   # Sync Behavior Settings
   VITE_SYNC_AUTO_START=false
   VITE_SYNC_BIDIRECTIONAL=true
   VITE_SYNC_DOWNLOAD_ONLY=false
   VITE_SYNC_UPLOAD_ONLY=false

   # Performance Tuning
   VITE_SYNC_INTERVAL=30000
   VITE_SYNC_BATCH_SIZE=50

   # Conflict Resolution
   VITE_SYNC_CONFLICT_RESOLUTION=remote-wins
   ```

   **Environment Variable Reference:**

   | Variable | Default | Description |
   |----------|---------|-------------|
   | `VITE_SYNC_ENABLED` | `false` | Master switch to enable/disable sync functionality |
   | `VITE_COUCHDB_URL` | `http://localhost:5984` | CouchDB server URL |
   | `VITE_COUCHDB_DATABASE` | `fintrac` | Database name (must be lowercase) |
   | `VITE_COUCHDB_USERNAME` | - | Admin username for authentication |
   | `VITE_COUCHDB_PASSWORD` | - | Admin password for authentication |
   | `VITE_SYNC_AUTO_START` | `false` | Start sync automatically when app loads |
   | `VITE_SYNC_BIDIRECTIONAL` | `true` | Enable two-way sync (upload + download) |
   | `VITE_SYNC_DOWNLOAD_ONLY` | `false` | Only download changes from server |
   | `VITE_SYNC_UPLOAD_ONLY` | `false` | Only upload changes to server |
   | `VITE_SYNC_INTERVAL` | `30000` | Auto-sync interval in milliseconds |
   | `VITE_SYNC_BATCH_SIZE` | `50` | Number of documents per sync batch |
   | `VITE_SYNC_CONFLICT_RESOLUTION` | `remote-wins` | How to handle conflicts: `remote-wins`, `local-wins`, `manual` |

   **Example Configurations:**

   *Development (Local CouchDB):*
   ```bash
   VITE_SYNC_ENABLED=true
   VITE_COUCHDB_URL=http://localhost:5984
   VITE_COUCHDB_USERNAME=admin
   VITE_COUCHDB_PASSWORD=password
   ```

   *Production (Remote CouchDB - Domain):*
   ```bash
   VITE_SYNC_ENABLED=true
   VITE_COUCHDB_URL=https://your-couchdb-server.com
   VITE_COUCHDB_USERNAME=your-username
   VITE_COUCHDB_PASSWORD=your-secure-password
   VITE_SYNC_AUTO_START=true
   ```
   
   *Production (Remote CouchDB - Network IP):*
   ```bash
   VITE_SYNC_ENABLED=true
   VITE_COUCHDB_URL=http://192.168.1.100:5984 # Replace with your local network IP address followed by port 5984
   VITE_COUCHDB_USERNAME=your-username
   VITE_COUCHDB_PASSWORD=your-secure-password
   VITE_SYNC_AUTO_START=true
   ```

   *Offline-Only (No Sync):*
   ```bash
   VITE_SYNC_ENABLED=false
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

7. **Open your browser:**
   Navigate to `http://localhost:5173` to view the application.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Generate test coverage report

## Features Implemented

### ✅ Core Features (Completed)
- **Transaction Management**
  - ✅ Add income/expense transactions manually
  - ✅ Edit and delete existing transactions
  - ✅ Transaction fields: date, description, amount, currency, type (credit/debit), category, tags
  - ✅ Form validation and error handling

- **Data Visualization Dashboard**
  - ✅ Balance summary (total income, expenses, net balance)
  - ✅ Spending by category (pie chart)
  - ✅ Monthly spending trends (line chart)
  - ✅ Interactive charts using Recharts
  - ✅ Responsive design for mobile and desktop

- **Local-First Storage**
  - ✅ All data stored locally using IndexedDB via PouchDB
  - ✅ Custom bidirectional sync with CouchDB
  - ✅ Offline-first functionality
  - ✅ Data persistence across browser sessions

- **Category Management**
  - ✅ Predefined categories (Food, Transport, Entertainment, etc.)
  - ✅ Custom category creation
  - ✅ Color-coded categories for visual distinction

### 🚧 Advanced Features (In Progress)
- **Multi-device Sync**
  - ✅ Phase 1: One-way sync (upload local changes to CouchDB)
  - ✅ Phase 2: Bidirectional sync (download remote changes)
  - 🔄 Phase 3: Advanced conflict detection and resolution
  - 📋 Phase 4: Real-time sync with WebSocket/SSE
  - 📋 Phase 5: Selective sync and optimization

- **Enhanced UX**
  - ✅ Loading states and error handling
  - ✅ Empty state messages
  - ✅ Mobile-responsive design
  - 📋 Dark mode support
  - 📋 Keyboard shortcuts

### 📋 Future Enhancements
- Import/export functionality (CSV, JSON)
- Budget tracking and alerts
- Receipt photo attachment
- Advanced filtering and search
- Data analytics and insights
- Multiple currency support

## Technology Stack

### Frontend
- **React 18** - UI library with modern hooks and patterns
- **Vite** - Fast build tool and development server
- **TypeScript** - Static type checking for enhanced code quality
- **Tailwind CSS** - Utility-first CSS framework for rapid styling

### Data & Storage
- **PouchDB** - Local database using IndexedDB with CouchDB sync
- **CouchDB** - Remote database for multi-device synchronization
- **Dexie.js** - IndexedDB wrapper (legacy, being migrated to PouchDB)

### Visualization
- **Recharts** - React chart library for interactive data visualization

### Testing
- **Vitest** - Fast unit test runner
- **React Testing Library** - Component testing utilities
- **jsdom** - DOM simulation for testing

### Development Tools
- **ESLint** - Code linting and style enforcement
- **Prettier** - Code formatting
- **Git** - Version control with conventional commits

### Deployment
- **Vercel** - Production hosting and deployment platform

## Project Goals & AI Integration

FinTrac is a capstone project for the AI for Developers II program that demonstrates practical application of AI-assisted development practices. The application serves as a privacy-friendly, local-first personal finance dashboard.

### Primary Objectives:
- Apply AI-assisted development workflows in a real-world project
- Demonstrate schema-aware coding and automated review processes
- Showcase effective use of in-IDE AI tooling
- Build a functional, user-friendly finance tracking application

### AI Integration in Development:
- **Planning & Architecture**: AI-assisted project structure and technical decisions
- **Code Generation**: Automated React component and TypeScript interface creation
- **Testing**: AI-generated test suites and edge case identification
- **Documentation**: Living documentation maintained with AI assistance
- **Debugging**: AI-powered error analysis and resolution suggestions

## Migration to PouchDB + CouchDB Sync

This project implements a custom bidirectional sync system between Dexie.js and CouchDB. The implementation phases:

- **Phase 1 (One-way Sync)**: ✅ Completed - Upload local changes to CouchDB with conflict resolution
- **Phase 2 (Bidirectional Sync)**: ✅ Completed - Download remote changes from CouchDB with conflict handling
- **Phase 3 (Multi-device Sync)**: Planned - Advanced conflict detection and resolution
- **Phase 4 (Real-time Sync)**: Planned - WebSocket/SSE for live updates
- **Phase 5 (Advanced Features)**: Planned - Selective sync, compression, optimization

<br>

## Architecture & Design Patterns

### Local-First Approach
FinTrac prioritizes local data storage and offline functionality:
- All user data remains on device by default
- Sync is optional and user-controlled
- No external dependencies for core functionality
- Privacy-by-design architecture

### Data Flow Architecture
```
UI Components → Custom Hooks → Repository Layer → PouchDB → IndexedDB
                                      ↓
                              CouchDB Sync Service → Remote CouchDB
```

### Component Architecture
- **Feature-based organization** with clear separation of concerns
- **Custom hooks** for state management and business logic
- **Repository pattern** for data access abstraction
- **Service layer** for external integrations and utilities

<br>

## User Experience

### Target Users
- **Individuals** seeking simple, private expense tracking
- **Privacy-conscious users** who prefer local data storage
- **Users** wanting offline-capable financial tools
- **Multi-device users** requiring optional cloud synchronization

### Key User Flows
1. **Quick Transaction Entry**: Add expense/income in under 30 seconds
2. **Visual Insights**: View spending patterns through interactive charts
3. **Data Management**: Edit, delete, and categorize transactions
4. **Sync Setup**: Optional CouchDB configuration for multi-device access

<br>

## Development Environment Setup

### System Requirements
- **Operating System**: Linux
- **Node.js**: Version 18 or higher
- **Package Manager**: npm (included with Node.js)
- **Browser**: Modern browser with IndexedDB support

### CouchDB Setup Requirements (Optional - for sync functionality)

FinTrac works completely offline without CouchDB. Only set up CouchDB if you need multi-device synchronization.

**Required CouchDB Configuration:**
- **Version**: CouchDB 3.x or higher
- **CORS**: Must be enabled for browser access
- **Admin User**: Required for database operations
- **Database**: `fintrac` database (created automatically if missing)

**Security Considerations:**
- Change default admin password in production
- Use HTTPS for remote CouchDB instances
- Restrict CORS origins in production environments
- Consider firewall rules for CouchDB port (5984)

### Docker Setup (Recommended for CouchDB)
```bash
# Complete Docker setup for CouchDB
sudo pacman -S docker docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER  # Add user to docker group
newgrp docker  # Refresh group membership

# Alternative: Docker Compose setup
# Create docker-compose.yml:
version: '3.8'
services:
  couchdb:
    image: couchdb:3.3
    container_name: fintrac-couchdb
    ports:
      - "5984:5984"
    environment:
      - COUCHDB_USER=admin
      - COUCHDB_PASSWORD=password
    volumes:
      - couchdb-data:/opt/couchdb/data
    restart: unless-stopped
volumes:
  couchdb-data:

# Then run:
docker-compose up -d
```

### Manual CouchDB Installation
```bash
# Arch Linux
sudo pacman -S couchdb

# Ubuntu/Debian
sudo apt-get install couchdb

# Configure and start
sudo systemctl start couchdb
sudo systemctl enable couchdb
```

### IDE Recommendations
- **Zed Editor** (Integration with GitHub Copilot was used in development)
- **OpenCode CLI** was used to scaffold initial files and folders during development

### Troubleshooting CouchDB Setup

**Common Issues:**

1. **CORS Errors**
   ```bash
   # Verify CORS is enabled
   curl http://localhost:5984/_node/_local/_config/httpd/enable_cors
   # Should return: "true"
   ```

2. **Authentication Failures**
   ```bash
   # Test admin credentials
   curl -u admin:password http://localhost:5984/_session
   # Should return user session info
   ```

3. **Database Access Issues**
   ```bash
   # Check if database exists
   curl http://admin:password@localhost:5984/fintrac
   # Should return database info or 404 if not created
   ```

4. **Connection Issues**
   ```bash
   # Test CouchDB is running
   curl http://localhost:5984/
   # Should return CouchDB welcome message
   ```

**Docker-specific Issues:**
```bash
# Check container status
docker ps
docker logs fintrac-couchdb

# Restart container if needed
docker restart fintrac-couchdb

# Access container for debugging
docker exec -it fintrac-couchdb bash
```

## Technical Foundation

### Project Structure

```bash
fin-trac/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Basic UI primitives
│   │   └── layout/         # Layout components
│   ├── features/           # Feature-based modules
│   │   ├── transactions/   # Transaction management
│   │   │   ├── components/ # Transaction-specific components
│   │   │   ├── hooks/      # Transaction-related hooks
│   │   │   └── types.ts    # Transaction TypeScript definitions
│   │   ├── dashboard/      # Analytics and visualization
│   │   │   ├── components/ # Chart and summary components
│   │   │   ├── hooks/      # Dashboard data processing hooks
│   │   │   └── utils.ts    # Chart calculation utilities
│   │   └── categories/     # Category management
│   ├── services/           # External services and utilities
│   │   ├── pouchdb/       # PouchDB configuration and schema
│   │   ├── repos/         # Data access repositories
│   │   ├── utils/         # Utility functions
│   │   └── sync/          # CouchDB synchronization
│   ├── hooks/             # Shared custom hooks
│   ├── test/              # Test utilities and setup
│   ├── App.tsx            # Main application component
│   └── main.tsx           # Application entry point
├── public/                # Static assets
├── dist/                  # Production build output
└── coverage/              # Test coverage reports
```

### Data Flow & State Management

**Request Flow:**
```
User Interaction → React Component → Custom Hook → Repository → PouchDB → IndexedDB
```

**Sync Flow:**
```
Local Changes → Change Detection → Conflict Resolution → CouchDB Sync → Remote Storage
```

**System Boundaries:**
- **Frontend-only architecture** - No backend server required
- **Progressive Web App** - Installable, offline-capable
- **Local-first storage** - IndexedDB via PouchDB
- **Optional cloud sync** - CouchDB for multi-device access

<br>

## Performance & Optimization

### Bundle Size Optimization
- **Tree shaking** enabled via Vite
- **Code splitting** by feature modules
- **Lazy loading** for chart components
- **Minimal dependencies** - focused technology stack

### Runtime Performance
- **Virtual DOM** optimization through React 18
- **Memo hooks** for expensive calculations
- **IndexedDB** for fast local data access
- **Debounced search** and filtering

### Offline Capabilities
- **Service Worker** registration for PWA functionality
- **Cache-first strategy** for static assets
- **Local data persistence** with conflict resolution
- **Graceful degradation** when offline

## AI-Assisted Development Process

### Code Generation & Scaffolding
- **Component generation**: React components with TypeScript interfaces
- **Hook creation**: Custom hooks with proper dependency arrays
- **Repository patterns**: CRUD operations with error handling
- **Test scaffolding**: Unit and integration test boilerplate
- **Type definitions**: Schema-aware TypeScript interfaces

### AI-Enhanced Development Workflow
1. **Planning**: AI-assisted architecture decisions and feature breakdown
2. **Implementation**: Code generation with context-aware suggestions
3. **Testing**: Automated test case generation and edge case identification
4. **Documentation**: Living documentation that evolves with code changes
5. **Debugging**: AI-powered error analysis and solution recommendations

### Tools Used
- **Zed Editor** with Claude integration for in-IDE assistance
- **Claude CLI** for command-line development tasks
- **Schema-aware generation** for TypeScript and database models
- **Context-driven prompts** for maintaining code consistency

<br>

## Contributing

### Development Guidelines
1. **Follow the established architecture** patterns outlined in `AGENTS.md`
2. **Write tests** for new features and bug fixes
3. **Use TypeScript strictly** - no `any` types
4. **Follow feature-based organization** for new modules
5. **Maintain AI-assisted development** practices

### Code Quality Standards
- **ESLint configuration** for consistent code style
- **Prettier formatting** for automated code formatting
- **TypeScript strict mode** for type safety
- **Test coverage** requirements for critical business logic
- **Conventional commits** for clear version history

### Getting Started with Development
1. **Read the project specification** in this README
2. **Review the architecture rules** in `AGENTS.md`
3. **Run the test suite** to ensure setup is correct
4. **Start with small changes** to understand the codebase
5. **Use AI tools** for scaffolding and assistance

<br>

## Data Schema & Models

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

## Deployment & Production

### Production Build
```bash
npm run build
```
Generates optimized static files in the `dist/` directory.

### Deployment to Vercel
1. **Connect repository** to Vercel dashboard
2. **Configure build settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node.js Version: 18.x
3. **Deploy automatically** on main branch commits

### Environment Configuration
- **No environment variables required** for core functionality
- **Optional CouchDB URL** for sync features (configured in-app)
- **PWA manifest** and service worker included

## Project Deliverables

### ✅ Completed Deliverables
1. **Production-Ready Application**
   - Fully functional finance tracker PWA
   - Responsive design for all screen sizes
   - Offline-capable with local data persistence
   - Optional cloud synchronization

2. **Comprehensive Source Code**
   - Well-structured, maintainable codebase
   - TypeScript for type safety and developer experience
   - Comprehensive test suite with good coverage
   - Clear separation of concerns and modular architecture

3. **Documentation & Examples**
   - Detailed README with setup instructions
   - Architecture documentation in `AGENTS.md`
   - Inline code comments and type definitions
   - AI tool integration examples and workflows

4. **Live Deployment**
   - Hosted on Vercel with automatic deployments
   - PWA installable on mobile and desktop
   - Performance optimized for fast loading
   - Privacy-focused with local-first data storage

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
