import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Persistent file-based store for group coordination data
const DB_FILE = path.join(process.cwd(), "groups-db.json");

function readGroupsDb(): any[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading groups db:", error);
  }
  return [];
}

function writeGroupsDb(groups: any[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(groups, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing groups db:", error);
  }
}

// Lazy initialization of the Gemini Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

app.use(express.json());

// --- COOPERATIVE GROUPS API ROUTES ---

// Sync local stored groups array with server
app.post("/api/groups/sync", (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "IDs must be an array" });
    }
    const db = readGroupsDb();
    const matchedGroups = db.filter(g => ids.includes(g.id));
    res.json({ groups: matchedGroups });
  } catch (error) {
    console.error("Error syncing groups:", error);
    res.status(500).json({ error: "Error al sincronizar grupos." });
  }
});

// Create/Upload a new group to the server
app.post("/api/groups", (req, res) => {
  try {
    const { group } = req.body;
    if (!group || !group.id || !group.code) {
      return res.status(400).json({ error: "Datos del grupo inválidos." });
    }
    const db = readGroupsDb();
    const existingIndex = db.findIndex(g => g.id === group.id);
    if (existingIndex > -1) {
      db[existingIndex] = group;
    } else {
      db.push(group);
    }
    writeGroupsDb(db);
    res.json({ success: true, group });
  } catch (error) {
    console.error("Error saving group on server:", error);
    res.status(500).json({ error: "Error al guardar el grupo en el servidor." });
  }
});

// Fetch active group status
app.get("/api/groups/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = readGroupsDb();
    const group = db.find(g => g.id === id);
    if (!group) {
      return res.status(404).json({ error: "Grupo no encontrado." });
    }
    res.json({ group });
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({ error: "Error al obtener detalles del grupo." });
  }
});

// Fetch all groups for a user by creator userId or member userName
app.get("/api/groups/user/:userId/:userName", (req, res) => {
  try {
    const { userId, userName } = req.params;
    const db = readGroupsDb();
    const userGroups = db.filter(g => g.creator === userId || g.members.includes(userName));
    res.json({ groups: userGroups });
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ error: "Error al obtener los grupos del usuario." });
  }
});

// User verification / registration endpoint
const USERS_FILE = path.join(process.cwd(), "users-db.json");

function readUsersDb(): any[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading users db:", error);
  }
  return [];
}

function writeUsersDb(users: any[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing users db:", error);
  }
}

app.post("/api/users/login", (req, res) => {
  try {
    const { email, name, password, zone } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: "Faltan datos de inicio de sesión." });
    }

    const formattedEmail = email.trim().toLowerCase();
    const formattedName = name.trim();
    const formattedPassword = password.trim();

    const users = readUsersDb();
    const existingUser = users.find(u => u.email === formattedEmail);

    if (existingUser) {
      // Check if name and password match
      if (existingUser.password !== formattedPassword) {
        return res.status(401).json({ error: "La contraseña es incorrecta para este correo." });
      }
      if (existingUser.name !== formattedName) {
        return res.status(401).json({ error: `El nombre "${formattedName}" no coincide con el nombre registrado para este correo.` });
      }
      return res.json({ success: true, user: existingUser });
    } else {
      // Create user
      const stableId = "u_" + formattedEmail.replace(/[^a-z0-9]/g, "_");
      const newUser = {
        id: stableId,
        name: formattedName,
        email: formattedEmail,
        password: formattedPassword,
        zone: zone || "Buenos Aires"
      };
      users.push(newUser);
      writeUsersDb(users);
      return res.json({ success: true, user: newUser });
    }
  } catch (error) {
    console.error("Error in user login API:", error);
    res.status(500).json({ error: "Error en el servidor al procesar la cuenta." });
  }
});

// Join group using 8-char code across different accounts/sessions
app.post("/api/groups/join", (req, res) => {
  try {
    const { code, userName } = req.body;
    if (!code || !userName) {
      return res.status(400).json({ error: "Falta el código de invitación o el nombre de usuario." });
    }
    const formattedCode = code.trim().toUpperCase();
    const db = readGroupsDb();
    const groupIndex = db.findIndex(g => g.code === formattedCode);
    if (groupIndex === -1) {
      return res.status(404).json({ error: "No se encontró ningún grupo con ese código de invitación en la base de datos." });
    }

    const group = db[groupIndex];
    if (!group.members.includes(userName)) {
      group.members.push(userName);
    }

    db[groupIndex] = group;
    writeGroupsDb(db);
    res.json({ success: true, group });
  } catch (error) {
    console.error("Error joining group:", error);
    res.status(500).json({ error: "Error de servidor al unirse al grupo." });
  }
});

// Submit/Update dynamic individual response on a shared group
app.post("/api/groups/:id/response", (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    if (!response || !response.member) {
      return res.status(400).json({ error: "Preferencia inválida." });
    }
    const db = readGroupsDb();
    const groupIndex = db.findIndex(g => g.id === id);
    if (groupIndex === -1) {
      return res.status(404).json({ error: "Grupo no encontrado." });
    }

    const group = db[groupIndex];
    const respIndex = group.responses.findIndex((r: any) => r.member === response.member);
    if (respIndex > -1) {
      group.responses[respIndex] = response;
    } else {
      group.responses.push(response);
    }

    if (!group.members.includes(response.member)) {
      group.members.push(response.member);
    }

    db[groupIndex] = group;
    writeGroupsDb(db);
    res.json({ success: true, group });
  } catch (error) {
    console.error("Error adding group preference response:", error);
    res.status(500).json({ error: "Error al enviar la respuesta." });
  }
});

// Delete group from database
app.delete("/api/groups/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = readGroupsDb();
    const filteredDb = db.filter(g => g.id !== id);
    writeGroupsDb(filteredDb);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting group from server:", error);
    res.status(500).json({ error: "Error al procesar eliminación del grupo." });
  }
});

// API route first
app.post("/api/recommendation", async (req, res) => {
  try {
    const { groupName, members, respondedCount, totalCount, days, preferredTime, planType, avgBudget, zone } = req.body;

    const formattedBudget = avgBudget ? Number(avgBudget).toLocaleString("es-AR") : "0";
    const zoneInfo = zone ? `La zona de los participantes es: "${zone}".` : "No se especificó zona.";

    const prompt = `Basándote en esta información del grupo "${groupName}", genera una recomendación súper personalizada, contextualizada e inteligente para armar un plan:

Miembros: ${members ? members.join(", ") : "Sin miembros aún"}
Respuestas: ${respondedCount}/${totalCount}
Días más populares: ${days ? days.join(", ") : "Ninguno"}
Horario preferido: ${preferredTime || "Cualquier horario"}
Tipo de plan seleccionado: ${planType || "Cualquier actividad"}
Presupuesto promedio: $${formattedBudget} ARS
${zoneInfo}

INSTRUCCIONES CLAVES DE CONTEXTO (MUY IMPORTANTE):
Dependiendo del "Tipo de plan seleccionado" (${planType}), debes proponer ideas sumamente específicas y relacionadas:
- DEPORTE: ¡No te quedes solo en la palabra "deporte"! Sugiere actividades físicas grupales concretas y divertidas según la provincia/zona (por ejemplo: reservar una cancha de pádel de 4, armar un partido de fútbol 5 mixto, salir todos juntos a correr, dar una vuelta equipados en bici, o hacer una clase de funcional / entrenamiento al aire libre). Nombra complejos de canchas populares o parques específicos en ${zone || "la zona local"} (por ej., en Palermo/Buenos Aires canchas de El Templo o Lagos de Palermo; en Córdoba complejos en Barrio Jardín, Güemes o el Parque del Chateau; en Mendoza el Parque General San Martín, etc.).
- COMIDA: Propón una temática culinaria específica y tentadora adaptada al presupuesto promedio de $${formattedBudget} ARS (por ejemplo: tarde de hamburguesas caseras completas, merienda con café de especialidad y porción de torta, unas pintas y papas con cheddar en una cervecería artesanal de moda, o una pizza gigante al molde para compartir). Nombra barrios o patios gastronómicos populares (por ej., Nueva Córdoba o Güemes en Córdoba; Palermo Soho, San Telmo o Belgrano en Buenos Aires; Arístides en Mendoza; Pichincha en Rosario, etc.).
- CINE: Sugiere un estreno reciente o un género divertido e inmersivo para ir a ver en patota (como ciencia ficción, terror o acción) y asócialo con cines específicos del lugar (como salas de Cinépolis, Hoyts, Showcase o espacios culturales divinos tipo Gaumont, Lugones, etc.).
- SENDERISMO: Propón un sendero de trekking, reserva ecológica, cerro, sierra o parque natural hermoso donde respirar aire puro. Agrega notas de preparación como llevar calzado cómodo, protector solar, abundante agua y preparar un termo con mate y facturas para el final. (Por ej., la Reserva Ecológica Costanera Sur o Bosques de Palermo en Buenos Aires; Quebrada del Condorito, Cerros en Carlos Paz o Villa Allende en Córdoba; Cerro Arco, Chacras de Coria o senderos amplios del Parque en Mendoza, etc.).
- ARTE: Sugiere visitar una exhibición de arte interactiva, anotarse en un workshop grupal de pintura/cerámica express, ir a ver una obra de microteatro / teatro independiente, o divertirse con un show de stand-up local. Menciona centros culturales conocidos de la zona.
- OTRO / CUALQUIERA: Sugiere ideas entretenidas como participar de una sala de escape (Escape Room), ir a los bolos (bowling), divertirse en un café de juegos de mesa modernos (boardgames), o armar un picnic de tarde en la plaza principal con cartas y frisbee.

REGLAS DE FORMATO:
- La recomendación debe ser directa, súper compinche, entusiasta, amigable y sumamente fluida. No uses saludos genéricos tipo "¡Hola grupo!", "Estimados miembros" ni preámbulos tipo "Aquí tienen la mejor recomendación...". Ve directo al meollo de la idea.
- El texto debe ser de entre 1 y 3 oraciones ricas, muy descriptivas, que enamoren e inspiren al grupo a confirmar la salida hoy mismo.`;

    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            temperature: 0.85,
            systemInstruction: "Eres el coordinador ultra apasionado de PlanIt. Tu función es dar una sugerencia de plan súper detallada, específica y personalizada (máximo 1 a 3 oraciones), con planes profundamente acoplados con la actividad elegida por el usuario (ej. si es deporte sugerir pádel/fútbol, si es senderismo sugerir mate y trekking) e incluyendo nombres reales de barrios, parques o complejos de la zona de los participantes, de forma entusiasta y directa."
          }
        });

        const recommendationText = (response.text || "").trim();
        if (recommendationText) {
          return res.json({ recommendation: recommendationText, isFallback: false });
        }
      } catch (geminiError: any) {
        console.error("Gemini API Error, using intelligent fallback:", geminiError);
      }
    }

    // Heuristic Fallback generator if API key is missing or failed
    const finalTime = preferredTime && preferredTime !== "Cualquiera" ? `por la ${preferredTime.toLowerCase()}` : "en el momento que prefieran";
    const finalDay = days && days.length > 0 ? days[0] : "este fin de semana";
    const normalizedZone = (zone || "").toLowerCase();

    // Custom activities based on planType
    let dynamicActivityText = "";
    if (planType === "Deporte") {
      dynamicActivityText = "alquilar una cancha de pádel doble, armar un partido de fútbol 5 mixto bien picante o salir a trotar en grupo";
    } else if (planType === "Cine") {
      dynamicActivityText = "ir a ver una película pochoclera de terror o ciencia ficción en una pantalla gigante";
    } else if (planType === "Comida") {
      dynamicActivityText = "compartir unas hamburguesas artesanales completas con papas fritas y pintas heladas o merendar en un café de especialidad";
    } else if (planType === "Senderismo") {
      dynamicActivityText = "disfrutar de una caminata de exploración por senderos naturales equipados con termo, mate y zapatillas cómodas";
    } else if (planType === "Arte") {
      dynamicActivityText = "conocer una muestra de arte independiente, ver una obra de microteatro o divertirse en un show de stand-up local";
    } else {
      dynamicActivityText = "resolver desafíos en una sala de escape o armar una tarde lúdica de juegos de mesa y cartas";
    }

    let spot = "un rincón genial y cómodo";

    if (normalizedZone.includes("caba") || normalizedZone.includes("ciudad autónoma") || normalizedZone.includes("buenos aires")) {
      if (planType === "Deporte") {
        spot = "las canchas de fútbol de Costanera o saliendo a correr rodeando el Rosedal de Palermo";
      } else if (planType === "Cine") {
        spot = "el complejo de cines del Abasto Shopping o el histórico Cine Gaumont en Congreso";
      } else if (planType === "Comida") {
        spot = "las espectaculares hamburgueserías de Palermo Soho o las pizzerías tradicionales de San Telmo";
      } else if (planType === "Senderismo") {
        spot = "los senderos de la Reserva Ecológica de Costanera Sur (¡no olviden llevar repelente!)";
      } else if (planType === "Arte") {
        spot = "el Centro Cultural Konex o una función de Stand-Up sobre la calle Corrientes";
      } else {
        spot = "un café temático de juegos en Villa Crespo o las emblemáticas pistas del Bowling Lavalle o Salguero";
      }
    } else if (normalizedZone.includes("córdoba") || normalizedZone.includes("cordoba")) {
      if (planType === "Deporte") {
        spot = "complejos deportivos por Nueva Córdoba o saliendo a rodar en bici por la Costanera del Suquía";
      } else if (planType === "Cine") {
        spot = "las modernas salas de Showcase en Villa Cabrera o los cines de Nuevocentro Shopping";
      } else if (planType === "Comida") {
        spot = "los increíbles locales cerveceros independientes y pizzerías de Barrio Güemes o la Tejeda";
      } else if (planType === "Senderismo") {
        spot = "los frondosos senderos del Parque del Chateau o haciendo una escapada al cerro de Villa Carlos Paz";
      } else if (planType === "Arte") {
        spot = "las funciones íntimas de Microteatro Córdoba o las muestras del pintoresco Centro Cultural España Córdoba";
      } else {
        spot = "un picnic grupal ultra relajado con frisbee y cartas en el predio del Parque del Chateau";
      }
    } else if (normalizedZone.includes("santa fe") || normalizedZone.includes("rosario")) {
      if (planType === "Deporte") {
        spot = "los complejos deportivos del Puerto de Santa Fe o saliendo a trotar frente al río en la Costanera de Rosario";
      } else if (planType === "Cine") {
        spot = "el cine del shopping La Ribera en el puerto de Santa Fe o el Showcase Alto Rosario";
      } else if (planType === "Comida") {
        spot = "las veredas cerveceras de Barrio Pichincha en Rosario o los pubs de Boulevard Gálvez en Santa Fe";
      } else if (planType === "Senderismo") {
        spot = "el Parque de la España o animándose a una tarde de kayak grupal por los riachos del Paraná";
      } else if (planType === "Arte") {
        spot = "el Centro de Expresiones Contemporáneas (CEC) frente al Monumento o la Plataforma Lavardén";
      } else {
        spot = "una tarde campestre de picnic con cartas y facturas en el inmenso Parque de la Independencia de Rosario";
      }
    } else if (normalizedZone.includes("mendoza")) {
      if (planType === "Deporte") {
        spot = "los playones deportivos del Parque General San Martín o alquilando cancha en complejos de Godoy Cruz";
      } else if (planType === "Cine") {
        spot = "las pantallas gigantes de Cinépolis en el Mendoza Plaza Shopping o Palmares";
      } else if (planType === "Comida") {
        spot = "los espectaculares restaurantes e ingeniosas hamburgueserías de la movida Avenida Arístides Villanueva";
      } else if (planType === "Senderismo") {
        spot = "el estimulante trekking al Cerro Arco, senderos de Chacras de Coria o camino a Potrerillos";
      } else if (planType === "Arte") {
        spot = "el majestuoso Teatro Independencia o el moderno Espacio Cultural Julio Le Parc";
      } else {
        spot = "una tremenda tarde de mates y risas frente al Lago Mayor del Parque General San Martín";
      }
    } else if (normalizedZone.includes("salta")) {
      if (planType === "Comida") {
        spot = "las pintorescas veredas del Paseo Güemes o compartiendo empanadas caseras en la Balcarce";
      } else if (planType === "Senderismo") {
        spot = "subir grupamente el Cerro San Bernardo coronando la escalinata de piedra con unos mates";
      } else {
        spot = "un acogedor café de especialidad en el centro histórico de la ciudad";
      }
    } else if (normalizedZone.includes("tucumán") || normalizedZone.includes("tucuman")) {
      if (planType === "Comida") {
        spot = "los imperdibles bodegones y sangucherías de milanesa en Yerba Buena o Barrio Norte";
      } else if (planType === "Senderismo") {
        spot = "una reconfortante caminata por las yungas de la Reserva de Horco Molle para terminar merendando";
      } else {
        spot = "los frescos jardines y locales de la peatonal de Yerba Buena";
      }
    } else if (normalizedZone.includes("neuquén") || normalizedZone.includes("neuquen")) {
      if (planType === "Deporte" || planType === "Senderismo") {
        spot = "el imponente Paseo de la Costa bordeando el río Limay o recorriendo los senderos de Parque Norte";
      } else if (planType === "Comida") {
        spot = "los locales cerveceros y pizzerías de masa madre del microcentro neuquino o frente a la costa";
      } else {
        spot = "una tarde relajada tomando mate frente al río en el Paseo de la Costa";
      }
    } else {
      // General fallbacks
      if (planType === "Deporte") {
        spot = "un gran complejo deportivo o polideportivo cercano o el pulmón verde municipal más lindo";
      } else if (planType === "Cine") {
        spot = "el cine del shopping más icónico del centro o armando un minicine casero con proyector";
      } else if (planType === "Comida") {
        spot = "un bodegón tradicional con porciones gigantes o pizzerías con mesitas al aire libre";
      } else if (planType === "Senderismo") {
        spot = "un sendero ecológico local, camping o parquizado natural para caminar largo y tendido";
      } else if (planType === "Arte") {
        spot = "el teatro cooperativo local, casa de la cultura o anfiteatro de la plaza principal";
      } else {
        spot = "la plaza principal de la localidad con mantas de picnic, cartas, budín y buena música";
      }
    }

    const fallbackRecommendation = `¡Tengo un planazo ideal! Los incentivo a organizar ${dynamicActivityText} ${finalTime} el ${finalDay} reuniéndose en ${spot}. Con el presupuesto promedio de $${formattedBudget} ARS coordinado, la van a pasar de diez y se adapta perfecto para todos.`;

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
