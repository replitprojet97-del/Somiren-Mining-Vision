import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);

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
  ...extraOrigins,
  ...(process.env.NODE_ENV === "development"
    ? [/\.replit\.dev$/, /\.replit\.app$/, /localhost/]
    : []),
];
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (!origin) {
    next();
    return;
  }
  const allowed = allowedOrigins.some((candidate) =>
    typeof candidate === "string" ? candidate === origin : candidate.test(origin)
  );
  if (!allowed) {
    res.status(403).json({ error: "Origine non autorisée." });
    return;
  }
  next();
});
app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server / curl (no origin)
    if (!origin) return cb(null, true);
    const allowed = allowedOrigins.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    cb(null, allowed);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

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

// Body size limit (prevent large-payload DoS)
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));
app.use(cookieParser());

app.use("/api", (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    next();
    return;
  }
  const origin = req.get("origin");
  if (!origin) {
    if (req.path.startsWith("/auth/") || req.path.startsWith("/workspace/")) {
      res.status(403).json({ error: "Origine requise." });
      return;
    }
    next();
    return;
  }
  const allowed = allowedOrigins.some((candidate) =>
    typeof candidate === "string" ? candidate === origin : candidate.test(origin)
  );
  if (!allowed) {
    res.status(403).json({ error: "Origine non autorisée." });
    return;
  }
  next();
});

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
