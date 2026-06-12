import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Lazy initialization of the Gemini Client
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("⚠️ Warning: GEMINI_API_KEY environment variable is not set. AI recommendations will use standard heuristic fallback.");
}

app.use(express.json());

// API route first
app.post("/api/recommendation", async (req, res) => {
  try {
    const { groupName, members, respondedCount, totalCount, days, preferredTime, planType, avgBudget, zone } = req.body;

    const formattedBudget = avgBudget ? Number(avgBudget).toLocaleString("es-AR") : "0";
    const zoneInfo = zone ? `La zona de los participantes es: "${zone}".` : "No se especificó zona.";

    const prompt = `Basándote en esta información del grupo "${groupName}", genera una recomendación súper breve, concisa y ultra directa para un plan:

Miembros: ${members ? members.join(", ") : "Sin miembros aún"}
Respuestas: ${respondedCount}/${totalCount}
Días más populares: ${days ? days.join(", ") : "Ninguno"}
Horario preferido: ${preferredTime || "Cualquier horario"}
Tipo de plan: ${planType || "Cualquier actividad"}
Presupuesto promedio: $${formattedBudget} ARS
${zoneInfo}

INSTRUCCIÓN CLAVE: Propón o asocia el plan con un lugar o zona real o sumamente característico en "${zone || "la zona local"}" donde se pueda hacer ese tipo de plan (por ejemplo, si el plan es "Cine" en Buenos Aires sugiri un complejo en Palermo o Abasto; si es "Comida" en Buenos Aires sugiri un café/resto lindo o un patio gastronómico; si es en Mendoza sugiri Arístides, Potrerillos o Chacras; si es en Córdoba sugiri Güemes, Carlos Paz o un cerro, etc., según corresponda).

Genera una sugerencia de plan sumamente corta, directa y concreta (máximo 1 o 2 oraciones breves). No incluyas preámbulos, saludos ni rodeos. Ve al grano de forma amigable y entusiasta.`;

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            temperature: 0.82,
            systemInstruction: "Eres el coordinador ultra amigable de PlanIt. Tu función es dar una sugerencia de plan directa, súper breve y atractiva (máximo 1 o 2 oraciones), incluyendo un lugar real o característico de la zona/provincia provista por el usuario para llevar a cabo la actividad, sin preámbulos, introducciones o rodeos."
          }
        });

        const recommendationText = (response.text || "").trim() || "¡Aún no hay suficientes datos! Completa tus preferencias de presupuesto y días para recibir la sugerencia de plan.";
        return res.json({ recommendation: recommendationText, isFallback: false });
      } catch (geminiError: any) {
        console.error("Gemini API Error:", geminiError);
        // Fallback response inside block
      }
    }

    // Heuristic Fallback generator if API key is missing or failed
    const finalPlan = planType || "una salida especial";
    const finalTime = preferredTime ? `por la ${preferredTime.toLowerCase()}` : "en el momento que prefieran";
    const finalDay = days && days.length > 0 ? days[0] : "este fin de semana";
    const fallbackLocation = zone ? ` un lugar lindo en ${zone}` : " un punto de encuentro común";
    
    const fallbackRecommendation = `¡Listo! Sugiero ${finalPlan} ${finalTime} el ${finalDay} visitando${fallbackLocation}. Con un presupuesto de $${formattedBudget} ARS promedio, ¡la van a pasar genial!`;

    res.json({ recommendation: fallbackRecommendation, isFallback: true });

  } catch (error: any) {
    console.error("Server Recommendation API Error:", error);
    res.status(500).json({ error: "Error interno al generar recomendación." });
  }
});

// Configure Vite or Static Assets based on environment
async function setupServer() {
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
    console.log(`🚀 PlanIt server running at http://localhost:${PORT}`);
  });
}

setupServer();
