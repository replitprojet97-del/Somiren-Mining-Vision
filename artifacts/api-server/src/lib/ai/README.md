# Somiren AI Phase 1

This module keeps text generation behind a small provider boundary:

- `AIProvider` describes the single `generate` operation.
- `MistralProvider` makes a bounded Chat Completions request to Mistral's fixed API endpoint.
- `AIService` exposes `generateProfessionalText` to application code.
- `createAIServiceFromEnv` validates configuration and builds the service.
- `AIError.code` provides stable, typed failure categories for callers.

Callers should use the service factory rather than constructing provider requests
or handling provider credentials themselves. This Phase 1 helper does not add
application routes or UI.

## Configuration

Set these environment variables in the runtime's secret/environment settings:

- `AI_API_KEY`: Mistral API key. Never commit it, print it, or include it in test
  fixtures beyond the deliberately fake key used by unit tests.
- `AI_MODEL`: the exact model name to send to the API.
- `AI_FREE_TIER_CONFIRMED`: must be the literal string `true` to enable the
  factory. This is an explicit operator guard only; it does **not** determine,
  enforce, or verify the billing mode of the Mistral account.

Before any live request, verify in the provider account that it is actually on a
free tier and that pay-as-you-go billing is not enabled. The API-side guard
cannot prevent charges if the account is billable. Keep keys in deployment
secrets, not in `.env` files committed to source control.

The Mistral request is limited to 6,000 prompt characters and 1–1,000 output
tokens (300 by default); the live smoke check requests at most 200 output
tokens and makes one call without retries.

## Checks

Run the offline unit suite from `artifacts/api-server`:

```sh
pnpm run test:ai
```

This bundles the TypeScript test entry with the already-installed esbuild and
runs it with Node's test runner. Its fetch implementation is always mocked, so
the suite makes no network calls and does not need a live key.

Only after an operator has securely configured a key and personally confirmed
the account's free-tier/billing status, an explicitly enabled live check can be
run with:

```sh
pnpm run test:ai:live
```

The live check uses a fixed fictional internal-training prompt with no personal
data, makes one bounded API call, and prints only the provider, model, and
generated synthetic text on success. Failures report only a stable error code,
not raw provider details or secrets.

The API server can also be built and deployed independently on Render. Configure
the three environment variables above in that service's environment settings;
no connection to the Replit deployment is required for direct Mistral API use.
Do not add provider calls to routes or user-facing flows until separately
designed and reviewed.