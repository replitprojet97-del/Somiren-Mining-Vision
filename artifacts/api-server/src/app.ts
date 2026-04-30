import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // handled by the frontend CDN/proxy
}));

// CORS — allow production domains + dev proxy + any extra origins from env
const extraOrigins = (process.env.EXTRA_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins: (string | RegExp)[] = [
  "https://somiren.com",
  "https://www.somiren.com",
  /\.replit\.dev$/,
  /\.replit\.app$/,
  /\.onrender\.com$/,
  /localhost/,
  ...extraOrigins,
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server / curl (no origin)
    if (!origin) return cb(null, true);
    const allowed = allowedOrigins.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    cb(allowed ? null : new Error("Not allowed by CORS"), allowed);
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

// Body size limit (prevent large-payload DoS)
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));

// Logging
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Rate limiting for contact endpoint: max 5 submissions per IP per 15 min
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Trop de messages envoyés. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/contact", contactLimiter);

// Global API rate limit: 100 req / 15 min per IP
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use("/api", router);

export default app;
