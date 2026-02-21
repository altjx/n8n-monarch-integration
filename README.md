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

- Docker with a running n8n container (the official `docker.n8n.io/n8nio/n8n` image)
- Your n8n container must be named `n8n` (or pass your container name to the install script)

---

## Installation

### 1. Clone this repo

```bash
git clone https://github.com/altjx/n8n-monarch-integration.git
cd n8n-monarch-integration
```

### 2. Run the install script

```bash
./install.sh
```

This copies the compiled node files into your running n8n container and patches its `package.json` to register the credential and node.

If your container has a different name, pass it as an argument:

```bash
./install.sh my-n8n-container
```

The script will automatically restart the container when done. After it comes back up, the **Monarch Money** node will appear in the n8n node panel and the **Monarch Money API** credential will be available under **Credentials → New**.

> **Note:** You'll need to re-run `./install.sh` any time n8n is updated, since the container image is replaced on update and the injected files are lost.

---

## Credential Setup

In n8n, go to **Credentials → New → Monarch Money API** and fill in:

| Field | Required | Description |
|---|---|---|
| **Email** | Yes | Your Monarch Money account email |
| **Password** | Yes | Your Monarch Money account password |
| **MFA Secret Key** | If MFA enabled | The TOTP secret key from Monarch's MFA setup screen (see below) |

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

To update the node after pulling new changes from this repo:

```bash
git pull
./install.sh
```

The install script will restart the container automatically.

---

## Development

The TypeScript source files are in `src/`. The pre-compiled output is in `dist/` and is what gets injected into the container by the install script.

If you want to modify the node:

1. Clone the full [n8n repository](https://github.com/n8n-io/n8n)
2. Copy the `src/` files into their respective locations under `packages/nodes-base/`
3. Build with `pnpm build` from the `packages/nodes-base` directory
4. Copy the new compiled output back into `dist/` in this repo

---

## Acknowledgments

The Monarch Money API flow — including authentication, MFA handling, and GraphQL query structure — was informed by [monarchmoney](https://github.com/hammem/monarchmoney), an excellent unofficial Python client for Monarch Money.

---

## Resources

- [Monarch Money](https://www.monarchmoney.com)
- [n8n Documentation](https://docs.n8n.io)
- [n8n Community](https://community.n8n.io)
