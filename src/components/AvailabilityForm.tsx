import React, { useState, useEffect } from "react";
import { ResponseIndividual, Group } from "../types";
import { 
  Check, 
  X, 
  HelpCircle, 
  Sun, 
  SunMedium, 
  Moon, 
  DollarSign, 
  Sparkles,
  Clapperboard, 
  Utensils, 
  Mountain, 
  Dribbble, 
  Palette, 
  MoreHorizontal
} from "lucide-react";

interface AvailabilityFormProps {
  activeGroup: Group;
  currentUserMemberName: string;
  onSaveResponse: (response: ResponseIndividual) => void;
  existingResponse?: ResponseIndividual;
}

const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const PLAN_TYPES = [
  { id: "Cine", label: "Cine", icon: Clapperboard, color: "from-sky-100 to-sky-200 text-sky-800" },
  { id: "Comida", label: "Comida", icon: Utensils, color: "from-amber-100 to-amber-200 text-amber-800" },
  { id: "Senderismo", label: "Senderismo", icon: Mountain, color: "from-emerald-100 to-emerald-200 text-emerald-800" },
  { id: "Deporte", label: "Deporte", icon: Dribbble, color: "from-orange-100 to-orange-200 text-orange-800" },
  { id: "Arte", label: "Arte", icon: Palette, color: "from-fuchsia-100 to-fuchsia-200 text-fuchsia-800" },
  { id: "Otro", label: "Otro", icon: MoreHorizontal, color: "from-slate-100 to-slate-200 text-slate-800" }
];

const PREFERRED_TIMES = [
  { id: "Mañana", label: "Mañana", icon: Sun, desc: "Desayuno/Paseo" },
  { id: "Tarde", label: "Tarde", icon: SunMedium, desc: "Almuerzo/Tarde" },
  { id: "Noche", label: "Noche", icon: Moon, desc: "Cena/Cine/Salida" }
];

export default function AvailabilityForm({
  activeGroup,
  currentUserMemberName,
  onSaveResponse,
  existingResponse
}: AvailabilityFormProps) {
  // Day status states: map of dayName -> "yes" | "no" | "maybe"
  const [dayStatuses, setDayStatuses] = useState<Record<string, "yes" | "no" | "maybe">>(() => {
    const initial: Record<string, "yes" | "no" | "maybe"> = {};
    DAYS_OF_WEEK.forEach(day => {
      initial[day] = "maybe";
    });
    return initial;
  });

  const [preferredTime, setPreferredTime] = useState<string | undefined>(undefined);
  const [preferredPlan, setPreferredPlan] = useState<string | undefined>(undefined);
  const [customPlanText, setCustomPlanText] = useState("");
  const [budget, setBudget] = useState<number>(15000);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successAnimation, setSuccessAnimation] = useState(false);

  // Populate data if response already exists
  useEffect(() => {
    if (existingResponse) {
      const initial: Record<string, "yes" | "no" | "maybe"> = {};
      DAYS_OF_WEEK.forEach(day => {
        if (existingResponse.availableDays.includes(day)) {
          initial[day] = "yes";
        } else {
          // Find if this group was previously filled out
          initial[day] = "no";
        }
      });
      setDayStatuses(initial);
      setPreferredTime(existingResponse.preferredTime);
      
      const defaultPlanIds = ["Cine", "Comida", "Senderismo", "Deporte", "Arte"];
      if (existingResponse.planType) {
        if (defaultPlanIds.includes(existingResponse.planType)) {
          setPreferredPlan(existingResponse.planType);
          setCustomPlanText("");
        } else {
          setPreferredPlan("Otro");
          setCustomPlanText(existingResponse.planType === "Otro" ? "" : existingResponse.planType);
        }
      } else {
        setPreferredPlan(undefined);
        setCustomPlanText("");
      }

      setBudget(existingResponse.budget);
    } else {
      // Reset when switching groups or no response exists
      const initial: Record<string, "yes" | "no" | "maybe"> = {};
      DAYS_OF_WEEK.forEach(day => {
        initial[day] = "maybe";
      });
      setDayStatuses(initial);
      setPreferredTime(undefined);
      setPreferredPlan(undefined);
      setCustomPlanText("");
      setBudget(15000);
    }
    setValidationError(null);
  }, [existingResponse, activeGroup.id]);

  const handleDayStatusChange = (day: string, status: "yes" | "no" | "maybe") => {
    setDayStatuses(prev => ({
      ...prev,
      [day]: status
    }));
    setValidationError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Verification 1: Select at least one available day (✓)
    const availableDays = Object.entries(dayStatuses)
      .filter(([_, status]) => status === "yes")
      .map(([day]) => day);

    if (availableDays.length === 0) {
      setValidationError("Debes marcar al menos un día disponible (✓) para enviar tus preferencias.");
      return;
    }

    // Verification 2: Budget must be greater than 0
    if (budget <= 0) {
      setValidationError("Por favor, introduce un presupuesto estimado mayor a $0.");
      return;
    }

    // Capture custom plan if "Otro" is selected
    let finalPlanType = preferredPlan;
    if (preferredPlan === "Otro") {
      finalPlanType = customPlanText.trim() ? customPlanText.trim() : "Otro";
    }

    setValidationError(null);
    setSuccessAnimation(true);

    const updatedResponse: ResponseIndividual = {
      member: currentUserMemberName,
      availableDays,
      preferredTime,
      planType: finalPlanType,
      budget: Number(budget)
    };

    onSaveResponse(updatedResponse);

    setTimeout(() => {
      setSuccessAnimation(false);
    }, 1500);
  };

  return (
    <div id="availability-form-section" className="bg-white rounded-xl p-5 border border-zinc-200 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-base text-zinc-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zinc-500" />
            Cargar Preferencias
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {existingResponse 
              ? "Edita tus preferencias actuales. Se actualizará el resumen al guardar." 
              : "Completa para sumarte al cálculo automático de mejores opciones."
            }
          </p>
        </div>
        <span className="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-850 px-2.5 py-1 rounded-md border border-zinc-250">
          Sesión: {currentUserMemberName}
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Step 1: Weekly availability blocks */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
            1. Disponibilidad Semanal (Lunes a Domingo)
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const currentStatus = dayStatuses[day];
              
              return (
                <div 
                  key={day}
                  className={`
                    p-3 rounded-xl border flex flex-col items-center justify-between transition-all duration-200
                    ${currentStatus === "yes" 
                      ? "bg-emerald-50/40 border-emerald-300 shadow-3xs" 
                      : currentStatus === "no" 
                        ? "bg-red-50/30 border-red-200" 
                        : "bg-zinc-50 border-zinc-200"
                    }
                  `}
                >
                  <span className="font-display font-bold text-xs text-zinc-700 mb-2">
                    {day}
                  </span>

                  {/* 3 State Toggle Buttons */}
                  <div className="flex items-center bg-white border border-zinc-200 rounded-lg p-0.5 gap-0.5 w-full justify-between shadow-3xs">
                    <button
                      type="button"
                      onClick={() => handleDayStatusChange(day, "yes")}
                      className={`
                        flex-1 py-1 rounded-md flex items-center justify-center transition-all cursor-pointer
                        ${currentStatus === "yes" 
                          ? "bg-emerald-600 text-white" 
                          : "text-zinc-350 hover:text-emerald-600 hover:bg-zinc-50"
                        }
                      `}
                      title="Disponible"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleDayStatusChange(day, "no")}
                      className={`
                        flex-1 py-1 rounded-md flex items-center justify-center transition-all cursor-pointer
                        ${currentStatus === "no" 
                          ? "bg-red-600 text-white" 
                          : "text-zinc-350 hover:text-red-650 hover:bg-zinc-50"
                        }
                      `}
                      title="No disponible"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDayStatusChange(day, "maybe")}
                      className={`
                        flex-1 py-1 rounded-md flex items-center justify-center transition-all cursor-pointer
                        ${currentStatus === "maybe" 
                          ? "bg-zinc-500 text-white" 
                          : "text-zinc-300 hover:text-zinc-500 hover:bg-zinc-50"
                        }
                      `}
                      title="Sin confirmar"
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Time & Plan Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Horario preferido */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
              2. Horario Preferido <span className="text-zinc-400 font-normal">(Opcional)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PREFERRED_TIMES.map((time) => {
                const IconComponent = time.icon;
                const isSelected = preferredTime === time.id;

                return (
                  <button
                    key={time.id}
                    type="button"
                    onClick={() => setPreferredTime(preferredTime === time.id ? undefined : time.id)}
                    className={`
                      p-2.5 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer
                      ${isSelected 
                        ? "bg-zinc-100 border-zinc-900 text-zinc-950 font-bold" 
                        : "bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                      }
                    `}
                  >
                    <IconComponent className={`w-4 h-4 mb-1 ${isSelected ? "text-zinc-900" : "text-zinc-400"}`} />
                    <span className="font-bold text-xs">{time.label}</span>
                    <span className="text-[8px] text-zinc-400 font-normal mt-0.5">{time.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tipo de plan */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
              3. Tipo de Plan <span className="text-zinc-400 font-normal">(Opcional)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-3 gap-1.5">
              {PLAN_TYPES.map((plan) => {
                const IconComponent = plan.icon;
                const isSelected = preferredPlan === plan.id;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPreferredPlan(preferredPlan === plan.id ? undefined : plan.id)}
                    className={`
                      p-1.5 border rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold select-none cursor-pointer
                      ${isSelected 
                        ? "bg-zinc-950 border-zinc-950 text-white font-bold" 
                        : "bg-white border-zinc-200 text-zinc-650 hover:border-zinc-300 hover:bg-zinc-50"
                      }
                    `}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-zinc-400"}`} />
                    <span>{plan.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom input for "Otro" plan type */}
            {preferredPlan === "Otro" && (
              <div className="mt-2.5 animate-fadeIn">
                <label htmlFor="custom-plan-input" className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 font-mono">
                  ¿Cuál es el otro plan que proponés?
                </label>
                <input
                  id="custom-plan-input"
                  type="text"
                  placeholder="Escribe la actividad (ej: Asado, Paintball...)"
                  value={customPlanText}
                  onChange={(e) => setCustomPlanText(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg bg-zinc-50 focus:outline-hidden focus:border-zinc-800 focus:bg-white transition-all font-medium text-zinc-800"
                  maxLength={40}
                  required
                />
              </div>
            )}
          </div>

        </div>

        {/* Step 3: Budget Selection */}
        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-zinc-500" />
              <label htmlFor="budget-slider" className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-mono">
                4. Presupuesto Máximo Disponible
              </label>
            </div>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Indica en pesos argentinos ($ ARS) el máximo que estimas gastar para esta actividad grupal.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 sm:min-w-60">
            <input
              id="budget-slider"
              type="range"
              min="1000"
              max="100000"
              step="1000"
              value={budget}
              onChange={(e) => {
                setBudget(Number(e.target.value));
                setValidationError(null);
               }}
              className="flex-1 accent-zinc-900 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
            />
            <div className="flex items-center justify-center font-display font-extrabold text-sm text-zinc-900 bg-white border border-zinc-300 px-3 py-1 bg-zinc-50 rounded-md min-w-32">
              ${budget.toLocaleString("es-AR")}
              <span className="text-[10px] font-sans font-medium text-zinc-500 ml-1">ARS</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Feedbacks */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-1">
          {validationError && (
            <div className="text-xs text-red-650 font-bold px-3 py-2 bg-red-50 border border-red-150 rounded-lg mr-auto w-full sm:w-auto">
              ⚠️ {validationError}
            </div>
          )}

          <button
            type="submit"
            className={`
              w-full sm:w-auto px-5 py-2 rounded-lg font-display font-semibold text-xs tracking-wide shadow-xs flex items-center justify-center gap-2 cursor-pointer
              ${successAnimation 
                ? "bg-emerald-600 text-white" 
                : "bg-zinc-900 hover:bg-zinc-800 text-white transition-all hover:shadow-xs hover:-translate-y-px"
              }
            `}
          >
            {successAnimation ? (
              <>
                <Check className="w-4 h-4 animate-bounce" />
                ¡Preferencias Guardadas!
              </>
            ) : (
              <>
                <span>Guardar Preferencias</span>
                <Sparkles className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
