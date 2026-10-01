import { rateLimit } from "express-rate-limit";

// Navigation loads several resources per page. Use a short window so normal
// browsing cannot cause a fifteen-minute lockout of the entire application.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  skip: (req) => [
    "/healthz", "/auth/login", "/auth/session", "/auth/logout",
    "/admin/login", "/admin/session",
  ].includes(req.path),
  message: { error: "Trop de requêtes. Veuillez patienter une minute avant de réessayer." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication routes have independent budgets: browsing must not prevent
// session checks or logout. Login retains its stricter route-level limiter.
export const sessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: "Trop de vérifications de session. Veuillez patienter une minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const logoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Trop de demandes de déconnexion. Veuillez patienter une minute." },
  standardHeaders: true,
  legacyHeaders: false,
});