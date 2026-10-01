---
name: Navigation throttling incident
description: Historical reason to assess API throttling against legitimate dashboard activity, separately from sign-in abuse.
---

Evaluate throttling against full-page resource fan-out and automatic request retries, not just the number of clicks. Keep navigation budgets separate from sign-in-attempt protection and session lifecycle requests.

**Why:** Normal collaborator navigation exhausted the former shared fifteen-minute budget. It then blocked session verification, sign-in, and logout, while the UI misleadingly reported a generic error or denied access. This was ordinary usage, not a bad password or an account-permission failure.

**How to apply:** When adjusting quotas or query refresh behavior, test browsing past the old shared threshold, independent session checks and logout, and continued enforcement of the stricter login-attempt limits. Treat HTTP 429 as temporary unavailability, not an authorization failure.