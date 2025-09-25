# FinTrac - Personal Finance Tracker

A privacy-friendly, local-first personal finance tracker Progressive Web App (PWA) built with AI-assisted development practices.

## Table of Contents

- [Quick Start](#quick-start)
- [Using the App](#using-the-app)
- [What It Does](#what-it-does)
- [Technology Stack](#technology-stack)
- [Project Structure & Data Models](#project-structure--data-models)
- [Architecture & Design Patterns](#architecture--design-patterns)
- [Development Environment](#development-environment)
- [Deployment & Production](#deployment--production)
- [Project Goals & AI Integration](#project-goals--ai-integration)
- [Project Deliverables](#project-deliverables)

<br>

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm
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
   # Install Docker
   sudo pacman -S docker docker-compose # On Arch Linux. For other distros, use the appropriate package manager.
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

   **Managing CouchDB Container:**

   Once you've created the container, you can use these commands to manage it:

   ```bash
   # Check container status (running and stopped)
   docker ps -a

   # Start existing container (if stopped)
   docker start fintrac-couchdb

   # Stop running container
   docker stop fintrac-couchdb

   # Restart container (if running)
   docker restart fintrac-couchdb

   # View container logs
   docker logs fintrac-couchdb

   # Remove container completely (data will be preserved in volume)
   docker rm fintrac-couchdb
   ```

   **Option B: Direct Installation**
   ```bash
   # Arch Linux
   sudo pacman -S couchdb # For other distros, use the appropriate package manager.
   sudo systemctl start couchdb
   sudo systemctl enable couchdb

   # Then run the CouchDB container as outlined in Option A above.
   ```

4. **Configure CouchDB (If you want to use sync):**

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

   <br>

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

   *Production (Remote CouchDB - Network IP):*
   ```bash
   VITE_SYNC_ENABLED=true
   VITE_COUCHDB_URL=http://192.168.1.100:5984 # Replace with your local network IP address followed by port 5984
   VITE_COUCHDB_USERNAME=your-username
   VITE_COUCHDB_PASSWORD=your-secure-password
   VITE_SYNC_AUTO_START=true
   ```

   *Production (Remote CouchDB - Domain):*
   ```bash
   VITE_SYNC_ENABLED=true
   VITE_COUCHDB_URL=https://your-couchdb-server.com
   VITE_COUCHDB_USERNAME=your-username
   VITE_COUCHDB_PASSWORD=your-secure-password
   VITE_SYNC_AUTO_START=true
   ```

   *Offline-Only (No Sync):*
   ```bash
   VITE_SYNC_ENABLED=false
   ```

6. **Start the development server:**

   **For local development only:**
   ```bash
   npm run dev
   ```

   **For mobile device access (recommended for PWA testing):**
   ```bash
   npm run dev -- --host
   ```

   When using `--host`, Vite will show multiple URLs:
   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.1.xxx:5173/
   ```

7. **Open your browser:**

   **Desktop access:**
   Navigate to `http://localhost:5173` to view the application.

   **Mobile device access:**
   1. **Ensure devices are on the same network** (same WiFi)
   2. **Find your computer's IP address:**
      ```bash
      # On Linux
      ip addr show | grep "inet 192"
      # Or use the Network URL shown by Vite
      ```
   3. **Open on mobile browser:**
      Navigate to `http://YOUR_IP_ADDRESS:5173` (e.g., `http://192.168.1.100:5173`)
   4. **Install as PWA** (optional):
      - Chrome/Safari: Look for "Add to Home Screen" or "Install App" prompt
      - Test offline functionality and mobile responsiveness

   **Troubleshooting Mobile Access:**
   - **Firewall**: Ensure port 5173 is open on your development machine
   - **Network**: Both devices must be on the same local network
   - **HTTPS**: Some PWA features require HTTPS (use ngrok for testing if needed)

### Available Scripts

- `npm run dev` - Start development server (localhost only)
- `npm run dev -- --host` - Start development server accessible on network (for mobile testing)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Generate test coverage report

<br>

## Using the App

Now that you have FinTrac running, here's how to use the application:

### First Time Setup

1. **Open the application** in your browser at `http://localhost:5173`

2. **Handle sync connection errors** (if you see them):
   - If you see an error message like "CouchDB connection failed" or similar sync-related errors, click the **"Clear"** link next to the error message
   - This clears any cached connection attempts and allows you to use the app offline-first

### Adding Your First Transaction

1. **Add a transaction** by clicking either:
   - **"Inflow"** button (top right) - for income/money coming in
   - **"Spend"** button (top right) - for expenses/money going out

2. **Fill out the transaction form**:
   - **Description**: What the transaction was for (e.g., "Grocery shopping", "Salary")
   - **Amount**: How much money (e.g., 50.00)
   - **Category**: Select from predefined categories or create a custom one
   - **Date**: Defaults to today, but you can change it

3. **Save the transaction** - click "Add Transaction"

4. **Watch the dashboard populate**:
   - You'll immediately see your charts and balance summary update
   - The line chart shows trends over time
   - Balance summary shows total income, expenses, and net balance

### Using Sync (If Configured)

If you've set up CouchDB sync, click the cloud icon next to the Inflow/Spend buttons to reveal the sync controls modal:

1. **Manual sync**: Click the **"Sync Now"** button to sync your data with CouchDB
2. **Monitor sync status**: Watch for sync indicators showing upload/download progress
3. **Automatic sync**: If enabled in your `.env` file, sync will happen automatically at regular intervals

### Working Offline

- **Full offline capability**: The app works completely without an internet connection
- **Data persistence**: All your data is stored locally and survives browser restarts
- **PWA installation**: Install the app on your device using "Add to Home Screen" for a native app experience

### Troubleshooting Common Issues

- **Sync errors**: Click "Clear" next to error messages and ensure CouchDB is running
- **Empty charts**: Add a few transactions with different categories to see meaningful visualizations
- **Mobile access**: Ensure both devices are on the same WiFi network when using `npm run dev -- --host`

<br>

## What It Does

### Core Features (Completed)
- **Transaction Management**
  - [x] Add income/expense transactions manually
  - [x] Transaction fields: date, description, amount, currency, type (credit/debit), category, tags
  - [x] Form validation and error handling
  - [ ] Edit and delete existing transactions

- **Data Visualization Dashboard**
  - [x] Balance summary (net balance, expenses)
  - [x] Monthly spending trends (line chart)
  - [x] Interactive charts using Recharts
  - [x] Responsive design for mobile and desktop
  - [ ] Spending by category (pie chart)

- **Local-First Storage**
  - [x] All data stored locally using IndexedDB via Dexie
  - [x] Custom bidirectional sync with CouchDB
  - [x] Offline-first functionality
  - [x] Data persistence across browser sessions

- **Category Management**
  - [x] Predefined categories (Food, Transport, Entertainment, etc.)
  - [ ] Custom category creation
  - [ ] Color-coded categories for visual distinction

### Advanced Features (In Progress)
- **Multi-device Sync**
  - [x] Phase 1: One-way sync (upload local changes to CouchDB)
  - [x] Phase 2: Bidirectional sync (download remote changes)
  - [ ] Phase 3: Advanced conflict detection and resolution
  - [ ] Phase 4: Real-time sync with WebSocket/SSE
  - [ ] Phase 5: Selective sync and optimization

- **Enhanced UX**
  - [x] Loading states and error handling
  - [x] Empty state messages
  - [x] Mobile-responsive design
  - [ ] Dark mode support

### Future Enhancements
- Import/export functionality (CSV, JSON)
- Budget tracking and alerts
- Receipt photo attachment
- Advanced filtering and search
- Data analytics and insights
- Multiple currency support

<br>

## Technology Stack

### Frontend
- **React 18** - UI library with modern hooks and patterns
- **Vite** - Fast build tool and development server
- **TypeScript** - Static type checking for enhanced code quality
- **Tailwind CSS** - Utility-first CSS framework for rapid styling

### Data & Storage
- **Dexie.js** - Primary local database using IndexedDB with custom CouchDB sync
- **CouchDB** - Remote database for multi-device synchronization
- **PouchDB** - Legacy implementation (migrated from)

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
- Not yet deployed, but runs locally and can be deployed to platforms like Vercel or Netlify.

<br>

## Project Structure & Data Models

### Directory Structure
```bash
fin-trac/
├── src/
│   ├── components/          # Reusable UI components (Button, Card, Header, Modal, etc.)
│   ├── features/           # Feature-based modules organized by domain
│   │   ├── transactions/   # Transaction management
│   │   │   ├── components/ # Transaction-specific components
│   │   │   └── hooks/      # Transaction-related hooks
│   │   └── dashboard/      # Analytics and visualization
│   │       ├── components/ # Chart and summary components
│   │       └── hooks/      # Dashboard data processing hooks
│   ├── services/           # External services and utilities
│   │   ├── db/            # Dexie database configuration and schema
│   │   ├── repos/         # Data access repositories (CRUD operations)
│   │   ├── sync/          # CouchDB synchronization services
│   │   └── utils/         # Utility functions (currency, date, UUID, validation)
│   ├── hooks/             # Shared custom hooks
│   ├── test/              # Test utilities and setup
│   └── assets/            # Static assets (images, icons)
├── public/                # Static assets served directly
├── scripts/               # Build and utility scripts
├── dist/                  # Production build output (generated)
├── coverage/              # Test coverage reports (generated)
└── node_modules/          # Dependencies (generated)
```

**Category Model**
```ts
{
  id: string;
  name: string; // e.g. "Food", "Transport"
  color: string; // Tailwind color class for chart legend
}
```

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
UI Components → Custom Hooks → Repository Layer → Dexie.js → IndexedDB
                                      ↓
                              Custom CouchDB Sync Service → Remote CouchDB
```

### Component Architecture
- **Feature-based organization** with clear separation of concerns
- **Custom hooks** for state management and business logic
- **Repository pattern** for data access abstraction
- **Service layer** for external integrations and utilities

### System Boundaries
- **Frontend-only architecture** - No backend server required
- **Progressive Web App** - Installable, offline-capable
- **Local-first storage** - IndexedDB via Dexie
- **Optional cloud sync** - CouchDB for multi-device access

### Performance & Optimization
- **Tree shaking** enabled via Vite
- **Code splitting** by feature modules
- **Lazy loading** for chart components
- **Virtual DOM** optimization through React 18
- **IndexedDB** for fast local data access
- **Service Worker** registration for PWA functionality

<br>

## Development Environment

### System Requirements
- **Operating System**: Linux (development tested on Arch Linux)
- **Node.js**: Version 18 or higher
- **Package Manager**: npm (included with Node.js)
- **Browser**: Modern browser with IndexedDB support

### Testing

This project uses Vitest as the testing framework, integrated with React Testing Library for component and hook testing.

#### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Generate coverage report
npm run test:coverage
```

<br>

#### Test Structure

Tests are co-located with the code they test, following the pattern `ComponentName.test.tsx` or `utilityName.test.ts`:

- **Unit Tests**: Utilities, repositories, hooks
- **Integration Tests**: Components, user flows

#### Writing Tests

For utility functions:
```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './currencyUtils';

describe('formatCurrency', () => {
  it('formats amount with default currency', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
  });
});
```

For React components:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionForm } from './TransactionForm';

describe('TransactionForm', () => {
  it('renders form fields', () => {
    render(<TransactionForm addTransaction={mockFn} />);
    expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
  });
});
```

<br>

### Advanced Setup Options

**For detailed CouchDB troubleshooting, alternative installation methods, or production deployment configurations, see the full setup guide in the Quick Start section above.**

#### Troubleshooting

**CORS Errors:**
```bash
# Verify CORS is enabled
curl http://localhost:5984/_node/_local/_config/httpd/enable_cors
# Should return: "true"
```

**Authentication Issues:**
```bash
# Test admin credentials
curl -u admin:password http://localhost:5984/_session
```

**Connection Issues:**
```bash
# Test CouchDB is running
curl http://localhost:5984/
# Should return CouchDB welcome message
```

<br>

### Contributing

#### Development Guidelines
1. **Follow the established architecture** patterns outlined in `AGENTS.md`
2. **Write tests** for new features and bug fixes
3. **Use TypeScript strictly** - no `any` types
4. **Follow feature-based organization** for new modules
5. **Maintain AI-assisted development** practices

#### Code Quality Standards
- **ESLint configuration** for consistent code style
- **Prettier formatting** for automated code formatting
- **TypeScript strict mode** for type safety
- **Test coverage** requirements for critical business logic
- **Conventional commits** for clear version history

#### Getting Started with Development
1. **Read this README** for project understanding
2. **Review the architecture rules** in `AGENTS.md`
3. **Run the test suite** to ensure setup is correct
4. **Start with small changes** to understand the codebase
5. **Use AI tools** for scaffolding and assistance

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

## Project Goals & AI Integration

FinTrac is a capstone project for the AI for Developers II program that demonstrates practical application of AI-assisted development practices. The application serves as a privacy-friendly, local-first personal finance dashboard.

### Primary Objectives
- Apply AI-assisted development workflows in a real-world project
- Demonstrate schema-aware coding and automated review processes
- Showcase effective use of in-IDE AI tooling
- Build a functional, user-friendly finance tracking application

### AI Integration in Development
- **Planning & Architecture**: AI-assisted project structure and technical decisions
- **Code Generation**: Automated React component and TypeScript interface creation
- **Testing**: AI-generated test suites and edge case identification
- **Documentation**: Living documentation maintained with AI assistance
- **Debugging**: AI-powered error analysis and resolution suggestions

### Tools Used
- **Zed Editor** with integration with GitHub Copilot for in-IDE assistance
- **OpenCode CLI** for scaffolding initial base project files and folders
- **context7 MCP** for context-aware code generation
- **Context-driven prompts** for maintaining code consistency

### User Experience Focus

**Target Users:**
- **Individuals** seeking simple, private expense tracking
- **Privacy-conscious users** who prefer local data storage
- **Users** wanting offline-capable financial tools
- **Multi-device users** requiring optional cloud synchronization

**Key User Flows:**
1. **Quick Transaction Entry**: Add expense/income in under 30 seconds
2. **Visual Insights**: View spending patterns through interactive charts
3. **Data Management**: Edit, delete, and categorize transactions
4. **Sync Setup**: Optional CouchDB configuration for multi-device access

<br>

## Project Deliverables

### Completed Deliverables
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

---

*Built with AI-assisted development practices as part of the AI for Developers II program. Demonstrates modern web development patterns, local-first architecture, and privacy-focused design.*
