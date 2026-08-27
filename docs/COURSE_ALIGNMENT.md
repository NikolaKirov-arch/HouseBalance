# Course alignment

HouseBalance uses the technologies allowed in the Systems III implementation
instructions:

- React, JavaScript and Bootstrap for the frontend
- Node.js and Express for the backend
- MySQL or MariaDB for the database
- `fetch()` and `mysql2` for communication with the API and database

No TypeScript, ORM, Redux, Tailwind, Next.js or Docker deployment is used.

## React tutorial concepts

The frontend follows the four supplied React tutorials:

1. Components, JSX, props and React Router
2. `useState`, form events, lists and conditional rendering
3. `useEffect`, `async/await`, loading states and error messages
4. Context, `useContext` and the `useAuth` custom hook

The pages are separated into list, detail and create screens. Shared tables,
alerts, navigation and loading indicators are reusable components.

## Backend and database

Express routes receive requests, validate the input, execute parameterized SQL
and return JSON responses. Middleware checks authentication, group membership
and administrator permissions.

The database contains separate tables for users, groups, members, invitations,
categories, expenses, expense splits, settlements and audit records. Foreign
keys and transactions keep related records consistent.

Balances are not stored. They are calculated from the expense, split and
settlement records whenever they are requested.
