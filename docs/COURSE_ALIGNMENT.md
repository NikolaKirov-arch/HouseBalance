# Course and tutorial alignment

This document shows where the Systems III sources and the supplied React tutorial outcomes appear in HouseBalance.

The design basis is the supplied HouseBalance seminar, the course implementation instructions, Steve Hoberman's *Data Modeling Made Simple* material, Chapter 8 (data modeling and analysis) of *System Analysis and Design Methods*, and the four supplied React learning-outcome sheets. The books guide the model structure and integrity decisions; the tutorial sheets guide the intentionally simple React implementation style.

## Systems III implementation instructions

| Requirement from the supplied instructions | HouseBalance implementation |
| --- | --- |
| Separate frontend and backend | `frontend/` and `backend/` are independent projects. |
| React frontend | React pages and components are under `frontend/src/`. |
| Express backend | `backend/server.js` mounts Express route modules. |
| MySQL database | `backend/db/schema.sql` and the `mysql2` connection pool. |
| Allowed web technologies | HTML5, CSS, JavaScript, React, Bootstrap, Node.js, and Express only; supporting libraries are limited to the requested database, configuration, password, JWT, routing, and Vite tooling. |
| At least five testable functions | The application provides authentication, groups, membership invitations, categories, three expense split types, settlements, balances, settlement plans, dashboard, deletion, and audit history. |
| Separate stability branches and meaningful Git history | The recommended truthful Git workflow is documented in `README.md`; no artificial history is generated. |
| No Docker deployment | Production instructions use npm and one Express process. |

## Seminar and data-model sources

The seminar describes HouseBalance as an information system whose balances must be transparent and traceable. The database implements that idea with normalized source facts rather than a redundant balance entity.

| Data-design principle | Implementation evidence |
| --- | --- |
| Each table represents one subject | Users, groups, memberships, invitations, categories, expenses, splits, settlements, and audit actions have separate tables. |
| Stable entity identifiers | Every table has an integer primary key named `id`. |
| Relationships and referential integrity | Named foreign-key constraints connect the nine tables. |
| Prevent duplicate facts | Unique email, unique user/group membership, unique category name per group, unique split member per expense, and unique invitation code constraints. |
| Domain constraints | `ENUM`, `NOT NULL`, `DECIMAL`, `CHECK`, defaults, and date types restrict stored values. |
| Preserve history | Used categories are deactivated, not deleted; important actions receive audit records. |
| Avoid update anomalies and redundant derived data | No balance value is stored. It is recalculated from expense, split, and settlement facts. |
| Physical optimization follows access paths | Indexes cover email lookup, group membership, group expenses, payer/category joins, split joins, settlements, and group audit history. |
| Transactional consistency | Multi-table group, invitation, expense, settlement, deletion, and audit operations use database transactions. |

The corrected implementation consistently uses `payer_member_id`, `category_id`, and `created_by_member_id`. These fields match the newer ER model and ensure that payer, category, and creator relationships are explicit foreign keys.

## React tutorial 1: Vite, components, props, JSX, and routing

| Learning outcome | Example in this project |
| --- | --- |
| Vite project structure | `frontend/index.html`, `src/main.jsx`, and Vite scripts in `package.json`. |
| Break an app into components | Navbar, group layout, alerts, loading state, cards, and four reusable tables. |
| JSX rules and expressions | Every page returns a single JSX tree and renders values with `{}`. |
| Pass data with props | Tables receive arrays and currency; `GroupCard` receives one group; alerts receive message/type. |
| Declarative routing | `App.jsx` uses `Routes` and `Route`; navigation uses `NavLink` and `Link`. |
| List/detail/create modules | Groups have list, dashboard/detail, and create pages; expenses and settlements have list/create pages. |
| Menu navigation without page reload | Global navbar and nested group tabs use React Router. |

## React tutorial 2: state, events, lists, and immutable updates

| Learning outcome | Example in this project |
| --- | --- |
| `useState` and rerendering | Forms, loaded records, alerts, and loading status are component state. |
| Event handling | Forms use `onSubmit`; fields use `onChange`; buttons use `onClick`. |
| `map()` with stable keys | Groups, members, categories, splits, settlements, and log entries render from arrays using database IDs. |
| Conditional rendering | Loading, error, empty, settled, admin-only, and split-type-specific UI states. |
| Destructuring and spread | Form field updates and Context values use object/array destructuring and immutable spread copies. |
| Interactive lists | Expense participants can be selected, cleared, and given exact/percentage values. |
| No direct state mutation | Participant and form objects are replaced with new objects using spread or `Object.fromEntries`. |

## React tutorial 3: effects, async/await, and UI request states

| Learning outcome | Example in this project |
| --- | --- |
| `useEffect` after rendering | Auth session, group details, dashboards, members, expenses, settlements, balances, plans, and logs load in effects. |
| Dependency arrays | Group pages reload when `groupId` changes. |
| Promises and async/await | `apiFetch` is async; form submissions and refresh helpers use async/await; independent page requests use `Promise.all`. |
| Loading/success/error/empty states | `Loading`, `AlertMessage`, empty-table messages, and successful action alerts cover the standard states. |
| Prevent stale updates | Data-loading effects use an `active` flag and cleanup function before setting state. |
| Retry-friendly behavior | A failed request shows a clear message; subsequent form actions and navigation can request again. |

## React tutorial 4: Context and a custom hook

| Learning outcome | Example in this project |
| --- | --- |
| Avoid prop drilling | Authentication is shared through `AuthContext`, not passed through every route component. |
| `createContext` and provider | `context/AuthContext.jsx` defines `AuthContext` and `AuthProvider`. |
| `useContext` access | The `useAuth` custom hook reads the Context. |
| Provider wraps consumers | `main.jsx` wraps the complete application with `AuthProvider`. |
| Appropriate Context scope | Only shared authentication state uses Context; page-specific data stays local. |

## Explainability from interface to database

The balance screen exposes all four terms in the formula for every member. The expense screen shows payer, category, split type, participant names, and each owed amount. The settlement screen shows payer, receiver, amount, date, and note. The audit screen records who performed important actions. Together these screens let a user move from a final balance back to the stored facts that produced it.
