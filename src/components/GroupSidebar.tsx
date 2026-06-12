import React, { useState } from "react";
import { Group, User } from "../types";
import { 
  Plus, 
  Users, 
  Copy, 
  Check, 
  LogOut, 
  Compass, 
  Hash,
  ChevronRight,
  Menu,
  X
} from "lucide-react";

interface GroupSidebarProps {
  groups: Group[];
  activeGroupId: string | null;
  onSelectGroup: (id: string) => void;
  onCreateGroup: (name: string) => void;
  onJoinGroup: (code: string) => string | null; // returns error message or null if successful
  currentUser: User;
  onLogout: () => void;
  showSidebarMobile: boolean;
  setShowSidebarMobile: (show: boolean) => void;
}

export default function GroupSidebar({
  groups,
  activeGroupId,
  onSelectGroup,
  onCreateGroup,
  onJoinGroup,
  currentUser,
  onLogout,
  showSidebarMobile,
  setShowSidebarMobile
}: GroupSidebarProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    onCreateGroup(newGroupName.trim());
    setNewGroupName("");
    setIsCreating(false);
    setErrorText(null);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const error = onJoinGroup(joinCode.trim().toUpperCase());
    if (error) {
      setErrorText(error);
      setSuccessText(null);
    } else {
      setSuccessText("¡Te has unido con éxito!");
      setErrorText(null);
      setJoinCode("");
      setTimeout(() => setSuccessText(null), 3000);
      setIsJoining(false);
    }
  };

  const copyToClipboard = (code: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting group when copying
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  return (
    <>
      {/* Mobile Sidebar overlay */}
      {showSidebarMobile && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setShowSidebarMobile(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 w-80 bg-white border-r border-slate-100 flex flex-col z-50 transform transition-transform duration-350 ease-out
        md:translate-x-0 md:static md:flex-shrink-0
        ${showSidebarMobile ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Header Branding */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-100 shadow-xs">
              <Compass className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-lg tracking-tight text-zinc-900">
                PlanIt
              </h1>
              <span className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase">
                Amigos & Actividades
              </span>
            </div>
          </div>

          <button 
            onClick={() => setShowSidebarMobile(false)}
            className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 max-w-[80%] min-w-0">
              <div className="w-8 h-8 rounded-full bg-zinc-200 text-zinc-800 font-bold font-display flex items-center justify-center shrink-0 border border-zinc-250">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-850 truncate" title={currentUser.name}>
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-zinc-500 truncate" title={`${currentUser.email} (${currentUser.zone || "Sin zona"})`}>
                  {currentUser.zone ? `${currentUser.zone}` : currentUser.email}
                </p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="p-1.5 text-zinc-400 hover:text-red-650 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selection/Actions */}
        <div className="p-3 flex gap-2 border-b border-zinc-100 shrink-0">
          <button
            onClick={() => {
              setIsCreating(true);
              setIsJoining(false);
              setErrorText(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg font-bold text-[11px] border cursor-pointer ${
              isCreating 
                ? "bg-zinc-100 text-zinc-900 border-zinc-400 font-semibold" 
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Crear Grupo
          </button>
          <button
            onClick={() => {
              setIsJoining(true);
              setIsCreating(false);
              setErrorText(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg font-bold text-[11px] border cursor-pointer ${
              isJoining 
                ? "bg-zinc-100 text-zinc-900 border-zinc-400 font-semibold" 
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Unirme
          </button>
        </div>

        {/* Inline action forms */}
        {(isCreating || isJoining) && (
          <div className="p-4 bg-zinc-50 border-b border-zinc-100 animate-fadeIn">
            {isCreating && (
              <form onSubmit={handleCreate} className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Nuevo Grupo
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ej: Asado, Salida de cine..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 border border-zinc-200 rounded-lg bg-white focus:outline-hidden focus:border-zinc-800"
                    maxLength={30}
                  />
                  <button
                    type="submit"
                    className="px-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                  >
                    Crear
                  </button>
                </div>
              </form>
            )}

            {isJoining && (
              <form onSubmit={handleJoin} className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Unirme por Código
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Código de 8 dígitos"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 border border-zinc-200 rounded-lg bg-white focus:outline-hidden focus:border-zinc-800 uppercase font-mono tracking-wider"
                    maxLength={8}
                  />
                  <button
                    type="submit"
                    className="px-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                  >
                    Unirme
                  </button>
                </div>
              </form>
            )}

            {errorText && (
              <p className="text-[11px] text-rose-500 mt-2 font-medium">
                ⚠️ {errorText}
              </p>
            )}
            {successText && (
              <p className="text-[11px] text-green-600 mt-2 font-medium">
                ✓ {successText}
              </p>
            )}
          </div>
        )}

        {/* Group list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Mis Grupos ({groups.length})
            </span>
          </div>

          {groups.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Aún no estás en ningún grupo.</p>
              <p className="text-[10px] text-slate-400 mt-1">Crea uno nuevo o únete con un código.</p>
            </div>
          ) : (
            groups.map((group) => {
              const isActive = group.id === activeGroupId;
              const completedCount = group.responses.length;
              const totalCount = group.members.length;

              return (
                <div
                  key={group.id}
                  onClick={() => {
                    onSelectGroup(group.id);
                    setShowSidebarMobile(false);
                  }}
                  className={`
                    w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer group/item
                    ${isActive 
                      ? "bg-zinc-100 border-zinc-300 text-zinc-900 font-semibold" 
                      : "bg-white border-zinc-100 hover:border-zinc-200 text-zinc-650 hover:bg-zinc-50/50"
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="font-semibold text-sm break-words line-clamp-1 flex-1">
                      {group.name}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? "text-zinc-800 translate-x-1" : "text-zinc-300 group-hover/item:translate-x-1"}`} />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-mono text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded group-hover/item:bg-zinc-100 group-hover/item:text-zinc-600 transition-colors">
                      <Hash className="w-3 h-3 text-zinc-400" />
                      <span>{group.code}</span>
                      <button
                        onClick={(e) => copyToClipboard(group.code, e)}
                        className="p-0.5 hover:text-zinc-900 text-zinc-400 rounded shrink-0 cursor-pointer"
                        title="Copiar Código"
                      >
                        {copiedCode === group.code ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <div className="text-zinc-500 font-medium bg-zinc-50 px-2 py-0.5 rounded-full border border-zinc-100">
                      {completedCount}/{totalCount} rtas
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Hint Tip at Bottom */}
        <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400 bg-slate-50/30">
          <p className="font-semibold text-slate-500 mb-1">💡 Tip para la Demo:</p>
          <p className="leading-relaxed">
            Puedes simular que tus amigos se unen abriendo la app en otra pestaña, o cerrando sesión aquí para entrar con otro nombre y pegar el código.
          </p>
        </div>
      </aside>
    </>
  );
}
