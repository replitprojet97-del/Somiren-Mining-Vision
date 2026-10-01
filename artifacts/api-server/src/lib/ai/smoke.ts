import { createAIServiceFromEnv } from "./index";
import { AIError } from "./errors";

const syntheticPrompt =
  "Rédige une annonce de formation interne fictive de 40 à 60 mots, sans nom ni coordonnées personnelles.";

async function runSmokeTest(): Promise<void> {
  try {
    if (process.env.AI_FREE_TIER_CONFIRMED !== "true") {
      throw new AIError("CONFIGURATION_ERROR");
    }

    const service = createAIServiceFromEnv();
    const result = await service.generateProfessionalText(syntheticPrompt, {
      maxOutputTokens: 200,
    });
    process.stdout.write(
      `${JSON.stringify({
        provider: result.provider,
        model: result.model,
        text: result.text,
      })}\n`,
    );
  } catch (error) {
    const safeFailure =
      error instanceof AIError
        ? `${error.code}: ${error.message}`
        : "PROVIDER_UNAVAILABLE: Le service d’IA est temporairement indisponible.";
    process.stderr.write(`Somiren AI live smoke test failed: ${safeFailure}\n`);
    process.exitCode = 1;
  }
}

void runSmokeTest();