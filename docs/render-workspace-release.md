# Somiren workspace release

## Scope

- Optional authenticator-app 2FA and recovery codes from the preceding approved changes.
- French/English collaborator interface, sharing the public site's saved language.
- Browser-local header and meeting dates/times, without a Paris headquarters label.
- Session browser/OS identification without IP storage or invented locations.
- Existing role identifiers, permissions, financial records, private media, and authored content are preserved.

## Verified Render targets

The static **Somiren** service owns `somiren.com` and `www.somiren.com`.
Its public `VITE_API_BASE_URL` points to
`https://somiren-mining-vision.onrender.com/api`.
The active API service is **Somiren-Mining-Vision**, not the separately configured,
failed **somiren-api** service.

Both active services track `main` with automatic deployment enabled. Merging the
release into `main` can therefore publish immediately. A release branch alone
does not update the live website.

## Required before publishing

1. In the **active API service**'s Environment section, add `SESSION_SECRET`
   using the existing workspace secret, without copying its value into chat,
   source files, or this document. Keep it stable across restarts and API instances.
   Do not replace an existing value or rotate it without planning re-encryption
   of enrolled TOTP factors. Choose **Save only** if preparing without publishing.
   The active API did not have this variable at the release-preparation check;
   its presence on the unused duplicate API does not configure the active API.
2. Keep the existing production database and storage credentials unchanged.
   The API's configured start command runs the additive, idempotent SQL
   migrations before serving. Do not run development `db push` against production.
3. Keep cross-site cookies enabled for the current frontend/API arrangement.
   Public frontend origins must remain in the API's allowed origins.
4. Publish the reviewed release on the two active services. Verify both their
   deployed commits and health before beginning production tests.

## Production acceptance checks

- Sign in and switch FR → EN → FR; reload preserves the selected language.
- Header date/time follows the browser timezone, independently of language.
- Agenda has no Paris/headquarters clock or Paris column heading.
- Security identifies the current browser/OS; older unrecorded sessions are
  described honestly, with no fabricated geographical location.
- Changing language does not erase an unsent message, restart camera preview,
  alter financial amounts, or reset a pending 2FA form.
- Optional 2FA can be enrolled, confirmed, used for a fresh login, recovered and
  disabled using a disposable account; do not expose its secrets in screenshots.

This document records release preparation, not proof of a completed publication.