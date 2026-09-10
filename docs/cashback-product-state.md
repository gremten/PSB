# Cashback product state

Cashback is participant product state. It must not be stored in moderator/session state.

## Current month

- `cashbackConnected = false`: cashback is not connected and next-month selection is locked.
- Confirming three current-month categories sets `cashbackConnected = true`, saves them in `selectedCashbackCategories`, and makes next-month selection available.

## Next month

`nextMonthCashbackSelectionStatus` is the authoritative lifecycle:

1. `locked` — cashback is not connected.
2. `available` — cashback is connected, but no next-month category has been selected.
3. `draft` — one to three next-month categories are selected but not confirmed.
4. `confirmed` — exactly three categories were explicitly confirmed.

`nextMonthCashbackCategories` contains the draft or confirmed values. A non-empty array alone must never be interpreted as confirmation.

Persisted legacy state is normalized on read. Contradictory combinations are repaired: disconnected state is always `locked`, and `confirmed` without exactly three categories becomes `draft` or `available`.

## Analytics

- `cashback.next_month.selection.changed` records `period`, `selectedCount`, and `status` on every draft change.
- `cashback.next_month.categories.confirmed` records the explicit confirmation separately.
- Category selection remains product state; analytics only records interaction metadata needed for interpreting the usability session.
