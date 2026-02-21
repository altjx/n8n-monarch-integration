# n8n Monarch Money Integration

A custom [n8n](https://n8n.io) node that connects to [Monarch Money](https://www.monarchmoney.com), giving you access to your accounts, transactions, cash flow, budgets, and net worth data — all automatable in n8n workflows.

## Features

| Resource | Operations |
|---|---|
| **Account** | Get All, Get History |
| **Transaction** | Get Many (with filters), Get Summary |
| **Cash Flow** | Get Summary |
| **Budget** | Get All |
| **Net Worth** | Get Snapshots, Get By Account Type |

---

## Prerequisites

- n8n installed via any method (Docker, npm global, npx, etc.)
- Docker CLI available if using the Docker install path

---

## Installation

### 1. Clone this repo

```bash
git clone https://github.com/altjx/n8n-monarch-integration.git
cd n8n-monarch-integration
```

### 2. Run the install script

The install script copies the compiled node files into n8n's custom node directory (`~/.n8n/custom/`), which n8n automatically scans at startup regardless of how it was installed.

**Local install (npm global, npx, etc.):**

```bash
./install.sh
```

Then restart n8n however you normally run it.

**Docker install:**

```bash
./install.sh --docker
```

This copies the files into the running container's `/home/node/.n8n/custom/` directory and automatically restarts the container. If your container has a different name than `n8n`:

```bash
./install.sh --docker my-container-name
```

**Custom `N8N_USER_FOLDER`:**

If you've set a custom `N8N_USER_FOLDER` environment variable, prefix the command with it:

```bash
N8N_USER_FOLDER=/your/custom/path ./install.sh
```

### 3. Verify

After restarting, the **Monarch Money** node will appear in the n8n node panel and **Monarch Money API** will be available under **Credentials → New**.

> **Note:** The files are copied into n8n's custom directory, which persists across n8n updates. You only need to re-run `./install.sh` if you pull new changes from this repo.

---

## Credential Setup

In n8n, go to **Credentials → New → Monarch Money API** and fill in:

| Field | Required | Description |
|---|---|---|
| **Email** | Yes | Your Monarch Money account email |
| **Password** | Yes | Your Monarch Money account password |
| **MFA Secret Key** | If MFA enabled | The TOTP secret key from Monarch's MFA setup (see below) |

### MFA Setup

Monarch requires a **secret key** (not a 6-digit code) for automated MFA. Here's how to get it:

1. Log in to Monarch Money and go to **Settings → Security**
2. If MFA is already enabled, **disable it first**, then re-enable it
3. During the "Enable MFA" flow, Monarch will show a QR code and a text secret key — **copy and save the text secret key**
4. Add that secret key to your authenticator app (Google Authenticator, Authy, etc.) as you normally would
5. Paste the same secret key into the **MFA Secret Key** field in your n8n credential

Both your authenticator app and n8n use the same secret key independently — your existing 2FA setup continues to work alongside n8n.

---

## Updating

```bash
git pull
./install.sh         # or ./install.sh --docker
```

---

## Development

The TypeScript source files are in `src/`. The pre-compiled output in `dist/` is what the install script deploys.

To modify the node:

1. Clone the full [n8n repository](https://github.com/n8n-io/n8n)
2. Copy the `src/` files into their respective locations under `packages/nodes-base/`
3. Run `pnpm build` from the repo root (or `packages/nodes-base` directory)
4. Copy the new compiled output back into `dist/` in this repo

---

## Acknowledgments

The Monarch Money API flow — including authentication, MFA handling, and GraphQL query structure — was informed by [monarchmoney](https://github.com/hammem/monarchmoney), an excellent unofficial Python client for Monarch Money.

---

## Resources

- [Monarch Money](https://www.monarchmoney.com)
- [n8n Documentation](https://docs.n8n.io)
- [n8n Community](https://community.n8n.io)
