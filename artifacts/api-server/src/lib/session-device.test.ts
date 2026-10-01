import assert from "node:assert/strict";
import test from "node:test";
import { MAX_USER_AGENT_LENGTH, parseSessionDevice, readableSessionDevice } from "./session-device";

test("identifies common desktop browsers and operating systems", () => {
  assert.deepEqual(parseSessionDevice(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  ), { browserName: "Chrome", osName: "Windows" });
  assert.deepEqual(parseSessionDevice(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  ), { browserName: "Safari", osName: "macOS" });
  assert.deepEqual(parseSessionDevice(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
  ), { browserName: "Microsoft Edge", osName: "Windows" });
});

test("identifies mobile and allowlisted alternate browser names", () => {
  assert.deepEqual(parseSessionDevice(
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
  ), { browserName: "Chrome", osName: "Android" });
  assert.deepEqual(parseSessionDevice(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.0.0 Mobile/15E148 Safari/604.1",
  ), { browserName: "Chrome", osName: "iOS" });
  assert.deepEqual(parseSessionDevice(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/124.0 Mobile/15E148 Safari/605.1.15",
  ), { browserName: "Firefox", osName: "iOS" });
  assert.deepEqual(parseSessionDevice(
    "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/22.0 Chrome/119.0.0.0 Safari/537.36",
  ), { browserName: "Samsung Internet", osName: "Android" });
  assert.deepEqual(parseSessionDevice(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  ), { browserName: "Firefox", osName: "Windows" });
  assert.deepEqual(parseSessionDevice(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OPR/108.0.0.0",
  ), { browserName: "Opera", osName: "Windows" });
  assert.deepEqual(parseSessionDevice(
    "Mozilla/5.0 (X11; CrOS x86_64 16093.58.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
  ), { browserName: "Chrome", osName: "ChromeOS" });
  assert.deepEqual(parseSessionDevice(
    "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0",
  ), { browserName: "Firefox", osName: "Linux" });
});

test("does not invent names for unknown or excessive user agents", () => {
  assert.deepEqual(parseSessionDevice("MysteryBrowser/1.0; UnknownOS"), { browserName: null, osName: null });
  assert.deepEqual(parseSessionDevice(`Chrome/1.0 ${"x".repeat(MAX_USER_AGENT_LENGTH)}`), {
    browserName: null,
    osName: null,
  });
  assert.deepEqual(parseSessionDevice(undefined), { browserName: null, osName: null });
  assert.equal(readableSessionDevice(null, null), "Unknown device");
  assert.equal(readableSessionDevice("Chrome", "Windows"), "Chrome on Windows");
});