# HouseBalance

HouseBalance is a full-stack information system for recording shared household expenses, splitting them between participants, calculating explainable balances, suggesting settlement payments, recording repayments, and preserving an audit history.

The implementation follows the Systems III seminar design and the permitted course stack:

- Frontend: React, JavaScript, HTML, CSS, Bootstrap, Vite, React Router
- Backend: Node.js, Express
- Database: MySQL or MariaDB with `mysql2`
- Authentication: JWT tokens and `bcryptjs` password hashes
- HTTP client: the browser's plain `fetch()` API
- Configuration: `dotenv`

There is no TypeScript, Next.js, Tailwind, ORM, Redux, Material UI, or Docker deployment.

## Most important design rule

There is **no balance table** and no permanent member-balance field.

For every active member, the API calculates:

```text
net balance = expenses paid
            - expense shares owed
            + settlement payments sent
            - settlement payments received
```

- Positive balance: the member is owed money.
- Negative balance: the member owes money.
- Zero balance: the member is settled.

Because the calculation reads `expense`, `expense_split`, and `settlement` every time, the displayed result can be explained and verified from its source records.

## Project structure

```text
housebalance/
├── backend/
│   ├── config/db.js
│   ├── db/schema.sql
│   ├── db/seed.sql
│   ├── middleware/
│   ├── routes/
│   ├── tests/logic.test.js
│   ├── utils/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/components/
│   ├── src/context/
│   ├── src/pages/
│   ├── src/App.jsx
│   ├── src/api.js
│   ├── src/main.jsx
│   ├── src/styles.css
│   ├── .env.example
│   ├── index.html
│   └── package.json
├── docs/COURSE_ALIGNMENT.md
└── README.md
```

## Prerequisites

- Node.js 16.13.1 or newer
- npm
- MySQL 8+ or a compatible MariaDB version
- phpMyAdmin is optional but recommended for the course database setup

The selected dependency versions remain compatible with the Node 16.13.1 version used by the student server.

## 1. Create or select the MySQL database

On the university server, the database is normally assigned with this naming format:

```text
SISIII2026_YOUR_STUDENT_NUMBER
```

If it has already been created, do not create another database. Open phpMyAdmin and select the assigned database in the left sidebar.

For local development, create a database in phpMyAdmin or run this after replacing the placeholder:

```sql
CREATE DATABASE SISIII2026_YOUR_STUDENT_NUMBER
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

The SQL files intentionally do not contain a fixed `CREATE DATABASE` or `USE` statement. This prevents accidental import into the wrong student database.

## 2. Import SQL files in the exact order

In phpMyAdmin:

1. Select `SISIII2026_YOUR_STUDENT_NUMBER`.
2. Open **Import**.
3. Import `backend/db/schema.sql` first.
4. In a private local copy of `backend/db/seed.sql`, replace
   `REPLACE_WITH_LOCAL_BCRYPT_HASH` and `REPLACE_WITH_LOCAL_INVITATION_CODE`
   with local-only demo values.
5. After the schema import succeeds, import the edited local seed file second.

`schema.sql` drops and recreates the HouseBalance tables, so exporting important data before re-importing it is recommended.

Command-line alternative:

```bash
mysql -u studenti -p SISIII2026_YOUR_STUDENT_NUMBER < backend/db/schema.sql
mysql -u studenti -p SISIII2026_YOUR_STUDENT_NUMBER < backend/db/seed.sql
```

The schema includes primary keys, foreign keys, unique constraints, validation checks, and indexes for the requested lookup and join columns.

## 3. Configure and run the backend

From the `housebalance` directory:

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Edit `backend/.env` before `npm start`:

```dotenv
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=studenti
DB_PASSWORD=YOUR_PASSWORD_HERE
DB_NAME=SISIII2026_YOUR_STUDENT_NUMBER
JWT_SECRET=replace_with_a_long_random_secret
```

Do not commit `.env`; it is excluded by `.gitignore`.

Verify the backend and database connection:

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{"status":"ok","database":"connected"}
```

## 4. Configure and run the frontend

Open a second terminal from the `housebalance` directory:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

The frontend variable is:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

If this variable is missing, the frontend uses `http://localhost:5000/api` by default.

## Seeded sample data

The seed script creates three local sample users and the `Apartment` group. Plain-text
demo passwords are intentionally not published in this public repository. To test
authentication, register a new local account or set a private local-only password for
a seeded user before running the demonstration. Passwords stored by the application
are bcrypt hashes; plain-text passwords are never stored in the database.

The sample `Apartment` group contains:

- six default categories;
- one equal expense, one exact expense, and one percentage expense;
- one recorded settlement;
- audit-history entries.

Expected dynamically calculated balances are:

| Member | Calculated balance | Meaning |
| --- | ---: | --- |
| Nikola Kirov | -20.00 EUR | owes money |
| Ana Petrova | -20.00 EUR | owes money |
| Marko Markov | +40.00 EUR | is owed money |

The settlement plan therefore suggests two payments: Nikola to Marko for 20.00 EUR and Ana to Marko for 20.00 EUR.

## Implemented functionality

1. Registration, login, current-user check, and logout
2. Create and list household groups
3. Group dashboard and member list
4. Invite registered users and accept invitations
5. Create, list, and deactivate expense categories
6. Add and list expenses
7. Equal, exact-amount, and percentage splits
8. Frontend and backend split validation
9. Authorized expense deletion with dynamic recalculation
10. Record and list settlement payments
11. Explainable member-balance calculation
12. Greedy debtor-to-creditor settlement plan
13. Group audit/history log

Default categories are created in the same database transaction as a new group. Expense insertion, split insertion, deletion, settlements, invitations, and audit actions also use transactions where multiple records must stay consistent.

## API endpoints

Authentication:

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

Groups and invitations:

```text
POST   /api/groups
GET    /api/groups
GET    /api/groups/:groupId
GET    /api/groups/:groupId/members
GET    /api/invitations
POST   /api/invitations/accept
GET    /api/groups/:groupId/invitations
POST   /api/groups/:groupId/invitations
```

Categories and expenses:

```text
GET    /api/groups/:groupId/categories
POST   /api/groups/:groupId/categories
PATCH  /api/groups/:groupId/categories/:categoryId/deactivate
GET    /api/groups/:groupId/expenses
POST   /api/groups/:groupId/expenses
DELETE /api/groups/:groupId/expenses/:expenseId
```

Settlements, balances, and history:

```text
GET    /api/groups/:groupId/settlements
POST   /api/groups/:groupId/settlements
GET    /api/groups/:groupId/balances
GET    /api/groups/:groupId/settlement-plan
GET    /api/groups/:groupId/dashboard
GET    /api/groups/:groupId/audit-log
GET    /api/health
```

All protected requests use this header:

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

The backend checks active group membership for every group-scoped endpoint. Category and invitation management also require the `admin` role.

## Validation rules

- Expense and settlement amounts must be positive and use at most two decimal places.
- Payers, receivers, and expense participants must be active members of the same group.
- A settlement payer and receiver must be different members.
- Exact split values must sum to the expense amount in integer cents.
- Percentage values must sum to exactly 100.00%.
- Equal splits distribute any remainder cents deterministically, so stored shares always equal the expense total.
- Inactive categories remain connected to old expenses but cannot be selected for a new expense.
- Only the expense creator or a group administrator may delete an expense.

The frontend performs friendly validation, but the backend repeats every financial and access validation because browser input cannot be trusted.

## Verification commands

Backend syntax and core financial logic:

```bash
cd backend
npm test
find . -path './node_modules' -prune -o -name '*.js' -print0 | xargs -0 -n1 node --check
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Production build on the student server

Do not use Docker for server deployment. Clone or pull the Git repository on the student server, configure the database and `backend/.env`, then build the frontend:

```bash
cd housebalance/frontend
npm install
VITE_API_URL=/api npm run build

cd ../backend
npm install
NODE_ENV=production npm start
```

When `NODE_ENV=production`, Express serves the already-built `frontend/dist` directory and supports React Router refreshes. The frontend and backend remain separate source folders, but one Node process can expose the deployed application.

To restart after code changes:

```bash
cd housebalance/frontend
VITE_API_URL=/api npm run build

cd ../backend
NODE_ENV=production npm start
```

For a long-running university-server process, use the process-management method approved by the lecturer or server administrator.

## Git course requirement

The implementation instructions require a Git repository, meaningful incremental commits, and at least a stable branch plus a development branch. Create commits as you study, test, and improve each part so the history truthfully demonstrates your work. A sensible branch structure is:

```text
main        tested stable versions
develop     integrated ongoing development
feature/*   individual functions such as expenses or settlements
```

Do not commit passwords, JWT secrets, `node_modules`, or built `dist` files.

See `docs/COURSE_ALIGNMENT.md` for the direct mapping between the course/tutorial material and this implementation.
