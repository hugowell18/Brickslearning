import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();
const ALLOWED_MODELS = new Set([
  "Qwen/Qwen3.5-27B",
  "deepseek-ai/DeepSeek-V3.2",
  "MiniMax/MiniMax-M2.5",
]);

function pickTextFromUnknown(value: any): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    const joined = value
      .map((v) => {
        if (typeof v === "string") return v;
        if (v && typeof v === "object") {
          return String(v.text || v.content || v.value || "");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
    return joined;
  }
  if (value && typeof value === "object") {
    return String(value.text || value.content || value.value || "").trim();
  }
  return "";
}

function extractAssistantAnswer(data: any): string {
  // OpenAI-compatible standard
  const c0 = data?.choices?.[0];
  const m = c0?.message;
  const candidates = [
    m?.content,
    m?.reasoning_content,
    c0?.text,
    c0?.delta?.content,
    data?.output_text,
    data?.output?.text,
    data?.text,
  ];
  for (const c of candidates) {
    const t = pickTextFromUnknown(c);
    if (t) return t;
  }
  return "";
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Explicit preflight handler to ensure CORS headers are always returned.
app.options("/*", (c) => c.body(null, 204));

// Health check endpoint
app.get("/make-server-9b296f01/health", (c) => {
  return c.json({ status: "ok" });
});

const handleAiChat = async (c: any) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const message = String(body?.message || "").trim();
    const history = Array.isArray(body?.history) ? body.history : [];
    const requestedModel = String(body?.model || "").trim();

    if (!message) {
      return c.json({ error: "message is required" }, 400);
    }

    const provider = (Deno.env.get("AI_PROVIDER") || "modelscope").toLowerCase();

    const providerConfig = (() => {
      if (provider === "deepseek") {
        return {
          provider: "deepseek",
          apiKey: Deno.env.get("DEEPSEEK_API_KEY"),
          baseUrl: Deno.env.get("DEEPSEEK_BASE_URL") || "https://api.deepseek.com/v1",
          model: Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat",
        };
      }
      // default: modelscope (OpenAI-compatible API-Inference)
      return {
        provider: "modelscope",
        apiKey: Deno.env.get("MODELSCOPE_API_KEY"),
        baseUrl: Deno.env.get("MODELSCOPE_BASE_URL") || "https://api-inference.modelscope.cn/v1",
        model: Deno.env.get("MODELSCOPE_MODEL") || "Qwen/Qwen2.5-7B-Instruct",
      };
    })();

    if (!providerConfig.apiKey) {
      return c.json(
        {
          error: `${providerConfig.provider.toUpperCase()}_API_KEY is not configured`,
        },
        500,
      );
    }

    const sanitizedHistory = history
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-10)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

    const messages = [
      {
        role: "system",
        content:
          "You are a concise Databricks learning assistant. Answer clearly, do not fabricate facts, and say you are not sure when uncertain.",
      },
      ...sanitizedHistory,
      { role: "user", content: message.slice(0, 4000) },
    ];

    const finalModel = requestedModel
      ? (ALLOWED_MODELS.has(requestedModel) ? requestedModel : "")
      : providerConfig.model;
    if (!finalModel) {
      return c.json(
        {
          error: "invalid_model",
          detail: "Unsupported model",
          allowed: Array.from(ALLOWED_MODELS),
        },
        400,
      );
    }

    const resp = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${providerConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: finalModel,
        messages,
        temperature: 0.6,
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return c.json(
        {
          error: "provider_error",
          status: resp.status,
          detail: data?.error?.message || data?.message || "request failed",
          provider: providerConfig.provider,
          model: finalModel,
        },
        502,
      );
    }

    const answer = extractAssistantAnswer(data);
    if (!answer) {
      return c.json(
        {
          error: "empty_model_response",
          detail: "Provider returned no parseable answer content",
          provider: providerConfig.provider,
          model: finalModel,
          raw_keys: Object.keys(data || {}),
        },
        502,
      );
    }
    return c.json({ answer, usage: data?.usage || null });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
};

// compatibility routes:
// 1) /functions/v1/server            -> "/"
// 2) /functions/v1/server/ai/chat    -> "/ai/chat"
// 3) legacy internal path
app.post("/", handleAiChat);
app.post("/ai/chat", handleAiChat);
app.post("/make-server-9b296f01/ai/chat", handleAiChat);

Deno.serve(app.fetch);
