import type { AIProvider, AIGenerationResult } from "./AIProvider.js";
import { AIError } from "./errors.js";

export class AIService {
  constructor(private readonly provider: AIProvider) {}

  async generateProfessionalText(
    prompt: string,
    options?: { maxOutputTokens?: number },
  ): Promise<AIGenerationResult> {
    if (typeof prompt !== "string") {
      throw new AIError("INVALID_REQUEST");
    }
    if (
      options !== undefined &&
      (typeof options !== "object" || options === null || Array.isArray(options))
    ) {
      throw new AIError("INVALID_REQUEST");
    }

    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || normalizedPrompt.length > 6000) {
      throw new AIError("INVALID_REQUEST");
    }

    const maxOutputTokens = options?.maxOutputTokens ?? 300;
    if (
      typeof maxOutputTokens !== "number" ||
      !Number.isInteger(maxOutputTokens) ||
      maxOutputTokens < 1 ||
      maxOutputTokens > 1000
    ) {
      throw new AIError("INVALID_REQUEST");
    }

    return this.provider.generate({
      prompt: normalizedPrompt,
      maxOutputTokens,
    });
  }
}