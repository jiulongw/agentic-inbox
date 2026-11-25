<div align="center">
  <h1>Novacore Mail</h1>
  <p><em>A self-hosted email client with an AI agent, running entirely on Cloudflare Workers</em></p>
</div>

Novacore Mail is a fork of [Cloudflare’s Agentic Inbox](https://github.com/cloudflare/agentic-inbox). It lets you send, receive, and manage email through a web interface powered by your own Cloudflare account. Incoming emails arrive via [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/), each mailbox is isolated in its own [Durable Object](https://developers.cloudflare.com/durable-objects/) with a SQLite database, and attachments are stored in [R2](https://developers.cloudflare.com/r2/).

An **AI-powered Email Agent** can read your inbox, search conversations, and draft replies -- built with the [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/) and [Workers AI](https://developers.cloudflare.com/workers-ai/).

![Agentic Inbox screenshot](./demo_app.png)


Read the blog post to learn more about Cloudflare Email Service and how to use it with the Agents SDK, MCP, and from the Wrangler CLI: [Email for Agents](https://blog.cloudflare.com/email-for-agents/).

## Deploy to Cloudflare

The checked-in [Wrangler configuration](./wrangler.jsonc) deploys the Worker as `novacore-mail`. The web app and MCP endpoint use the custom domain `mail.novacore.cc`, and mailbox addresses use `@novacore.cc`. For another domain, update `routes[].pattern` for the web hostname and `vars.DOMAINS` for the mail domain in your copy before deploying.

1. **Deploy the Worker.** The deploy button provisions R2, Durable Objects, and Workers AI. To deploy from a checkout with your own configuration, use the CLI steps below. Both paths require the remaining setup steps.

   [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jiulongw/novacore-mail)

2. **Configure Cloudflare Access.** Protect the web hostname under the Worker's Settings > Domains & Routes. Set the Worker's `POLICY_AUD` and `TEAM_DOMAIN` secrets using the values shown by Access. `TEAM_DOMAIN` accepts the team URL or the full URL ending in `/cdn-cgi/access/certs`. [One-click Access setup](https://developers.cloudflare.com/changelog/post/2025-10-03-one-click-access-for-workers/)
3. **Set up Email Routing.** On the mail domain, create a catch-all rule that delivers incoming mail to the Worker.
4. **Enable outbound mail.** Configure Email Service for the sending domain. The Worker sends through the `EMAIL` binding. [Email Service documentation](https://developers.cloudflare.com/email-service/)
5. **Create a mailbox.** Sign in to the deployed app and create the address that should receive mail. The Worker only stores incoming mail for existing mailboxes.

The upstream project also provides a [setup walkthrough with screenshots](https://github.com/cloudflare/agentic-inbox/issues/4#issuecomment-4269118513).

### Troubleshooting Access

1. If you see `Invalid or expired Access token`, that usually means `POLICY_AUD` or `TEAM_DOMAIN` secrets are incorrect.
   * Resolution: [turn Access off and back on for the Worker to get the Access modal again](https://developers.cloudflare.com/changelog/post/2025-10-03-one-click-access-for-workers/), then reset your Worker secrets to the latest `POLICY_AUD` and `TEAM_DOMAIN` values shown there.
2. If you see `Cloudflare Access must be configured in production`, this application is intentionally enforcing Cloudflare Access so your inbox is not exposed to anyone on the internet.
   * Resolution: enable Access using [one-click Cloudflare Access for Workers](https://developers.cloudflare.com/changelog/post/2025-10-03-one-click-access-for-workers/), then set the `POLICY_AUD` and `TEAM_DOMAIN` Worker secrets from the modal values.

## Features

- **Full email client** — Send and receive emails via Cloudflare Email Routing with a rich text composer, reply/forward threading, folder organization, search, and attachments
- **Per-mailbox isolation** — Each mailbox runs in its own Durable Object with SQLite storage and R2 for attachments
- **Built-in AI agent** — Side panel with 9 email tools for reading, searching, drafting, and sending
- **Auto-draft on new email** — Agent automatically reads inbound emails and generates draft replies, always requiring explicit confirmation before sending
- **Configurable and persistent** — Custom system prompts per mailbox, persistent chat history, streaming markdown responses, and tool call visibility

### Formatted mail over MCP

MCP clients can pass formatted `bodyHtml` to the draft and send tools. The Worker preserves the supplied HTML, including links and layout. Both `send_email` and `send_reply` also send a plain-text alternative derived from the HTML.

By default, `draft_reply` and `send_reply` append the original message. Pass `quote: false` when your HTML already includes the conversation history or you want to omit it. The web composer and MCP use citation markup that lets supporting mail clients collapse quoted history. In the plain-text version of an MCP reply, each quoted line starts with `> `.

## Stack

- **Frontend:** React 19, React Router v7, Tailwind CSS, Zustand, TipTap, `@cloudflare/kumo`
- **Backend:** Hono, Cloudflare Workers, Durable Objects (SQLite), R2, Email Routing
- **AI Agent:** Cloudflare Agents SDK (`AIChatAgent`), AI SDK v6, Workers AI (`@cf/moonshotai/kimi-k2.5`), `react-markdown` + `remark-gfm`
- **Auth:** Cloudflare Access JWT validation (required outside local development)

## Local development

```bash
npm ci
npm run dev
```

Use the committed npm lockfile for reproducible installs. The fork pins `@cloudflare/vite-plugin` to `1.43.1` for compatibility with Workers types v4.

### Deploy from a checkout

After configuring your domains, create the R2 bucket if it does not already exist. The bucket name in `wrangler.jsonc` is `agentic-inbox`.

```bash
npx wrangler r2 bucket create agentic-inbox
npm run deploy
```

After deployment, complete the Access, Email Routing, Email Service, and mailbox steps above.

## Prerequisites

- Cloudflare account with a domain
- [Email Routing](https://developers.cloudflare.com/email-routing/) enabled for receiving
- [Email Service](https://developers.cloudflare.com/email-service/) enabled for sending
- [Workers AI](https://developers.cloudflare.com/workers-ai/) enabled (for the agent)
- [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) configured for deployed/shared environments (required in production)

Any user who passes the shared Cloudflare Access policy can access all mailboxes in this app by design. This includes the MCP server at `/mcp` -- external AI tools (Claude Code, Cursor, etc.) connected via MCP can operate on any mailbox by passing a `mailboxId` parameter. There is no per-mailbox authorization; the Cloudflare Access policy is the single trust boundary.

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser    │────>│  Hono Worker     │────>│  MailboxDO      │
│  React SPA   │     │  (API + SSR)     │     │  (SQLite + R2)  │
│  Agent Panel │     │                  │     └─────────────────┘
└──────┬───────┘     │  /agents/* ──────┼────>┌─────────────────┐
       │             │                  │     │  EmailAgent DO  │
       │ WebSocket   │                  │     │  (AIChatAgent)  │
       └─────────────┤                  │     │  9 email tools  │
                     │                  │────>│  Workers AI     │
                     └──────────────────┘     └─────────────────┘
```

## License

Apache 2.0 -- see [LICENSE](LICENSE).
