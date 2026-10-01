export const AI_ERROR_MESSAGES = {
  CONFIGURATION_ERROR: "La configuration du service d’IA est incomplète ou invalide.",
  INVALID_REQUEST: "La demande de génération est invalide.",
  RATE_LIMITED: "Le service d’IA est momentanément limité. Réessayez plus tard.",
  FREE_TIER_EXHAUSTED: "Le quota gratuit du service d’IA est épuisé. Aucun changement d’offre n’a été effectué.",
  AUTHENTICATION_ERROR: "Le service d’IA n’a pas autorisé la requête. Vérifiez sa configuration.",
  PROVIDER_UNAVAILABLE: "Le service d’IA est temporairement indisponible.",
  REQUEST_TIMEOUT: "Le service d’IA n’a pas répondu dans le délai autorisé.",
  INVALID_RESPONSE: "Le service d’IA a retourné une réponse invalide.",
  OUTPUT_LIMIT_EXCEEDED: "La réponse dépasse la limite de longueur autorisée.",
} as const;

export type AIErrorCode = keyof typeof AI_ERROR_MESSAGES;

export class AIError extends Error {
  readonly code: string;

  constructor(code: AIErrorCode) {
    super(AI_ERROR_MESSAGES[code]);
    this.name = "AIError";
    this.code = code;
  }
}