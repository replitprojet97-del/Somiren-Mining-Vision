export interface AIProvider {
  readonly name: string;
  generate(request: {
    prompt: string;
    maxOutputTokens: number;
  }): Promise<{
    text: string;
    model: string;
    provider: string;
    usage?: {
      inputTokens: number;
      outputTokens: number;
    };
  }>;
}

export type AIGenerationResult = Awaited<ReturnType<AIProvider["generate"]>>;