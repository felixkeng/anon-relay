# Anon Relay

A browser-based anonymous messaging network with onion routing, built as a portfolio project.

## How it works

- Every browser tab becomes a **relay node** in the network
- Messages are encrypted end-to-end using **hybrid RSA + AES encryption**
- Messages travel through **random intermediate nodes** (onion routing) so no single node knows both the sender and recipient
- Nodes that go idle for 5 minutes are automatically disconnected (**proof of presence**)
- The signaling server only routes encrypted blobs — it never sees message content

## Architecture
Sender → Hop 1 → Hop 2 → Hop 3 → Recipient

Each hop decrypts only its own layer and forwards the rest. Middle nodes never see the message content or know the full route.

## Tech stack

- **Server:** Node.js, ws (WebSocket)
- **Client:** Vanilla JS, WebCrypto API (built into all modern browsers)
- **No database** — everything is in memory, nothing is logged or stored

## Try it live

👉 https://anon-relay.onrender.com

Open the link in multiple tabs or share it with a friend. Each tab gets a unique node ID. Type a node ID in the DM field to send an encrypted onion-routed message.

## Run it yourself

```bash
git clone https://github.com/felixkeng/anon-relay.git
cd anon-relay
npm install
node server/index.js
```

Then open `http://localhost:8080` in multiple tabs.

## Deploy your own instance (Railway / Render)

1. Fork this repo
2. Create a new Web Service on [Render](https://render.com) or [Railway](https://railway.app)
3. Connect your forked repo
4. Set build command: `npm install`
5. Set start command: `node server/index.js`
6. Deploy — the client auto-detects the server URL, no config needed

## Roadmap

- [ ] Idle tower defence game as the relay host interface
- [ ] Relay contribution score (more packets routed = in-game rewards)
- [ ] Multiple signaling server support for fuller decentralisation
