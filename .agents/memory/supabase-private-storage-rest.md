---
name: Supabase private storage REST
description: Verified protocol details that are easy to get wrong when using a modern Supabase secret without its SDK.
---

For native Supabase Storage REST requests authenticated with a modern server secret, use the `apikey` header, not an assumed legacy bearer token. The signed-upload response uses `url`, while a signed-download response uses `signedURL`; file-info size and content type are top-level fields rather than children of `metadata`.

**Why:** A signed-upload endpoint can return HTTP 200 but the application still fail every upload if it reads the signed-download response field instead. The file-info response can contain an empty metadata object even when the object itself exists.

**How to apply:** When changing upload, completion, or download behavior, test each native REST response shape against a disposable object in the private bucket and remove that test object afterward. Never print signed URLs or credentials.