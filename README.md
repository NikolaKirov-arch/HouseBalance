# HouseBalance

HouseBalance is my Systems III project for managing shared household expenses.
Members can record expenses, split them in different ways, see current balances
and record payments between each other.

## Main functions

- Register and log in
- Create household groups
- Invite registered users
- Manage expense categories
- Add equal, exact and percentage expenses
- Delete expenses with permission checks
- Record settlement payments
- Calculate member balances
- Suggest a settlement plan
- View the group audit log

## Technologies

- React, JavaScript, Bootstrap and Vite
- Node.js and Express
- MySQL or MariaDB with `mysql2`
- `fetch()` for frontend requests
- JWT and `bcryptjs` for authentication

The frontend and backend are kept in separate folders.

## Balance calculation

Balances are calculated from expenses, expense splits and settlements. There is
no separate balance table.

```text
balance = paid expenses
        - owed expense shares
        + settlements sent
        - settlements received
```

A positive result means the member is owed money. A negative result means the
member owes money.

## Database setup

1. Create or select a MySQL database.
2. Import `backend/db/schema.sql`.
3. Optionally import `backend/db/seed.sql`.

The public seed file contains placeholders instead of working passwords and
invitation codes. You can register users through the application, or replace the
placeholders in a private copy before importing it.

## Run the backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Configure `backend/.env`:

```dotenv
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=studenti
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=YOUR_DATABASE
JWT_SECRET=YOUR_PRIVATE_SECRET
```

The health check is available at:

```text
http://localhost:5000/api/health
```

## Run the frontend

In another terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The default frontend address is `http://localhost:5173`.

## Tests and build

```bash
cd backend
npm test

cd ../frontend
npm run build
```

## Student server

Docker is not used for deployment. After configuring the database and backend
environment, build the frontend and start Express:

```bash
cd frontend
VITE_API_URL=/api npm run build

cd ../backend
NODE_ENV=production npm start
```

## Git branches

- `development` contains ongoing work.
- `main` contains tested versions.
