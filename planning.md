# Plan: Finance App Screens & DB Setup

**TL;DR**: Build 6 screens, restructure navigation into `(auth)`/`(tabs)` groups, migrate SQLite to the modern v16 API, and add missing repositories. All placeholder screens get replaced.

---

## Phase 1: DB Foundation

1. **Rewrite `mobile/db/index.js`** — Modern expo-sqlite v16 API (`openDatabaseAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`). Remove deprecated `openDatabase`/`db.transaction` wrapper.
2. **Update `mobile/db/migrations.js`** — Adapt `initDB()` to new API; same table schema.
3. **Update `mobile/db/repositories/user.repo.js`** — Add `hasUser()` for first-run detection. Hash passwords with `expo-crypto` SHA-256 before storing/comparing.
4. **Create `mobile/db/repositories/till.repo.js`** — `getAllTills()`, `createTill()`, `getTillBalance(tillId)` (SUM of transactions), `getTillsWithBalances()`.
5. **Create `mobile/db/repositories/transaction.repo.js`** — `createTransaction()`, `getTransactions({ tillId?, type?, dateFrom?, dateTo? })`, `getLastN(n)`, `getTotal()`, `getTotalByType(type)`.

---

## Phase 2: Auth Context & Navigation

6. **Create `mobile/context/auth.context.tsx`** — `AuthContext` with `{ isLoggedIn, isFirstRun, login(), logout(), register() }` and `useAuth()` hook.
7. **Rewrite `mobile/app/_layout.tsx`** — Calls `initDB()` once on mount. Provides `AuthContext`. Conditionally redirects: `isFirstRun → (auth)/setup`, `!isLoggedIn → (auth)/login`, otherwise `(tabs)`.
8. **Create `mobile/app/(auth)/_layout.tsx`** — Simple Stack, no header.
9. **Restructure `mobile/app/(tabs)/_layout.tsx`** — 4 tabs: Dashboard (house.fill), Tills (creditcard.fill), History (list.bullet), Settings (gear). Register `new-transaction` as a modal Stack screen here.
10. **Delete** `mobile/app/(tabs)/explore.tsx` and the old `mobile/app/(tabs)/login.tsx`.

---

## Phase 3: Screens

11. **`app/(auth)/setup.tsx`** (new) — First-run: app logo, password + confirm inputs, "Crear contraseña" button → calls `register()` then redirects to tabs.
12. **`app/(auth)/login.tsx`** (new, replaces old) — App logo, password input with show/hide toggle, "Ingresar" button.
13. **`app/(tabs)/index.tsx`** (replace) — Dashboard: "Saldo Total" card, "Efectivo" vs "Bancos" breakdown cards (tills with/without `account_number`), last-5 transactions list, FAB (+) to open `/new-transaction`.
14. **`app/(tabs)/tills.tsx`** (replaces explore) — List of accounts with computed balance. "+" header button opens a React Native `Modal` with name + account number inputs. Row tap navigates to Transactions filtered by that till.
15. **`app/(tabs)/transactions.tsx`** (new) — Horizontal chip filter bar (month/week, type, account). `FlatList` with income in green, expense in red. Accepts optional `tillId` route param.
16. **`app/new-transaction.tsx`** (new modal) — Type tabs (Ingreso | Egreso | Transferencia). Ingreso/Egreso: account picker, amount, description. Transferencia: origin + destination account pickers, amount, description. Date defaulting to today via `@react-native-community/datetimepicker`. "Guardar" saves and dismisses.
17. **`app/(tabs)/settings.tsx`** (new) — Logout button, CSV export button (expo-file-system writes file → expo-sharing opens share sheet).

---

## New Dependencies

- `@react-native-community/datetimepicker`
- `expo-crypto` — verify if bundled with expo SDK 54, install if not
- `expo-file-system` + `expo-sharing` — same check

---

## Files

| Path                                         | Action                     |
| -------------------------------------------- | -------------------------- |
| `mobile/db/index.js`                         | Rewrite (modern API)       |
| `mobile/db/migrations.js`                    | Update for new API         |
| `mobile/db/repositories/user.repo.js`        | Add hashing + `hasUser()`  |
| `mobile/db/repositories/till.repo.js`        | Create                     |
| `mobile/db/repositories/transaction.repo.js` | Create                     |
| `mobile/context/auth.context.tsx`            | Create                     |
| `mobile/app/_layout.tsx`                     | Add DB init + auth routing |
| `mobile/app/(auth)/_layout.tsx`              | Create                     |
| `mobile/app/(auth)/login.tsx`                | Create                     |
| `mobile/app/(auth)/setup.tsx`                | Create                     |
| `mobile/app/(tabs)/_layout.tsx`              | Replace with 4 tabs        |
| `mobile/app/(tabs)/index.tsx`                | Replace (Dashboard)        |
| `mobile/app/(tabs)/tills.tsx`                | Create                     |
| `mobile/app/(tabs)/transactions.tsx`         | Create                     |
| `mobile/app/(tabs)/settings.tsx`             | Create                     |
| `mobile/app/new-transaction.tsx`             | Create (modal)             |
| `mobile/app/(tabs)/explore.tsx`              | Delete                     |
| `mobile/app/(tabs)/login.tsx`                | Delete                     |

---

## Verification

1. First run → setup screen → create password → Dashboard with zero balances.
2. Kill app → reopen → login screen; wrong password rejected; correct → Dashboard.
3. Add till "Caja Chica" → appears with $0 balance.
4. New income $1000 on Caja Chica → Dashboard total and till balance update.
5. Transfer $500 Caja Chica → Banco → both balances adjust correctly.
6. Filter Transactions by "Ingreso" → only income rows shown.
7. Export CSV → share sheet opens with a valid file.
8. Logout → back to login screen.

---

## Decisions

- **SQLite**: modern v16 async API
- **Passwords**: SHA-256 via expo-crypto (no plaintext)
- **Auth**: in-memory state (login required each app launch)
- **Dashboard**: numeric cards only, no chart library
- **Transfers**: two linked transaction rows sharing a UUID `transfer_id`
- **Tills classification**: tills WITH `account_number` = "Bancos"; WITHOUT = "Efectivo"

## Out of Scope

- Biometric authentication (future: `expo-local-authentication`)
- Edit / delete transactions
- Multi-user support
