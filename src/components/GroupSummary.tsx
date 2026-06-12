import React, { useState, useEffect } from "react";
import { Group, ResponseIndividual } from "../types";
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Clock, 
  Activity, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Award,
  CircleDot,
  CheckCircle2
} from "lucide-react";

interface GroupSummaryProps {
  activeGroup: Group;
  isLoadingRecommendation: boolean;
  recommendation: string;
  onRefreshRecommendation: () => void;
}

const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function GroupSummary({
  activeGroup,
  isLoadingRecommendation,
  recommendation,
  onRefreshRecommendation
}: GroupSummaryProps) {
  const [isResponsesExpanded, setIsResponsesExpanded] = useState(true);

  // Calculate stats in real-time
  const totalMembers = activeGroup.members.length;
  const respondedCount = activeGroup.responses.length;
  const responses = activeGroup.responses;

  // 1. Popular days ranking
  const dayCounts: Record<string, number> = {};
  DAYS_OF_WEEK.forEach(d => { dayCounts[d] = 0; });
  
  responses.forEach(r => {
    r.availableDays.forEach(day => {
      if (dayCounts[day] !== undefined) {
        dayCounts[day] += 1;
      }
    });
  });

  const sortedDays = Object.entries(dayCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const topDays = sortedDays.slice(0, 3).map(([day, count]) => ({
    day,
    count,
    percentage: respondedCount > 0 ? Math.round((count / respondedCount) * 100) : 0
  }));

  // 2. Average Budget
  const avgBudget = respondedCount > 0
    ? Math.round(responses.reduce((sum, r) => sum + r.budget, 0) / respondedCount)
    : 0;

  // 3. Preferred Time
  const timeCounts: Record<string, number> = {};
  responses.forEach(r => {
    if (r.preferredTime) {
      timeCounts[r.preferredTime] = (timeCounts[r.preferredTime] || 0) + 1;
    }
  });
  const sortedTimes = Object.entries(timeCounts).sort((a, b) => b[1] - a[1]);
  const preferredTime = sortedTimes.length > 0 ? sortedTimes[0][0] : "Cualquiera";

  // 4. Preferred Plan Type
  const planCounts: Record<string, number> = {};
  responses.forEach(r => {
    if (r.planType) {
      planCounts[r.planType] = (planCounts[r.planType] || 0) + 1;
    }
  });
  const sortedPlans = Object.entries(planCounts).sort((a, b) => b[1] - a[1]);
  const preferredPlan = sortedPlans.length > 0 ? sortedPlans[0][0] : "Cualquiera";

  return (
    <div className="space-y-6">
      
      {/* Real-time calculated stats panel */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        
        {/* Stat 1: Members/Contador */}
        <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between transition-all hover:bg-zinc-100/50">
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1 font-mono">
              <Users className="w-3 h-3 text-zinc-400" />
              Respuestas
            </p>
            <p className="text-xl font-bold text-zinc-900 font-display">
              {respondedCount} <span className="text-xs font-semibold text-zinc-400">/ {totalMembers}</span>
            </p>
          </div>
          <p className="text-[9px] text-zinc-500 font-medium mt-1">
            {respondedCount === totalMembers ? "✓ ¡Todos listos!" : "Esperando más amigos"}
          </p>
        </div>

        {/* Stat 2: Popular day */}
        <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between transition-all hover:bg-zinc-100/50">
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1 font-mono">
              <Calendar className="w-3 h-3 text-zinc-400" />
              Mejor Día
            </p>
            <p className="text-base font-bold text-zinc-900 font-display truncate" title={topDays[0]?.day || "Pendiente"}>
              {topDays[0]?.day || "Pendiente"}
            </p>
          </div>
          <p className="text-[9px] text-zinc-500 font-medium mt-1 truncate">
            {topDays[0] ? `${topDays[0].count} de ${respondedCount} votos (${topDays[0].percentage}%)` : "Sin votos aún"}
          </p>
        </div>

        {/* Stat 3: Average budget */}
        <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between transition-all hover:bg-zinc-100/50">
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1 font-mono">
              <DollarSign className="w-3 h-3 text-zinc-400" />
              Presupuesto
            </p>
            <p className="text-xl font-bold text-zinc-900 font-display">
              ${avgBudget.toLocaleString("es-AR")} <span className="text-[10px] font-semibold text-zinc-500">ARS</span>
            </p>
          </div>
          <p className="text-[9px] text-zinc-500 font-medium mt-1">
            {respondedCount > 0 ? "Presupuesto de consenso" : "No definido"}
          </p>
        </div>

        {/* Stat 4: Preferred time */}
        <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between transition-all hover:bg-zinc-100/50">
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-zinc-400" />
              Horario
            </p>
            <p className="text-base font-bold text-zinc-900 font-display truncate">
              {preferredTime}
            </p>
          </div>
          <p className="text-[9px] text-zinc-500 font-medium mt-1">
            {respondedCount > 0 && preferredTime !== "Cualquiera" ? "Horario más votado" : "Sin preferencia"}
          </p>
        </div>

        {/* Stat 5: Activity Type */}
        <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between transition-all hover:bg-zinc-100/50 col-span-2 md:col-span-1">
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1 font-mono">
              <Activity className="w-3 h-3 text-zinc-400" />
              Actividad
            </p>
            <p className="text-base font-bold text-zinc-900 font-display truncate">
              {preferredPlan}
            </p>
          </div>
          <p className="text-[9px] text-zinc-500 font-medium mt-1">
            {respondedCount > 0 && preferredPlan !== "Cualquiera" ? "Plan más repetido" : "A convenir"}
          </p>
        </div>

      </section>

      {/* AI Recommendation Card (Sparkles with premium dark aesthetics) */}
      <section className="bg-zinc-950 p-5 rounded-xl border border-zinc-900 shadow-md relative overflow-hidden group/ia transition-all duration-300">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-zinc-800 rounded-full blur-2xl opacity-20 group-hover/ia:opacity-30 transition-opacity"></div>
        
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl flex items-center justify-center text-xl relative shrink-0">
            <Sparkles className="w-5 h-5 text-zinc-300 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                Propuesta inteligente • PlanIt AI
              </h3>
              
              <button
                onClick={onRefreshRecommendation}
                disabled={isLoadingRecommendation || respondedCount === 0}
                className={`
                  p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-md transition-all flex items-center gap-1 text-[10px] font-semibold cursor-pointer
                  disabled:opacity-40 disabled:hover:bg-transparent
                `}
                title="Actualizar Recomendación"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingRecommendation ? "animate-spin text-zinc-200" : ""}`} />
                <span>Re-analizar</span>
              </button>
            </div>

            {isLoadingRecommendation ? (
              <div className="space-y-2 py-1 animate-pulse">
                <div className="h-3 bg-zinc-800 rounded-md w-11/12"></div>
                <div className="h-3 bg-zinc-800 rounded-md w-6/12"></div>
              </div>
            ) : respondedCount === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                “¡Aún no hay respuestas! Completa tus preferencias en el formulario web para que el Coordinador IA diseñe opciones óptimas con sugerencias de lugares específicos de tu zona/provincia en tiempo real.”
              </p>
            ) : (
              <p className="text-sm md:text-base font-medium text-zinc-150 leading-relaxed italic pr-4 font-sans">
                "{recommendation}"
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Expandable detailed response list */}
      <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col shadow-xs">
        <div 
          onClick={() => setIsResponsesExpanded(!isResponsesExpanded)}
          className="p-4 border-b border-zinc-150 flex justify-between items-center cursor-pointer select-none hover:bg-zinc-50/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider font-mono">
              Respuestas del Grupo ({respondedCount})
            </h4>
            <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-650 border border-zinc-200">
              {totalMembers} miembros
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Minimal circles of responders */}
            <div className="flex -space-x-1.5 mr-1">
              {responses.map((r, i) => (
                <div 
                  key={r.member + i} 
                  className="w-6 h-6 rounded-full border border-white flex items-center justify-center text-[9px] font-bold text-zinc-800 bg-zinc-100"
                  title={r.member}
                >
                  {r.member.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            
            {isResponsesExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </div>
        </div>

        {isResponsesExpanded && (
          <div className="p-3 space-y-2 max-h-[350px] overflow-y-auto animate-fadeIn bg-zinc-50/30">
            {respondedCount === 0 ? (
              <div className="text-center py-8 px-4 text-zinc-400">
                <CircleDot className="w-6 h-6 mx-auto text-zinc-300 mb-1.5" />
                <p className="text-xs font-semibold">Nadie ha enviado sus preferencias todavía.</p>
                <p className="text-[10px] text-zinc-400 mt-1">Comparte el código o sé el primero en responder.</p>
              </div>
            ) : (
              responses.map((response) => (
                <div 
                  key={response.member}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-zinc-200 shadow-3xs hover:border-zinc-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 font-bold font-display flex items-center justify-center shrink-0 border border-zinc-200">
                      {response.member.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
                        {response.member}
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-sans font-semibold uppercase tracking-wider bg-zinc-100 text-zinc-600 border border-zinc-200 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-2.5 h-2.5 text-zinc-500" />
                          Completado
                        </span>
                      </p>
                      
                      <p className="text-[10px] text-zinc-500 font-medium mt-0.5 animate-fadeIn">
                        <span className="font-bold text-zinc-600">Días:</span> {response.availableDays.join(", ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
                    {/* Time pill */}
                    {response.preferredTime && (
                      <span className="text-[9px] font-semibold bg-zinc-100 text-zinc-750 border border-zinc-200 px-2.5 py-0.5 rounded-full">
                        ☀️ {response.preferredTime}
                      </span>
                    )}

                    {/* Plan pill */}
                    {response.planType && (
                      <span className="text-[9px] font-semibold bg-zinc-100 text-zinc-750 border border-zinc-200 px-2.5 py-0.5 rounded-full">
                        🎯 {response.planType}
                      </span>
                    )}

                    {/* Budget badge */}
                    <span className="text-[9px] font-bold bg-zinc-100 text-zinc-805 border border-zinc-350 px-2.5 py-0.5 rounded-full font-mono">
                      Máx: ${response.budget.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Inactive group members suggestion */}
            {respondedCount < totalMembers && (
              <div className="pt-1.5 text-center">
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider bg-zinc-100 border border-zinc-200/50 px-2.5 py-1 rounded-full">
                  Faltan responder: {activeGroup.members.filter(m => !responses.some(r => r.member === m)).join(", ")}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  );
}
