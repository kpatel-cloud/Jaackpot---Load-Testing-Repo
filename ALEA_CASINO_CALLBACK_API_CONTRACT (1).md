# Alea Casino Callback API — Contract for Load Testing

These are jaackpot-user-backend's own live endpoints — the ones the real Alea
game platform calls in production to report bets, wins, and balance checks.
For load testing, QA's tooling plays Alea's role and calls these directly.
There is no third-party involved and nothing new to stand up: this document
is the whole deliverable.

## 1. Environment prerequisites

| Item | Where to get it |
|---|---|
| `BASE_URL` | The load-test target's host, e.g. `https://<load-test-env-host>` |
| `ALEA_SECRET_KEY` | The `ALEA_SECRET_KEY` env var configured for that **same environment** (`alea.secret_key` in `app.config.js`). Ask backend/devops for the load-test environment's value — never reuse production's key against a non-prod target or vice versa. |
| Test user accounts | Must already exist in that environment with a funded wallet (`wallet.amount` / `bonusBalance`) in whatever `CURRENCY` you test with — comfortably above any bet amount you plan to send. |
| `ALEA_CASINO_GAME_ID` | The internal `casino_games.casinoGameId` for the game you launch with (not the slug/gameId used in the launch call). One-time lookup: `SELECT id, "casinoGameId" FROM casino_games WHERE ...` in tigdb for that environment. |

## 2. Step 1 — Bootstrap a real session

Don't fabricate session data. Log a test user in and launch the game the
normal way — this creates a real session server-side (Redis) exactly like a
real player would, so nothing about the callback contract can drift out of
sync with what the backend actually stores.

**Login**
```
POST {BASE_URL}/api/v1/user/login
Content-Type: application/json

{ "loginInput": "<test user email>", "password": "<password>" }
```
Response: `{ "data": { "accessToken": "...", "user": { "id": 42, ... } } }`

**Launch game**
```
GET {BASE_URL}/api/v1/casino/play-game?gameId=<slug>&currency=USD&isDemo=false
Authorization: Bearer <accessToken>
```
Response: `{ "data": { "sessionKey": "<casinoSessionId>", ... } }`

From these two calls you now have everything every callback below needs:
- `casinoSessionId` = `sessionKey` from the launch response
- `casinoPlayerId` = `` `${user.id}_${currency}` `` (currency = whatever you passed to `play-game`)

## 3. Step 2 — Signing

Every request must carry a `digest` header:
```
digest: SHA-512=<hex sha512 of (signed-string + ALEA_SECRET_KEY)>
```

The signed-string depends on the request:

| Request | Signed string |
|---|---|
| `POST /transactions` | The **exact raw JSON body bytes** you send — hash the literal string you're about to POST, don't re-serialize after |
| `GET /players/:id/balance` | `` `${casinoSessionId}${currency}${gameId}${integratorId}${softwareId}` `` (values are whatever you put in the query string — `integratorId`/`softwareId` aren't validated against anything, any consistent string works) |
| `GET /sessions/:casinoSessionId` | Just the `casinoSessionId` path param |

A mismatch returns `500` with `{ code: "INVALID_REQUEST", message: "Signature Incorrect" }` before your payload is even looked at — the fastest way to sanity-check your signing implementation is to send one request and confirm you *don't* get this.

## 4. Step 3 — Endpoints

### `GET /callback/v1/alea/sessions/:casinoSessionId`
Returns player/session info. Useful as a session-validity check.
```
200 → { "country": "NO", "currency": "USD", "casinoPlayerId": "42_USD", "isTest": false }
```

### `GET /callback/v1/alea/players/:casinoPlayerId/balance?casinoSessionId=...&currency=...&gameId=...&integratorId=...&softwareId=...`
```
200 → { "realBalance": 123.45, "bonusBalance": 0 }
```

### `POST /callback/v1/alea/transactions`
Single endpoint, routed by `type`. Common fields across all types:
- `id` — unique per request (idempotency key: a repeat `id` returns the original result with `isAlreadyProcessed: true` instead of double-processing)
- `casinoSessionId`, `player: { casinoPlayerId }`, `round: { id }`, `currency`
- `round.id` is what links a BET to its later WIN/ROLLBACK/END_ROUND — reuse the same `round.id` across a round's calls, and generate a fresh one per round

**BET**
```json
{
  "type": "BET", "id": "<uuid>", "casinoSessionId": "...",
  "player": { "casinoPlayerId": "42_USD" }, "round": { "id": "<round-uuid>" },
  "game": { "id": <ALEA_CASINO_GAME_ID> }, "amount": 1.00, "currency": "USD"
}
```
→ `200 { "id", "realBalance", "bonusBalance", "realAmount", "bonusAmount" }`

**WIN** (only send if the round actually wins — requires a prior BET with the same `round.id`)
```json
{
  "type": "WIN", "id": "<uuid>", "casinoSessionId": "...",
  "player": { "casinoPlayerId": "42_USD" }, "round": { "id": "<round-uuid>" },
  "amount": 2.00, "currency": "USD"
}
```
→ `200 { "realBalance", "bonusBalance" }`

**BET_WIN** (atomic bet+win in one call, alternative to separate BET/WIN)
```json
{
  "type": "BET_WIN", "id": "<uuid>", "casinoSessionId": "...",
  "player": { "casinoPlayerId": "42_USD" }, "round": { "id": "<round-uuid>" },
  "game": { "id": <ALEA_CASINO_GAME_ID> },
  "bet": { "amount": 1.00 }, "win": { "amount": 0 }, "currency": "USD"
}
```
Send `win.amount: 0` for a losing round (still required in the body), or the real win amount for a winning one.
→ `200 { "realBalance", "bonusBalance", "bet": { "realAmount", "bonusAmount" }, "win": { "realAmount", "bonusAmount" } }`

**END_ROUND** (settles the round; safe/expected to call even after a loss with no WIN)
```json
{ "type": "END_ROUND", "round": { "id": "<round-uuid>" }, "currency": "USD", "player": { "casinoPlayerId": "42_USD" } }
```
→ `200 { "realBalance", "bonusBalance" }`

**ROLLBACK** (reverses a prior BET or WIN — references the original transaction's `id` via `transaction.id`)
```json
{
  "type": "ROLLBACK", "id": "<uuid>", "casinoSessionId": "...",
  "player": { "casinoPlayerId": "42_USD" }, "round": { "id": "<round-uuid>" },
  "transaction": { "id": "<the BET or WIN request's original id>" }, "currency": "USD"
}
```
→ `200 { "realBalance", "bonusBalance" }`

**PROMO_PAYOUT** exists (bonus/free-spin payouts) but isn't documented here — its payload depends on active bonus state, which needs the bonus system's own context. Flag it as follow-up if QA's scenarios need bonus-funded rounds.

## 5. Gotchas

- `currency` on every call must equal the `displayCurrency` used at launch (`play-game`'s `currency` query param) — a mismatch returns `INVALID_CURRENCY`, not a silent conversion.
- `game.id` on BET/BET_WIN, if sent, is checked against the session's game — send `ALEA_CASINO_GAME_ID` (not the launch slug) or omit it entirely to skip the check.
- Duplicate-bet/rollback checks only look back 2–7 days (varies by handler) — `id` values don't need to be globally unique forever, just unique within that window.
- Insufficient-funds and session-expired errors return `200`-adjacent-looking JSON but with a `statusCode` field (403/500) — check HTTP status, not just body shape.
