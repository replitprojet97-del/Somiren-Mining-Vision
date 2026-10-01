---
name: Mistral quota diagnosis
description: Distinguishing accepted credentials, model availability, and effective generation limits without activating paid usage.
---

Treat authentication, model discovery, and generation quota as separate checks. Dashboard rate limits and unused included usage are not proof that the API applies those limits to a particular generation request.

**Why:** During diagnosis, authenticated model discovery succeeded and the requested model supported chat completions, but generation was rejected with an effective request ceiling different from the positive dashboard limits. Changing the model alias did not resolve this discrepancy.

**How to apply:** Audit call counts before blaming request volume. Inspect sanitized status, provider error code, and quota headers on an explicitly authorized request. Distinguish a zero remaining quota from a zero ceiling. Do not infer token exhaustion or identify the organization/workspace/key as the cause when the response does not state the restriction's scope. Do not retry automatically, activate paid usage, or switch providers to bypass the restriction. No secrets, raw headers, account identifiers, or customer content belong in diagnostic output.