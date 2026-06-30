import React, { useState, useEffect } from "react";
import { User, Group, ResponseIndividual } from "./types";
import { INITIAL_GROUPS } from "./utils/mockData";
import GroupSidebar from "./components/GroupSidebar";
import AvailabilityForm from "./components/AvailabilityForm";
import GroupSummary from "./components/GroupSummary";
import { 
  Sparkles, 
  Copy, 
  Check, 
  Compass, 
  Users, 
  LogOut, 
  Menu,
  ChevronRight,
  UserPlus
} from "lucide-react";

export default function App() {
  // ---- 1. AUTHENTICATION & LOGIN STATE ----
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("planit_user");
    return stored ? JSON.parse(stored) : null;
  });

  const [loginName, setLoginName] = useState(() => localStorage.getItem("planit_remembered_name") || "");
  const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem("planit_remembered_email") || "");
  const [loginZone, setLoginZone] = useState(() => localStorage.getItem("planit_remembered_zone") || "Buenos Aires");
  const [loginPassword, setLoginPassword] = useState(""); // Demo password, any valid input accepted
  const [loginError, setLoginError] = useState("");

  // ---- 2. GROUPS & COORDINATION STATES ----
  const [groups, setGroups] = useState<Group[]>(() => {
    const stored = localStorage.getItem("planit_groups");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Exclude pre-created groups to keep state perfectly pristine
          return parsed.filter(g => g.id !== "group-viernes-cine" && g.id !== "group-picnic-montana");
        }
        return INITIAL_GROUPS;
      } catch (e) {
        return INITIAL_GROUPS;
      }
    }
    return INITIAL_GROUPS;
  });

  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => {
    const lastActive = localStorage.getItem("planit_last_active_group_id");
    if (lastActive && lastActive !== "group-viernes-cine" && lastActive !== "group-picnic-montana") return lastActive;
    return INITIAL_GROUPS[0]?.id || null;
  });

  // ---- 3. RECOMMENDATIONS STATE & RUNTIME STATES ----
  const [recommendations, setRecommendations] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem("planit_ai_recommendations");
    return stored ? JSON.parse(stored) : {};
  });
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync groups with localStorage
  useEffect(() => {
    localStorage.setItem("planit_groups", JSON.stringify(groups));
  }, [groups]);

  // Sync groups with the server on first load to retrieve other people's edits & groups
  useEffect(() => {
    const syncWithServer = async () => {
      const localGroups = localStorage.getItem("planit_groups");
      if (!localGroups) return;
      try {
        const parsed = JSON.parse(localGroups);
        if (!Array.isArray(parsed) || parsed.length === 0) return;
        const ids = parsed.map((g: Group) => g.id);
        const res = await fetch("/api/groups/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.groups && data.groups.length > 0) {
            setGroups(prev => {
              const merged = [...prev];
              data.groups.forEach((srvGroup: Group) => {
                const idx = merged.findIndex(g => g.id === srvGroup.id);
                if (idx > -1) {
                  merged[idx] = srvGroup;
                } else {
                  merged.push(srvGroup);
                }
              });
              return merged;
            });
          }
        }
      } catch (err) {
        console.error("Error syncing with server on load:", err);
      }
    };
    syncWithServer();
  }, []);

  // Sync groups of the logged in user from the server (both created groups and joined groups)
  useEffect(() => {
    if (!currentUser) return;
    const fetchUserGroups = async () => {
      try {
        const res = await fetch(`/api/groups/user/${currentUser.id}/${encodeURIComponent(currentUser.name)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.groups && Array.isArray(data.groups)) {
            setGroups(prev => {
              const merged = [...prev];
              data.groups.forEach((srvGroup: Group) => {
                const idx = merged.findIndex(g => g.id === srvGroup.id);
                if (idx > -1) {
                  merged[idx] = srvGroup;
                } else {
                  merged.push(srvGroup);
                }
              });
              return merged;
            });
            
            // Set active group to the first fetched group if currently active group is not available
            if (data.groups.length > 0) {
              setActiveGroupId(prev => {
                if (prev && data.groups.some((g: Group) => g.id === prev)) {
                  return prev;
                }
                return data.groups[0].id;
              });
            }
          }
        }
      } catch (err) {
        console.error("Error fetching user groups from server:", err);
      }
    };
    fetchUserGroups();
  }, [currentUser]);

  // Poll current active group periodically to reflect changes from other devices/accounts in real time
  useEffect(() => {
    if (!activeGroupId) return;
    
    let isMounted = true;
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/groups/${activeGroupId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.group) {
            setGroups(prev => {
              const idx = prev.findIndex(g => g.id === activeGroupId);
              if (idx > -1) {
                const prevStr = JSON.stringify(prev[idx]);
                const srvStr = JSON.stringify(data.group);
                if (prevStr !== srvStr) {
                  const updated = [...prev];
                  updated[idx] = data.group;
                  return updated;
                }
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.warn("Active group polling error:", err);
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeGroupId]);

  // Sync user with localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("planit_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("planit_user");
    }
  }, [currentUser]);

  // Track active group ID cache
  useEffect(() => {
    if (activeGroupId) {
      localStorage.setItem("planit_last_active_group_id", activeGroupId);
    } else {
      localStorage.removeItem("planit_last_active_group_id");
    }
  }, [activeGroupId]);

  // Sync AI recommendations
  useEffect(() => {
    localStorage.setItem("planit_ai_recommendations", JSON.stringify(recommendations));
  }, [recommendations]);

  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0] || null;

  // ---- Fetch AI recommendation when group data changes ----
  const fetchAIRecommendation = async (groupToCalculate: Group, forceRefresh = false) => {
    if (!groupToCalculate) return;
    const cacheKey = `${groupToCalculate.id}_${groupToCalculate.responses.length}`;
    
    // Use cache if available and not forcing a refresh
    if (!forceRefresh && recommendations[cacheKey]) {
      return;
    }

    setIsLoadingRecommendation(true);

    try {
      // Analyze current stats
      const totalCount = groupToCalculate.members.length;
      const responses = groupToCalculate.responses;
      const respondedCount = responses.length;

      // Skip API call if 0 responses
      if (respondedCount === 0) {
        setIsLoadingRecommendation(false);
        return;
      }

      // Calculate days
      const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
      const dayCounts: Record<string, number> = {};
      DAYS_OF_WEEK.forEach(d => { dayCounts[d] = 0; });
      responses.forEach(r => {
        r.availableDays.forEach(day => {
          if (dayCounts[day] !== undefined) dayCounts[day] += 1;
        });
      });
      const topDays = Object.entries(dayCounts)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([day]) => day);

      // Capped budget: average capped by the maximum of any single respondent to keep it accessible to all
      const rawAvg = Math.round(responses.reduce((sum, r) => sum + r.budget, 0) / respondedCount);
      const minMaxLimit = Math.min(...responses.map(r => r.budget));
      const avgBudget = Math.min(rawAvg, minMaxLimit);

      // Time counts
      const timeCounts: Record<string, number> = {};
      responses.forEach(r => {
        if (r.preferredTime) timeCounts[r.preferredTime] = (timeCounts[r.preferredTime] || 0) + 1;
      });
      const sortedTimes = Object.entries(timeCounts).sort((a, b) => b[1] - a[1]);
      const preferredTime = sortedTimes.length > 0 ? sortedTimes[0][0] : undefined;

      // Plan counts
      const planCounts: Record<string, number> = {};
      responses.forEach(r => {
        if (r.planType) planCounts[r.planType] = (planCounts[r.planType] || 0) + 1;
      });
      const sortedPlans = Object.entries(planCounts).sort((a, b) => b[1] - a[1]);
      const planType = sortedPlans.length > 0 ? sortedPlans[0][0] : undefined;

      // Call Express server proxy endpoint
      const response = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName: groupToCalculate.name,
          members: groupToCalculate.members,
          respondedCount,
          totalCount,
          days: topDays,
          preferredTime,
          planType,
          avgBudget,
          zone: currentUser?.zone || "Buenos Aires"
        })
      });

      if (!response.ok) throw new Error("API network response failed");
      const data = await response.json();

      if (data.recommendation) {
        setRecommendations(prev => ({
          ...prev,
          [cacheKey]: data.recommendation
        }));
      }
    } catch (e) {
      console.error("Failed to generate AI recommendation:", e);
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  // Fetch AI recommendation whenever active group or its responses change
  useEffect(() => {
    if (activeGroup && activeGroup.responses.length > 0) {
      fetchAIRecommendation(activeGroup);
    }
  }, [activeGroupId, activeGroup?.responses.length]);

  // ---- 4. HANDLERS AND FUNCTIONS ----
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginName.trim()) {
      setLoginError("Por favor, introduce tu nombre.");
      return;
    }
    if (!loginEmail.trim() || !loginEmail.includes("@")) {
      setLoginError("Introduce un dirección de correo válida.");
      return;
    }

    // Generate a stable, persistent user ID based on email so that the user is always recognized with the same ID across sessions
    const stableId = "u_" + loginEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");

    const newUser: User = {
      id: stableId,
      name: loginName.trim(),
      email: loginEmail.trim().toLowerCase(),
      zone: loginZone
    };

    // Store remembered fields for future logins
    localStorage.setItem("planit_remembered_name", loginName.trim());
    localStorage.setItem("planit_remembered_email", loginEmail.trim().toLowerCase());
    localStorage.setItem("planit_remembered_zone", loginZone);

    setCurrentUser(newUser);

    // Automatically check if user name joins existing groups of mock data as a member
    // If not, we can automatically add their name to the active group members on first login!
    // To keep it clean, let's make sure that when a user logs in, they are either creator or member.
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("planit_user");
    // Preserve groups & recommendations in localStorage so other tabs/reloads can see them
  };

  const handleCreateGroup = async (name: string) => {
    if (!currentUser) return;

    // Generate random 8-character code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newGroup: Group = {
      id: "g_" + Date.now(),
      name,
      code,
      creator: currentUser.id,
      members: [currentUser.name],
      responses: [],
      createdAt: new Date().toISOString()
    };

    setGroups(prev => [newGroup, ...prev]);
    setActiveGroupId(newGroup.id);

    try {
      await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group: newGroup })
      });
    } catch (err) {
      console.error("Error creating group on server:", err);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    setGroups(prev => {
      const filtered = prev.filter(g => g.id !== id);
      if (activeGroupId === id) {
        setActiveGroupId(filtered[0]?.id || null);
      }
      return filtered;
    });

    try {
      await fetch(`/api/groups/${id}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.error("Error deleting group from server:", err);
    }
  };

  const handleJoinByCode = async (code: string): Promise<string | null> => {
    if (!currentUser) return "Inicia sesión primero.";

    const formattedCode = code.trim().toUpperCase();
    if (formattedCode.length !== 8) return "El código debe tener exactamente 8 caracteres.";

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: formattedCode, userName: currentUser.name })
      });

      if (!res.ok) {
        const errData = await res.json();
        return errData.error || "No se encontró ningún grupo con ese código de invitación.";
      }

      const { group: joinedGroup } = await res.json();
      
      // Add or update the local groups state
      setGroups(prev => {
        const idx = prev.findIndex(g => g.id === joinedGroup.id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = joinedGroup;
          return updated;
        } else {
          return [joinedGroup, ...prev];
        }
      });
      
      setActiveGroupId(joinedGroup.id);
      return null;
    } catch (err) {
      console.error("Error joining group by code:", err);
      return "Ocurrió un error inesperado al unirse al grupo.";
    }
  };

  const handleSaveResponse = async (userResponse: ResponseIndividual) => {
    if (!currentUser || !activeGroup) return;

    const groupIndex = groups.findIndex(g => g.id === activeGroup.id);
    if (groupIndex === -1) return;

    // Optimistically update the UI locally
    let updatedMembers = [...activeGroup.members];
    if (!updatedMembers.includes(currentUser.name)) {
      updatedMembers.push(currentUser.name);
    }
    const filteredResponses = activeGroup.responses.filter(r => r.member !== currentUser.name);
    const updatedResponses = [...filteredResponses, userResponse];

    const updatedGroup: Group = {
      ...activeGroup,
      members: updatedMembers,
      responses: updatedResponses
    };

    const updatedGroups = [...groups];
    updatedGroups[groupIndex] = updatedGroup;
    setGroups(updatedGroups);

    // Persist and register response on server
    try {
      const res = await fetch(`/api/groups/${activeGroup.id}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: userResponse })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.group) {
          setGroups(prev => {
            const idx = prev.findIndex(g => g.id === data.group.id);
            if (idx > -1) {
              const updated = [...prev];
              updated[idx] = data.group;
              return updated;
            }
            return prev;
          });
          // Force re-generating AI recommendation from the server-validated group representation
          fetchAIRecommendation(data.group, true);
          return;
        }
      }
    } catch (err) {
      console.error("Error saving response to server:", err);
    }

    // Fallback trigger if server call failed
    setTimeout(() => {
      fetchAIRecommendation(updatedGroup, true);
    }, 100);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const activeUserResponse = activeGroup?.responses.find(r => r.member === currentUser?.name);
  const activeRecommendation = activeGroup 
    ? (recommendations[`${activeGroup.id}_${activeGroup.responses.length}`] || "¡Aún no hay suficientes votos! Completa tus preferencias y pídele a tus amigos que respondan para generar sugerencias.")
    : "";

  return (
    <div id="app-root-container" className="min-h-screen flex flex-col font-sans transition-all duration-300">
      
      {/* 5. GORGEOUS OFF-LINE / DEMO AUTHENTICATION PAGE */}
      {!currentUser ? (
        <main className="flex-1 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
          {/* Subtle minimal ambient shadows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-zinc-200/50 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-slate-200/50 rounded-full blur-3xl opacity-35 animate-pulse" style={{ animationDelay: "2s" }}></div>

          <div className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 bg-white border border-zinc-200 shadow-xl rounded-2xl overflow-hidden">
            
            {/* Promo illustration & features column (Left 5 cols) - Elegant Old Rose Theme Accent */}
            <div className="md:col-span-5 bg-rosaviejo-dark p-8 md:p-10 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-white/5 mix-blend-overlay"></div>
              
              <div className="relative space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white text-rosaviejo-dark rounded-lg flex items-center justify-center font-bold text-lg shadow-xs">
                    P
                  </div>
                  <h1 className="text-xl font-extrabold tracking-tight font-display">PlanIt</h1>
                </div>

                <div className="space-y-3 pt-2">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug font-display">
                    Organiza tu plan ideal con tus amigos
                  </h2>
                  <p className="text-xs text-rosaviejo-light/90 leading-relaxed font-sans">
                    Sincroniza agendas de la semana, alinea presupuestos en pesos y sugiere planes con un solo click. Simple, rápido y estético.
                  </p>
                </div>
              </div>

              {/* Static decorative mockup states to elevate aesthetic credibility */}
              <div className="mt-6 space-y-2.5 relative p-4 bg-rosaviejo/40 border border-rosaviejo-border/20 rounded-xl">
                <p className="text-[10px] font-bold tracking-widest text-rosaviejo-light uppercase">Recomendaciones Inteligentes</p>
                
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span>🚀 Coordinador IA</span>
                  <span className="text-[9px] bg-white/20 text-white font-mono px-1.5 py-0.5 rounded">Activo</span>
                </div>
                <p className="text-[11px] text-rosaviejo-light/95 italic">
                  "Sugerencia: Una noche de pizza en Güemes (Córdoba) o San Telmo (CABA) que se adapta perfectamente al bolsillo de todos."
                </p>
              </div>

              <div className="text-[10px] text-rosaviejo-light/70 pt-4 leading-normal">
                Seguro e instantáneo • Datos persistidos en <code className="font-mono bg-white/10 px-1 py-0.5 rounded text-white">localStorage</code>
              </div>
            </div>

            {/* Login form column (Right 7 cols) */}
            <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-center bg-white">
              <div className="max-w-md w-full mx-auto space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 font-display">Ingresar a PlanIt</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Crea tu avatar local para votar planes con tus grupos de amigos.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div>
                    <label htmlFor="name-input" className="block text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1 px-1">
                      Nombre o Apodo
                    </label>
                    <input
                      id="name-input"
                      type="text"
                      required
                      placeholder="Ej: María, Carlos o Sofi"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-zinc-200 rounded-lg focus:outline-hidden focus:border-zinc-900 bg-white font-medium text-zinc-800"
                      maxLength={18}
                    />
                  </div>

                  <div>
                    <label htmlFor="email-input" className="block text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1 px-1">
                      Correo Electrónico
                    </label>
                    <input
                      id="email-input"
                      type="email"
                      required
                      placeholder="Ej: nombre@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-zinc-200 rounded-lg focus:outline-hidden focus:border-zinc-900 bg-white font-medium text-zinc-800"
                    />
                  </div>

                  <div>
                    <label htmlFor="zone-select" className="block text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1 px-1">
                      Tu provincia / Zona (Argentina)
                    </label>
                    <select
                      id="zone-select"
                      required
                      value={loginZone}
                      onChange={(e) => setLoginZone(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-zinc-200 rounded-lg focus:outline-hidden focus:border-zinc-900 bg-white font-medium text-zinc-800"
                    >
                      <option value="Buenos Aires">Buenos Aires (Provincia)</option>
                      <option value="Ciudad Autónoma de Buenos Aires (CABA)">Ciudad Autónoma de Buenos Aires (CABA)</option>
                      <option value="Córdoba">Córdoba</option>
                      <option value="Santa Fe">Santa Fe</option>
                      <option value="Mendoza">Mendoza</option>
                      <option value="Salta">Salta</option>
                      <option value="Tucumán">Tucumán</option>
                      <option value="Neuquén">Neuquén</option>
                      <option value="Chubut">Chubut</option>
                      <option value="Entre Ríos">Entre Ríos</option>
                      <option value="Misiones">Misiones</option>
                      <option value="Río Negro">Río Negro</option>
                      <option value="San Luis">San Luis</option>
                      <option value="San Juan">San Juan</option>
                      <option value="Jujuy">Jujuy</option>
                      <option value="Chaco">Chaco</option>
                      <option value="Corrientes">Corrientes</option>
                      <option value="Santiago del Estero">Santiago del Estero</option>
                      <option value="La Pampa">La Pampa</option>
                      <option value="Santa Cruz">Santa Cruz</option>
                      <option value="La Rioja">La Rioja</option>
                      <option value="Catamarca">Catamarca</option>
                      <option value="Formosa">Formosa</option>
                      <option value="Tierra del Fuego">Tierra del Fuego</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1 px-1">
                      <label htmlFor="password-input" className="block text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                        Contraseña
                      </label>
                    </div>
                    <input
                      id="password-input"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-zinc-200 rounded-lg focus:outline-hidden focus:border-zinc-900 bg-white font-medium text-zinc-800"
                    />
                  </div>

                  {loginError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-500 font-semibold">
                      ⚠️ {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 mt-2 bg-zinc-900 hover:bg-zinc-800 font-display font-bold text-xs text-white tracking-wide rounded-lg shadow-xs hover:shadow-sm hover:-translate-y-px transition-all cursor-pointer"
                  >
                    Entrar a la Aplicación
                  </button>
                </form>


              </div>
            </div>

          </div>
        </main>
      ) : (
        // ---- 6. COMPLETE THE USER GRAPHICAL DASHBOARD ----
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Embedded Sidebar - Desktop visible, Mobile triggers drawer */}
          <GroupSidebar 
            groups={groups}
            activeGroupId={activeGroupId}
            onSelectGroup={setActiveGroupId}
            onCreateGroup={handleCreateGroup}
            onJoinGroup={handleJoinByCode}
            currentUser={currentUser}
            onLogout={handleLogout}
            showSidebarMobile={showSidebarMobile}
            setShowSidebarMobile={setShowSidebarMobile}
            onDeleteGroup={handleDeleteGroup}
          />

          {/* Main dashboard view container matches Geometric Balance template */}
          <main className="flex-1 p-4 md:p-8 flex flex-col gap-6 overflow-y-auto">
            
            {/* Header controls layout */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200pb-4 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                  <span>Grupo Activo</span>
                  <span className="h-px w-6 bg-zinc-350"></span>
                  {currentUser?.zone && <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-600 font-sans tracking-normal font-medium capitalize text-[9px]">Ubicación: {currentUser.zone}</span>}
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowSidebarMobile(true)}
                    className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 md:hidden cursor-pointer"
                    title="Ver Grupos"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-rosaviejo-dark font-display">
                    {activeGroup ? activeGroup.name : "Crea tu primer grupo"}
                  </h2>
                </div>
              </div>

              {activeGroup && (
                <div className="flex items-center gap-3 bg-zinc-50 px-3.5 py-2 border border-rosaviejo-border rounded-xl self-start sm:self-auto">
                  <div className="text-left shrink-0">
                    <p className="text-[9px] uppercase font-bold text-zinc-400 leading-none">Código de Invitación</p>
                    <p className="text-sm font-mono font-bold text-zinc-800 tracking-wider">
                      {activeGroup.code}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => copyToClipboard(activeGroup.code)}
                    className={`
                      p-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0
                      ${copiedCode 
                        ? "bg-emerald-600 text-zinc-50" 
                        : "bg-white hover:bg-zinc-100 border border-zinc-205 text-zinc-750"
                      }
                    `}
                    title="Copiar código de invitación"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </header>

            {activeGroup ? (
              <>
                {/* 1. Statistics grids & simulated real-time AI response block */}
                <GroupSummary 
                  activeGroup={activeGroup}
                  isLoadingRecommendation={isLoadingRecommendation}
                  recommendation={activeRecommendation}
                  onRefreshRecommendation={() => fetchAIRecommendation(activeGroup, true)}
                />

                {/* 2. Side-by-side interactive input and responses comparison panel */}
                <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Form component */}
                  <div className="xl:col-span-12">
                    <AvailabilityForm 
                      activeGroup={activeGroup}
                      currentUserMemberName={currentUser.name}
                      onSaveResponse={handleSaveResponse}
                      existingResponse={activeUserResponse}
                    />
                  </div>

                </section>
              </>
            ) : (
              // Empty initial dashboard layout state
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white/40 backdrop-blur-md rounded-3xl border border-white border-dashed">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                  <Compass className="w-8 h-8 animate-bounce" />
                </div>
                <h4 className="font-display font-bold text-lg text-indigo-950">¡Comencemos a Planificar!</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                  Para habilitar los resúmenes y recomendaciones generadas por IA, haz click en el botón <strong>"Crear Grupo"</strong> en el sidebar o ingresa un código brindado por tus amigos.
                </p>
              </div>
            )}

          </main>
        </div>
      )}



    </div>
  );
}
