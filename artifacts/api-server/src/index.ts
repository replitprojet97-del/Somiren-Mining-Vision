import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  const selfPingUrl = process.env["RENDER_EXTERNAL_URL"];
  if (selfPingUrl) {
    const INTERVAL_MS = 14 * 60 * 1000;
    setInterval(() => {
      fetch(`${selfPingUrl}/api/healthz`)
        .then(() => logger.info("Self-ping OK"))
        .catch((pingErr: unknown) => logger.warn({ err: pingErr }, "Self-ping failed"));
    }, INTERVAL_MS);
    logger.info({ url: `${selfPingUrl}/api/healthz`, intervalMin: 14 }, "Self-ping scheduled");
  }
});
