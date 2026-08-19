# Agent Notes

## Architecture

- **CRUD routes are generated, not handwritten.** `apps/api/src/routes/finances/transactions.ts` is a short declarative config fed into `apps/api/src/lib/crud.ts` `defineResource()`. There are no per-route handler functions for standard GET/POST/PATCH/DELETE — the CRUD logic lives entirely in `crud.ts`. To change request handling for an endpoint, edit `crud.ts` or the Zod schemas, not the route file.
- **Every web component re-declares its own `Transaction` interface.** There is no shared frontend type. `App.tsx`, `TransactionsList.tsx`, `Dashboard.tsx`, `TransactionDetailModal.tsx`, `apiClient.ts`, etc. each define `interface Transaction { ... }` independently. Adding a field to the API does not propagate — you must update each component that needs it.
- **Transaction-related Zod schemas live in one file but four exports.** `apps/api/src/schemas/transactions.ts` exports `TransactionSchema`, `CreateTransactionSchema`, `UpdateTransactionSchema`, and `TransactionListItemSchema`. Adding a column to the `transactions` table requires updating all four, plus `TransactionListItemSchema` is the one used for list queries with joins.

## Environment

- **`code_search` (ripgrep) is broken on this Windows host.** The vendored binary at `…\vendor\ripgrep\x64-win32\rg.exe` is missing. Fall back to `grep -rn` via terminal for code searches. `findstr` also has quoting issues — prefer `grep`.
- **Windows path separators.** The project root uses backslash paths internally (`apps\\web\\...`), but bash commands in the terminal need forward slashes. Both forms appear in tool outputs.
