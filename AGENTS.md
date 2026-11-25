# Working on Novacore Mail

Cloudflare automatically deploys changes to `main` to production at `mail.novacore.cc`.

## Local workflow

- Use `npm ci` for a clean install and `npm run dev` to start the app. The fork pins `@cloudflare/vite-plugin` for compatibility with Workers types v4. Keep `package-lock.json` in sync when changing dependencies.
- Run `npm run typecheck` for TypeScript changes. It regenerates Wrangler and React Router types before running the compiler. Use `npm run build` to check the production bundle.
- The `EMAIL` binding in `wrangler.jsonc` uses `remote: true`. For local delivery checks, use a test recipient you control or capture the payload with a stub binding.

## Where to make changes

- `app/` contains the React Router UI. Browser requests go through `app/services/api.ts`. Compose state and send payloads live in `app/hooks/useComposeForm.ts`.
- `workers/app.ts` is the Worker entry point. It validates Cloudflare Access before dispatching HTTP requests to MCP, the API, the agent, or React Router. The shared Access policy grants access to all mailboxes.
- `workers/index.ts` handles inbound mail and the mailbox API. `workers/durableObject/` owns per-mailbox SQLite storage. When changing the schema, update `workers/db/schema.ts` and append a migration in `workers/durableObject/migrations.ts` so existing mailboxes upgrade.
- `workers/agent/` and `workers/mcp/` expose mail operations to the built-in agent and external MCP clients. They share the implementations in `workers/lib/tools.ts`. `workers/email-sender.ts` passes the final payload to the Cloudflare binding.

## Preserving mail formatting

Keep caller-supplied MCP `bodyHtml` intact through draft, update, and send. The built-in agent can request AI review of its generated draft text. Keep that review scoped to callers that request it.

Use `shared/email-quotes.ts` for quoted history and plain-text reply formatting. The TipTap extensions in `app/lib/compose-quote.ts` preserve the citation markup when someone edits a reply in the browser.

For changes to outgoing mail, check a formatted MCP message with a link and a multiline reply with `quote` both enabled and disabled. Inspect the `html` and `text` fields at the send binding for intact formatting and the expected number of quoted copies. For composer changes, also open a reply, edit it, and confirm the outgoing HTML retains the cited blockquote.
