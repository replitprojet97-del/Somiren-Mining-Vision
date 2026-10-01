import { AIError } from "./errors.js";
import { MistralProvider } from "./MistralProvider.js";
import { AIService } from "./AIService.js";

export function createAIServiceFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): AIService {
  const apiKey = env.AI_API_KEY?.trim();
  const model = env.AI_MODEL?.trim();

  if (!apiKey || !model || env.AI_FREE_TIER_CONFIRMED !== "true") {
    throw new AIError("CONFIGURATION_ERROR");
  }

  return new AIService(new MistralProvider({ apiKey, model }, fetchImpl));
}