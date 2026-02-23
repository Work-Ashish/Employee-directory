# EMS Pro – Employee Management System

EMS Pro is a modern, full-stack Employee Management System built with **Next.js 16**, **Prisma**, and **PostgreSQL**. It provides a premium UI for managing every aspect of HR operations — from hiring to resignation.

---

## 🚀 Features

### Core HR
- **Employee Directory** — Centralized database with search, filter, and export (CSV/PDF)
- **Attendance Tracking** — Daily check-in/out logs and work-hour calculations
- **Leave Management** — Submit, approve, and reject leave requests with role-based access
- **Payroll** — Salary breakdowns with allowances, PF, tax, and net pay
- **Provident Fund** — Track employee and employer contributions

### Talent & Growth
- **Recruitment Pipeline** — Kanban-style candidate tracking across hiring stages
- **Performance Reviews** — Rating system with progress tracking and department views
- **Training & Development** — Course management with enrollment tracking and completion rates

### Operations
- **Asset Management** — Track hardware/software assignments with status lifecycle
- **Document Hub** — Role-filtered document repository (policies, contracts, payslips)
- **Help Desk** — Ticketing system with auto-generated codes and priority levels
- **Announcements** — Company-wide news with pinning, priority badges, and Google Calendar integration

### Platform
- **Organization Chart** — Interactive hierarchy visualization with drag-and-drop management
- **Team Calendar** — Full calendar with holidays, leaves, birthdays, and events
- **Resignation Tracker** — Submit and process resignations with status workflow
- **User Settings** — Persistent profile management (bio, accent color) and secure password updates
- **AI Assistant** — Built-in Gemini-powered chatbot for HR queries and navigation
- **Command Palette** — Global Ctrl+K utility for rapid navigation and actions
- **Role-Based Access** — Admins manage everything; employees see only their data
- **Dark Mode** — Full theme support with system preference detection
- **Responsive Design** — Mobile-optimized across all pages

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) |
| **ORM** | [Prisma 7](https://www.prisma.io/) |
| **Auth** | [NextAuth.js v5](https://authjs.dev/) (JWT strategy) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) |
| **UI** | [Radix UI](https://www.radix-ui.com/) / Custom components |
| **Charts** | [Recharts](https://recharts.org/) |
| **Calendar** | [React Big Calendar](https://github.com/jquense/react-big-calendar) |
| **Org Chart** | [ReactFlow](https://reactflow.dev/) |
| **State** | React Context API |
| **Validation** | [Zod](https://zod.dev/) |

---

## 🏁 Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL database (local or hosted)
- npm or yarn

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Work-Ashish/Employee-directory.git
cd Employee-directory

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and AUTH_SECRET

# 4. (Optional) Set up Google Calendar API for event synchronization
#    - Follow instructions in the documentation to get API credentials.
#    - Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.

# 5. Generate Prisma client & push schema
npm run db:generate
npx prisma db push

# 6. (Optional) Seed sample data
npm run db:seed

# 7. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio GUI |

---

## 🔑 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@emspro.com` | `admin` |
| **Employee** | `user@emspro.com` | `user` |

> Passwords are hashed with bcryptjs. Change them immediately in production.

---

## 📂 Project Structure

```
├── app/
│   ├── api/                  # Backend API routes
│   │   ├── auth/             #   NextAuth handler
│   │   ├── employees/        #   Employee CRUD + [id] route
│   │   ├── assets/           #   Asset management
│   │   ├── documents/        #   Document repository
│   │   ├── attendance/       #   Attendance tracking
│   │   ├── payroll/          #   Payroll records
│   │   ├── pf/               #   Provident fund
│   │   ├── performance/      #   Performance reviews
│   │   ├── training/         #   Training courses
│   │   ├── leaves/           #   Leave requests
│   │   ├── resignations/     #   Resignation workflow
│   │   ├── announcements/    #   Company announcements
│   │   ├── tickets/          #   Help desk tickets
│   │   ├── events/           #   Calendar events
│   │   ├── recruitment/      #   Recruitment pipeline
│   │   └── departments/      #   Department list
│   ├── admin/                # Admin-only pages
│   ├── employee/             # Employee dashboard
│   ├── login/                # Authentication page
│   └── [module]/             # Feature pages (attendance, payroll, etc.)
├── components/
│   ├── ui/                   # Reusable UI (DataTable, Modal, Skeleton)
│   ├── dashboard/            # Dashboard widgets
│   └── [module]/             # Feature-specific components
├── context/                  # AuthContext (global state)
├── lib/                      # Utilities (auth, prisma, helpers)
├── prisma/
│   ├── schema.prisma         # Database schema (18 models)
│   └── seed.ts               # Database seeder
├── types/                    # TypeScript type declarations
│   ├── index.ts              # Shared types
│   └── next-auth.d.ts        # NextAuth type augmentation
└── public/                   # Static assets
```

---

## 🗄️ Database Schema

The Prisma schema defines **18 models** across 6 domains:

| Domain | Models |
|--------|--------|
| **Auth** | `User` |
| **Core** | `Employee`, `Department` |
| **HR Ops** | `Attendance`, `Leave`, `Resignation`, `Payroll`, `ProvidentFund` |
| **Assets & Docs** | `Asset`, `Document` |
| **Growth** | `PerformanceReview`, `Training`, `TrainingEnrollment` |
| **Operations** | `Announcement`, `Ticket`, `CalendarEvent`, `Candidate` |

See [`prisma/schema.prisma`](prisma/schema.prisma) for the full schema, and [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md) for endpoint details.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
