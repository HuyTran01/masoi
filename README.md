# Ma Sói 3D (Werewolf 3D)

Interactive 3D Werewolf game with Solo vs AI Practice, Online Multiplayer (WebSocket + HTTP), and Real-Life Game Master (GM) Assistant — localized in **Vietnamese (`vi`)** and **English (`en`)**.

## Quick Start

```bash
npm install
npm run dev      # Starts Express + Vite + WebSocket server on port 3000
npm run lint     # TypeScript type-check (tsc --noEmit)
npm test         # Full server, rules, SmartAI, audio & multi-client playtest suite
npm run build    # Production Vite bundle
```

## Environment Variables

Copy `.env.example` to `.env`:

- `GEMINI_API_KEY` *(optional, server-side only)*: Enables Gemini Tier-2 conversational AI bot replies in AI Practice via `POST /api/ai-chat`. If omitted, bots seamlessly use the built-in zero-latency Tier-1 social-deduction engine.
- `PORT`: Listening port (defaults to `3000`; Cloud Run injects `8080`).

## Deploying to Google Cloud Run (Recommended for Real Multiplayer)

Because real-time WebSocket rooms and authoritative match engines run in-process with per-room locks and local snapshot persistence (`.masoi-rooms-snapshot.json`), **deploy with `--max-instances=1`** so all players in a room connect to the same instance:

```bash
gcloud run deploy masoi-3d \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --max-instances=1 \
  --min-instances=0 \
  --timeout=3600 \
  --session-affinity \
  --set-env-vars="NODE_ENV=production"
```

Add `--set-secrets="GEMINI_API_KEY=gemini-api-key:latest"` if you want Gemini Tier-2 AI Practice chat enabled in production.

> **Scaling note**: If you later scale beyond a single Cloud Run instance (`--max-instances > 1`), move room state and pub/sub broadcasts to a shared store (e.g., Redis / Firestore) before increasing instance count.
