import assert from "node:assert/strict";
import test from "node:test";
import { AIService, createAIServiceFromEnv, MistralProvider } from "./index";
import type { AIProvider } from "./AIProvider";

const API_KEY = "somiren-test-key-do-not-use";
const MODEL = "mistral-small-latest";
const SUCCESS_TEXT = "Texte professionnel synthétique pour une formation interne.";

function mockResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function successfulPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "synthetic-completion",
    model: MODEL,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: SUCCESS_TEXT },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 18, completion_tokens: 12 },
    ...overrides,
  };
}

function makeFetch(
  response: Response | (() => Promise<Response>),
  onCall?: (url: string, init: RequestInit) => void,
): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0], init: RequestInit = {}) => {
    onCall?.(String(input), init);
    return typeof response === "function" ? response() : response;
  }) as typeof fetch;
}

function assertAIErrorCode(error: unknown, code: string): asserts error is Error & { code: string } {
  assert.ok(error instanceof Error, "expected a typed AI error");
  assert.equal((error as Error & { code?: string }).code, code);
  assert.doesNotMatch(error.message, new RegExp(API_KEY));
}

function makeProvider(generate: AIProvider["generate"]): AIProvider {
  return { name: "test-provider", generate };
}

test("AIService delegates the prompt and requested token limit and returns provider metadata", async () => {
  const requested: Array<{ prompt: string; maxOutputTokens: number }> = [];
  const result = {
    text: SUCCESS_TEXT,
    model: MODEL,
    provider: "mistral",
    usage: { inputTokens: 18, outputTokens: 12 },
  };
  const service = new AIService(
    makeProvider(async (input) => {
      requested.push(input);
      return result;
    }),
  );

  assert.deepEqual(
    await service.generateProfessionalText("Rédige un texte fictif.", { maxOutputTokens: 42 }),
    result,
  );
  assert.deepEqual(requested, [{ prompt: "Rédige un texte fictif.", maxOutputTokens: 42 }]);
});

test("AIService uses the 300-token default", async () => {
  let received: { prompt: string; maxOutputTokens: number } | undefined;
  const service = new AIService(
    makeProvider(async (input) => {
      received = input;
      return { text: SUCCESS_TEXT, model: MODEL, provider: "mistral" };
    }),
  );

  await service.generateProfessionalText("Texte de test.");
  assert.deepEqual(received, { prompt: "Texte de test.", maxOutputTokens: 300 });
});

test("AIService rejects output token limits outside 1..1000", async () => {
  const service = new AIService(
    makeProvider(async () => ({ text: SUCCESS_TEXT, model: MODEL, provider: "mistral" })),
  );
  for (const maxOutputTokens of [0, 1001, -1, 1.5]) {
    await assert.rejects(
      service.generateProfessionalText("Texte de test.", { maxOutputTokens }),
      (error: unknown) => {
        assertAIErrorCode(error, "INVALID_REQUEST");
        return true;
      },
    );
  }
});

test("factory reports missing configuration without exposing configuration values", () => {
  for (const env of [
    { AI_MODEL: MODEL, AI_FREE_TIER_CONFIRMED: "true" },
    { AI_API_KEY: API_KEY, AI_FREE_TIER_CONFIRMED: "true" },
  ]) {
    assert.throws(
      () => createAIServiceFromEnv(env, makeFetch(mockResponse(200, successfulPayload()))),
      (error: unknown) => {
        assertAIErrorCode(error, "CONFIGURATION_ERROR");
        return true;
      },
    );
  }
});

test("factory requires explicit free-tier confirmation", () => {
  for (const flag of [undefined, "false", "TRUE", "1"]) {
    const env = {
      AI_API_KEY: API_KEY,
      AI_MODEL: MODEL,
      ...(flag === undefined ? {} : { AI_FREE_TIER_CONFIRMED: flag }),
    };
    assert.throws(
      () => createAIServiceFromEnv(env, makeFetch(mockResponse(200, successfulPayload()))),
      (error: unknown) => {
        assertAIErrorCode(error, "CONFIGURATION_ERROR");
        return true;
      },
    );
  }
});

test("provider sends one French system message and the user prompt to the fixed Mistral endpoint", async () => {
  let requestUrl = "";
  let requestInit: RequestInit = {};
  const provider = new MistralProvider(
    { apiKey: API_KEY, model: MODEL },
    makeFetch(mockResponse(200, successfulPayload()), (url, init) => {
      requestUrl = url;
      requestInit = init;
    }),
  );
  const result = await provider.generate({
    prompt: "Rédige une annonce fictive.",
    maxOutputTokens: 200,
  });

  assert.equal(requestUrl, "https://api.mistral.ai/v1/chat/completions");
  assert.equal(requestInit.method, "POST");
  const headers = new Headers(requestInit.headers);
  assert.equal(headers.get("authorization"), `Bearer ${API_KEY}`);
  const body = JSON.parse(String(requestInit.body));
  assert.equal(body.model, MODEL);
  assert.equal(body.max_tokens, 200);
  assert.deepEqual(body.messages.map((message: { role: string }) => message.role), [
    "system",
    "user",
  ]);
  assert.match(body.messages[0].content, /français|française|franc/i);
  assert.equal(body.messages[1].content, "Rédige une annonce fictive.");
  assert.equal("tools" in body, false);
  assert.equal("tool_choice" in body, false);
  assert.deepEqual(result, {
    text: SUCCESS_TEXT,
    model: MODEL,
    provider: "mistral",
    usage: { inputTokens: 18, outputTokens: 12 },
  });
});

test("factory uses the configured model and injected fetch implementation", async () => {
  const configuredModel = "configured-fictional-model";
  let calledModel = "";
  let calls = 0;
  const service = createAIServiceFromEnv(
    {
      AI_API_KEY: API_KEY,
      AI_MODEL: configuredModel,
      AI_FREE_TIER_CONFIRMED: "true",
    },
    makeFetch(mockResponse(200, successfulPayload({ model: configuredModel })), (_url, init) => {
      calls += 1;
      calledModel = JSON.parse(String(init.body)).model;
    }),
  );

  const result = await service.generateProfessionalText("Texte synthétique.");
  assert.equal(calledModel, configuredModel);
  assert.equal(result.model, configuredModel);
  assert.equal(calls, 1);
});

test("provider rejects prompts longer than 6000 characters before making a request", async () => {
  let calls = 0;
  const provider = new MistralProvider(
    { apiKey: API_KEY, model: MODEL },
    makeFetch(mockResponse(200, successfulPayload()), () => {
      calls += 1;
    }),
  );

  await assert.rejects(
    provider.generate({ prompt: "x".repeat(6001), maxOutputTokens: 1 }),
    (error: unknown) => {
      assertAIErrorCode(error, "INVALID_REQUEST");
      return true;
    },
  );
  assert.equal(calls, 0);
});

test("provider rejects output token limits outside 1..1000 before making a request", async () => {
  let calls = 0;
  const provider = new MistralProvider(
    { apiKey: API_KEY, model: MODEL },
    makeFetch(mockResponse(200, successfulPayload()), () => {
      calls += 1;
    }),
  );
  for (const maxOutputTokens of [0, 1001]) {
    await assert.rejects(
      provider.generate({ prompt: "Texte synthétique.", maxOutputTokens }),
      (error: unknown) => {
        assertAIErrorCode(error, "INVALID_REQUEST");
        return true;
      },
    );
  }
  assert.equal(calls, 0);
});

test("429 is classified as rate limited and is not retried", async () => {
  let calls = 0;
  const provider = new MistralProvider(
    { apiKey: API_KEY, model: MODEL },
    makeFetch(mockResponse(429, { message: "too many requests" }), () => {
      calls += 1;
    }),
  );

  await assert.rejects(
    provider.generate({ prompt: "Texte synthétique.", maxOutputTokens: 50 }),
    (error: unknown) => {
      assertAIErrorCode(error, "RATE_LIMITED");
      return true;
    },
  );
  assert.equal(calls, 1);
});

test("402 is classified as free-tier exhausted without a second request", async () => {
  let calls = 0;
  const provider = new MistralProvider(
    { apiKey: API_KEY, model: MODEL },
    makeFetch(mockResponse(402, { message: "payment required" }), () => {
      calls += 1;
    }),
  );

  await assert.rejects(
    provider.generate({ prompt: "Texte synthétique.", maxOutputTokens: 50 }),
    (error: unknown) => {
      assertAIErrorCode(error, "FREE_TIER_EXHAUSTED");
      return true;
    },
  );
  assert.equal(calls, 1);
});

test("401 is classified as authentication failure and does not reveal the key", async () => {
  const provider = new MistralProvider(
    { apiKey: API_KEY, model: MODEL },
    makeFetch(mockResponse(401, { message: `invalid key ${API_KEY}` })),
  );

  await assert.rejects(
    provider.generate({ prompt: "Texte synthétique.", maxOutputTokens: 50 }),
    (error: unknown) => {
      assertAIErrorCode(error, "AUTHENTICATION_ERROR");
      return true;
    },
  );
});

test("network errors and 5xx responses are classified safely", async () => {
  const providerWithNetworkError = new MistralProvider(
    { apiKey: API_KEY, model: MODEL },
    (async () => {
      throw new Error(`network failure containing ${API_KEY}`);
    }) as typeof fetch,
  );
  await assert.rejects(
    providerWithNetworkError.generate({ prompt: "Texte synthétique.", maxOutputTokens: 50 }),
    (error: unknown) => {
      assertAIErrorCode(error, "PROVIDER_UNAVAILABLE");
      return true;
    },
  );

  const providerWithServerError = new MistralProvider(
    { apiKey: API_KEY, model: MODEL },
    makeFetch(mockResponse(503, { message: `failure ${API_KEY}` })),
  );
  await assert.rejects(
    providerWithServerError.generate({ prompt: "Texte synthétique.", maxOutputTokens: 50 }),
    (error: unknown) => {
      assertAIErrorCode(error, "PROVIDER_UNAVAILABLE");
      return true;
    },
  );
});

test("aborted requests are classified as timeouts", async () => {
  const timeoutFetch = ((_input: Parameters<typeof fetch>[0], init: RequestInit = {}) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init.signal;
      if (!signal) {
        reject(new Error("missing abort signal"));
        return;
      }
      const fail = () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      };
      if (signal.aborted) fail();
      else signal.addEventListener("abort", fail, { once: true });
    })) as typeof fetch;
  const provider = new MistralProvider(
    { apiKey: API_KEY, model: MODEL, timeoutMs: 5 },
    timeoutFetch,
  );

  await assert.rejects(
    provider.generate({ prompt: "Texte synthétique.", maxOutputTokens: 50 }),
    (error: unknown) => {
      assertAIErrorCode(error, "REQUEST_TIMEOUT");
      return true;
    },
  );
});

test("malformed and empty responses are rejected", async () => {
  const malformedProvider = new MistralProvider(
    { apiKey: API_KEY, model: MODEL },
    makeFetch(new Response("{", { status: 200, headers: { "content-type": "application/json" } })),
  );
  await assert.rejects(
    malformedProvider.generate({ prompt: "Texte synthétique.", maxOutputTokens: 50 }),
    (error: unknown) => {
      assertAIErrorCode(error, "INVALID_RESPONSE");
      return true;
    },
  );

  for (const payload of [
    successfulPayload({
      choices: [{ message: { role: "assistant", content: "" }, finish_reason: "stop" }],
    }),
    successfulPayload({
      choices: [{ message: { role: "assistant", content: null }, finish_reason: "stop" }],
    }),
  ]) {
    const provider = new MistralProvider(
      { apiKey: API_KEY, model: MODEL },
      makeFetch(mockResponse(200, payload)),
    );
    await assert.rejects(
      provider.generate({ prompt: "Texte synthétique.", maxOutputTokens: 50 }),
      (error: unknown) => {
        assertAIErrorCode(error, "INVALID_RESPONSE");
        return true;
      },
    );
  }
});

test("tool-call responses and truncated generations are rejected", async () => {
  const toolProvider = new MistralProvider(
    { apiKey: API_KEY, model: MODEL },
    makeFetch(
      mockResponse(
        200,
        successfulPayload({
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [{ id: "synthetic-tool-call", type: "function" }],
              },
              finish_reason: "tool_calls",
            },
          ],
        }),
      ),
    ),
  );
  await assert.rejects(
    toolProvider.generate({ prompt: "Texte synthétique.", maxOutputTokens: 50 }),
    (error: unknown) => {
      assertAIErrorCode(error, "INVALID_RESPONSE");
      return true;
    },
  );

  const truncatedProvider = new MistralProvider(
    { apiKey: API_KEY, model: MODEL },
    makeFetch(
      mockResponse(
        200,
        successfulPayload({
          choices: [
            {
              message: { role: "assistant", content: SUCCESS_TEXT },
              finish_reason: "length",
            },
          ],
        }),
      ),
    ),
  );
  await assert.rejects(
    truncatedProvider.generate({ prompt: "Texte synthétique.", maxOutputTokens: 1 }),
    (error: unknown) => {
      assertAIErrorCode(error, "OUTPUT_LIMIT_EXCEEDED");
      return true;
    },
  );
});