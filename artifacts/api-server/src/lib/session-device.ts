export const MAX_USER_AGENT_LENGTH = 2_048;

export interface SessionDevice {
  browserName: string | null;
  osName: string | null;
}

const UNKNOWN_DEVICE: SessionDevice = { browserName: null, osName: null };

/**
 * Extract only an allowlisted browser and operating-system name from a bounded UA.
 * The source string is deliberately never returned or persisted.
 */
export function parseSessionDevice(userAgent: string | undefined | null): SessionDevice {
  if (!userAgent || userAgent.length > MAX_USER_AGENT_LENGTH) return { ...UNKNOWN_DEVICE };

  let browserName: string | null = null;
  if (/\bSamsungBrowser\//i.test(userAgent)) {
    browserName = "Samsung Internet";
  } else if (/\b(?:OPR|Opera)\//i.test(userAgent)) {
    browserName = "Opera";
  } else if (/\bEdg(?:A|iOS)?\//i.test(userAgent)) {
    browserName = "Microsoft Edge";
  } else if (/\b(?:Firefox|FxiOS)\//i.test(userAgent)) {
    browserName = "Firefox";
  } else if (/\b(?:Chrome|Chromium|CriOS)\//i.test(userAgent)) {
    browserName = "Chrome";
  } else if (/\bSafari\//i.test(userAgent) && /\bVersion\//i.test(userAgent)) {
    browserName = "Safari";
  }

  let osName: string | null = null;
  if (/\b(?:iPhone|iPad|iPod)\b/i.test(userAgent)) {
    osName = "iOS";
  } else if (/\bAndroid\b/i.test(userAgent)) {
    osName = "Android";
  } else if (/\bWindows NT\b/i.test(userAgent) || /\bWindows\b/i.test(userAgent)) {
    osName = "Windows";
  } else if (/\bMacintosh\b|\bMac OS X\b/i.test(userAgent)) {
    osName = "macOS";
  } else if (/\bCrOS\b/i.test(userAgent)) {
    osName = "ChromeOS";
  } else if (/\bLinux\b|\bX11\b/i.test(userAgent)) {
    osName = "Linux";
  }

  return { browserName, osName };
}

export function readableSessionDevice(browserName: string | null, osName: string | null): string {
  if (browserName && osName) return `${browserName} on ${osName}`;
  if (browserName) return browserName;
  if (osName) return osName;
  return "Unknown device";
}