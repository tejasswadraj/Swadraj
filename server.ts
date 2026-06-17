import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import { google } from "googleapis";
import cookieParser from "cookie-parser";

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/api/auth/callback`
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON and cookies
  app.use(express.json());
  app.use(cookieParser());

  // API endpoints FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // --- GOOGLE OAUTH FLOW ---
  app.get("/api/auth/google/url", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/userinfo.profile"],
      prompt: "consent"
    });
    res.json({ url });
  });

  app.get("/api/auth/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      // Store tokens in a secure cookie (simplified for this app)
      res.cookie("google_tokens", JSON.stringify(tokens), {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      res.redirect("/");
    } catch (error) {
      console.error("Error getting tokens:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const tokensStr = req.cookies.google_tokens;
    if (!tokensStr) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const tokens = JSON.parse(tokensStr);
    res.json({ authenticated: true, tokens });
  });

  // --- GOOGLE SHEETS PROXY ---
  app.post("/api/sheets/sync", async (req, res) => {
    const tokensStr = req.cookies.google_tokens;
    if (!tokensStr) {
      return res.status(401).json({ error: "Missing Google authentication" });
    }

    const { spreadsheetId, data } = req.body;
    const tokens = JSON.parse(tokensStr);
    oauth2Client.setCredentials(tokens);

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    try {
      // Sync logic here: create/update multiple sheets
      // For now, we'll implement a simple batch update for the sheets we need
      const sheetTitles = Object.keys(data);
      
      // 1. Ensure sheets exist (simplified check/create logic for server-side)
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const existingTitles = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
      
      const requests = sheetTitles
        .filter(title => !existingTitles.includes(title))
        .map(title => ({ addSheet: { properties: { title } } }));

      if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests }
        });
      }

      // 2. Clear and Update data for each sheet
      for (const title of sheetTitles) {
        const values = data[title];
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${title}!A1:ZZ`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${title}!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values }
        });
      }

      res.json({ success: true, message: "ERP data synchronized to Google Sheets" });
    } catch (error: any) {
      console.error("Sheets sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Server-side proxy for Gemini AI Analysis
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt, systemInstruction, model, thinking } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Missing required parameter: prompt" });
      }

      // Read API key from environment, or from fallback headers
      const clientApiKey = req.headers["x-api-key"] as string;
      const apiKey = process.env.GEMINI_API_KEY || (clientApiKey && clientApiKey !== "null" ? clientApiKey : null);

      if (!apiKey) {
        return res.status(401).json({ 
          error: "Gemini API key is not configured. Please define GEMINI_API_KEY in Settings > Secrets or provide a custom key in the AI Desk." 
        });
      }

      // Initialize GoogleGenAI SDK with modern pattern
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      // Handle specific model overrides
      let selectedModel = model || "gemini-3.5-flash";
      const configObj: any = {
        systemInstruction: systemInstruction || undefined,
      };

      // Apply thinking config if requested for Gemini 3 models
      if (thinking === "HIGH") {
        configObj.thinkingConfig = {
          thinkingLevel: ThinkingLevel.HIGH
        };
      } else if (thinking === "LOW") {
        configObj.thinkingConfig = {
          thinkingLevel: ThinkingLevel.LOW
        };
      }

      // Request text generation with dynamic fallback for rate-limit and quota errors
      let response;
      try {
        response = await ai.models.generateContent({
          model: selectedModel,
          contents: prompt,
          config: configObj
        });
      } catch (innerError: any) {
        const errorMsg = innerError?.message || "";
        const isQuotaError = 
          innerError?.status === 429 || 
          errorMsg.includes("Quota exceeded") || 
          errorMsg.includes("RESOURCE_EXHAUSTED") ||
          errorMsg.includes("quota");
        
        if (selectedModel !== "gemini-3.5-flash" && isQuotaError) {
          console.warn(`[Gemini Fallback Activated] ${selectedModel} failed with quota exhaustion. Retrying with gemini-3.5-flash...`);
          selectedModel = "gemini-3.5-flash";
          const safeConfig = { ...configObj };
          delete safeConfig.thinkingConfig;
          response = await ai.models.generateContent({
            model: selectedModel,
            contents: prompt,
            config: safeConfig
          });
        } else {
          throw innerError;
        }
      }

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("[Gemini API Server Error]:", error);
      res.status(500).json({ 
        error: error.message || "An exception occurred while generating completion content from Gemini." 
      });
    }
  });

  // Server-side proxy for Google Maps Geocoding & Places Search
  app.get("/api/maps/geocode", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        return res.status(400).json({ error: "Missing query parameter" });
      }

      const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;
      if (!apiKey) {
        return res.status(401).json({
          error: "Google Maps Platform key is not configured on the backend."
        });
      }

      // Query Google Maps Place TextSearch API or Geocoding API
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query as string)}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return res.status(400).json({ error: data.error_message || `Google API returned status: ${data.status}` });
      }

      // Convert results into standard GeocodeMatch array format expected by the app
      const results = (data.results || []).slice(0, 3).map((place: any) => ({
        displayName: place.name,
        formattedAddress: place.formatted_address || "No official address returned",
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
        rating: place.rating,
        reviews: place.user_ratings_total,
        placeId: place.place_id
      }));

      res.json({ results });
    } catch (error: any) {
      console.error("[Maps API Proxy Error]:", error);
      res.status(500).json({ error: error.message || "An exception occurred in backend map proxy." });
    }
  });

  // Vite dev or prod middleware setup
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode with static file delivery...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Swadraj Multi-Echelon Server Node Online] serving on http://localhost:${PORT}`);
  });
}

startServer();
