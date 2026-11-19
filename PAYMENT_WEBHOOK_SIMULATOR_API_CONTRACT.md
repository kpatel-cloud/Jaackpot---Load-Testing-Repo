# Payment Webhook Simulator — Contract for Load Testing

Simulates a payment provider settling a deposit or withdrawal via webhook —
the piece of the payment flow that actually moves wallet balances. It's
currently built against 0xProcessing's webhook contract (the only payment
webhook receiver in the system today), since that's the real code path being
exercised, but the endpoint itself is generic: one call, `deposit` or
`withdrawal`, no provider-specific knowledge needed by the caller.

Unlike Alea, this is a **new** endpoint (doesn't exist in production, only in
non-prod environments). QA calls this one endpoint; it does the signing and
fires the real webhook internally — no crypto/signature work needed on QA's
side, unlike Alea.

## Endpoint

```
POST {BASE_URL}/api/v1/qa-tools/payment/simulate-webhook
Content-Type: application/json
```

Only registered when the target environment has `NODE_ENV !== 'production'`.
If you get a 404, confirm you're pointed at a non-prod environment. No auth
header required.

## Prerequisites

Same as Alea: the test user must already have a wallet in the `currencyCode`
you test with. For `type: "withdrawal"`, that wallet also needs enough
balance to cover `amount` — the simulator actually decrements it, mirroring
what a real withdrawal request does.

## Request body

| Field | Required | Notes |
|---|---|---|
| `type` | yes | `"deposit"` or `"withdrawal"` |
| `userId` | yes | The platform's internal user id (`ClientId` on the wire) |
| `amount` | yes | In wallet-currency units |
| `currencyCode` | yes | Must match an existing wallet's `currencyCode` for that user, e.g. `"USDT"` |
| `status` | no (default `"Success"`) | `"Success"` \| `"Failed"` \| `"Cancelled"` |
| `paymentId` | no (auto-generated) | Set it yourself if you need to reference a specific value across calls |
| `providerCurrency` | no (defaults to `currencyCode`) | Only needed if you want to exercise a network-tagged currency string, e.g. `"USDT (ERC20)"` |
| `email` | no, deposit only | Cosmetic, included in the signed payload |
| `address` | no, withdrawal only | Cosmetic, included in the signed payload |

Example — simulate a $100 successful deposit:
```json
{ "type": "deposit", "userId": 42, "amount": 100, "currencyCode": "USDT" }
```

Example — simulate a failed withdrawal:
```json
{ "type": "withdrawal", "userId": 42, "amount": 50, "currencyCode": "USDT", "status": "Failed" }
```

## Response

```json
{
  "success": true,
  "data": {
    "simulatedPayload": { "...": "the exact signed payload sent to the real webhook" },
    "webhookResult": { "status": 200, "body": { "success": true } }
  }
}
```

`webhookResult.status`/`webhookResult.body` is the real webhook route's own
response — that's the thing to assert on (e.g. `status === 200` and, for a
deposit, checking the wallet balance actually moved afterward via your normal
balance-read endpoint).

## What each call actually does

- **`deposit`**: no pre-existing transaction needed. The real webhook handler
  auto-creates an "unsolicited deposit" transaction on the fly and credits
  the wallet directly. Repeatable with a fresh `paymentId` each time (or omit
  it — one is generated per call).
- **`withdrawal`**: the simulator first decrements the wallet and creates a
  matching PENDING transaction (committed before the webhook call), then
  fires the signed webhook to settle it — `Success` marks it approved,
  `Failed`/`Cancelled` marks it cancelled (matching real behavior, this does
  **not** auto-refund the wallet, since a real failed withdrawal doesn't
  either at this stage).
