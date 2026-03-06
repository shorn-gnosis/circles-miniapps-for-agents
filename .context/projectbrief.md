# Project Brief — Circles Mini Apps Host

## Overview

A SvelteKit application that hosts mini apps in iframes under `/miniapps`. It provides a postMessage protocol for mini apps to request wallet actions (address, transactions, signing) and surfaces a wallet connection UI for Safe smart accounts.

## Core Requirements

1. **Mini App Hosting** — Render third-party apps inside iframes at `/miniapps/<slug>`.
2. **Wallet Bridge** — Provide a postMessage API for address requests, transactions, and message signing.
3. **Passkey-First Wallet** — Connect to Safe smart accounts using Cometh Connect SDK with passkeys.
4. **Secure Sandbox** — Iframe apps are sandboxed with limited permissions.
5. **Static Build** — Output is a fully static site for easy hosting.

## Repository

- Origin: `https://github.com/shorn-keld/circles-miniapps-for-agents`
- Licence: Not stated in workspace files.

## Goals

- Make it easy to test and list mini apps in a consistent host environment.
- Provide a safe, predictable wallet bridge for request/response flows.
- Keep the host light-weight and easy to extend.
