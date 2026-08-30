import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

async function generateContentWithFallback(params: any) {
  let lastError: any;
  for (const model of FALLBACK_MODELS) {
    try {
      return await ai.models.generateContent({
        ...params,
        model,
      });
    } catch (error: any) {
      console.log(`[Model Fallback] ${model} temporarily unavailable, attempting next model in ladder...`);
      lastError = error;
      
      const status = error?.status || error?.response?.status || (error?.error && error?.error?.code);
      const recoverableCodes = [503, 429, 404, 500];
      const isRecoverableCode = recoverableCodes.includes(status);

      const errorMsg = (error.message || "").toUpperCase();
      const isRecoverableText = errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("500") || errorMsg.includes("404");

      if (!isRecoverableCode && !isRecoverableText) {
        throw error;
      }
    }
  }
  
  // Format quota errors for better UX
  if (lastError && lastError.message && lastError.message.includes("quota")) {
    throw new Error("API Quota Exceeded: The provided Gemini API key has reached its rate limit or billing cap. Please check your Google Cloud Console or try again later.");
  }
  throw lastError;

}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, systemInstruction } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required" });
      }

      // Format messages for SDK
      const contents = messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      const response = await generateContentWithFallback({
        contents,
        config: {
          systemInstruction: systemInstruction || "You are an experienced SRE/sysadmin diagnostic AI. Provide highly concise, accurate, and professional responses. Never guess or hallucinate configurations, logs, or system commands. Stick strictly to facts and proven diagnostic procedures. Use precise Markdown formatting for any logs, JSON, and CLI commands.",
          temperature: 0.2,
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Route for Summarization and Tagging
  app.post("/api/summarize", async (req, res) => {
    try {
      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required" });
      }

      const prompt = `Review the following diagnostic conversation and provide a JSON response with the exact following keys:
1. "summary": A concise paragraph summarizing the issue, diagnostic steps, and root cause.
2. "tags": An array of 1 to 4 lowercase string keywords categorizing the issue.
3. "severity": A string of exactly one of: "low", "medium", "high", or "critical".
   CRITICAL CLASSIFICATION RULES:
   - "critical": Complete service outage, data loss, massive security breach, or ANY severe OS/Hardware failures such as BSOD (Blue Screen of Death, e.g., INACCESSIBLE_BOOT_DEVICE) or Kernel Panics. If you see BSOD, it MUST be critical.
   - "high": Significant service degradation, multiple users affected.
   - "medium": Minor feature degradation, non-critical localized system errors.
   - "low": Routine requests, password resets, or account lockouts.
   YOU MUST strictly adhere to these severity definitions. BSOD = critical.
4. "resolutionSuccess": A boolean indicating if the issue was resolved.

Conversation:
${messages.map((m: any) => `${m.role}: ${m.text}`).join("\\n\\n")}`;

      const response = await generateContentWithFallback({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch (error: any) {
      console.error("Summarize Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Route for Title Generation
  app.post("/api/generate-title", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "text is required" });
      }

      const prompt = `Generate a very short, concise, and professional title (maximum 5 words) for a diagnostic case based on this initial message:\n\n${text}\n\nTitle only, no quotes, no extra formatting.`;

      const response = await generateContentWithFallback({
        contents: prompt,
        config: {
          temperature: 0.3,
        }
      });
      
      res.json({ title: (response.text || "").trim() });
    } catch (error: any) {
      console.error("Title Generation Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
