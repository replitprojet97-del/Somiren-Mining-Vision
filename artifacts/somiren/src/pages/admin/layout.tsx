import { useState } from "react";
import { X, ChevronRight, ChevronLeft, LogOut, Menu, Globe, Bell } from "lucide-react";
import { C, logoPath } from "./shared";

export function Sidebar({ nav, active, setActive, collapsed, setCollapsed, mobileOpen, setMobileOpen, onLogout }: any) {
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed md:static z-40 h-[100dvh] flex flex-col transition-all duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} ${collapsed ? "md:w-[76px]" : "md:w-[268px]"} w-[268px]`} style={{ background: C.navy }}>
        <div className="flex items-center gap-3 px-5 h-16 shrink-0" style={{ borderBottom: `1px solid ${C.navyLine}` }}>
          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-white/10 p-1">
            <img src={logoPath} alt="Somiren" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold leading-tight truncate tracking-wider">SOMIREN</p>
              <p className="text-[11px] leading-tight truncate uppercase tracking-widest" style={{ color: "#8FA6B8" }}>Administration</p>
            </div>
          )}
          <button className="ml-auto md:hidden" onClick={() => setMobileOpen(false)}><X size={18} color="#8FA6B8" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5 custom-scrollbar">
          {nav.map((item: any) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button key={item.id} onClick={() => { setActive(item.id); setMobileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors" style={{ background: isActive ? C.navySoft : "transparent", color: isActive ? "white" : "#A9BAC7", borderLeft: isActive ? `3px solid ${C.accent}` : "3px solid transparent" }} title={collapsed ? item.label : undefined}>
                <Icon size={17} className="shrink-0" />
                {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-4 space-y-2.5" style={{ borderTop: `1px solid ${C.navyLine}` }}>
          {!collapsed && <div className="flex items-center gap-2 text-[13px]" style={{ color: "#CFE0D2" }}><span className="w-2 h-2 rounded-full" style={{ background: "#3FA66C" }} /> Session admin active</div>}
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm mt-2 hover:bg-white/10 transition-colors" style={{ color: "#E2B7AE", background: "rgba(255,255,255,0.04)" }}>
            <LogOut size={16} /> {!collapsed && "Déconnexion"}
          </button>
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="hidden md:flex items-center justify-center h-8 w-8 rounded-full absolute -right-3 top-16" style={{ background: C.accent, color: "white", zIndex: 50 }}>
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </aside>
    </>
  );
}

export function Topbar({ onOpenMobile, label, profile }: any) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 shrink-0 bg-white" style={{ borderBottom: `1px solid ${C.line}` }}>
      <div className="flex items-center gap-3 min-w-0">
        <button className="md:hidden" onClick={onOpenMobile}><Menu size={20} color={C.ink} /></button>
        <span className="text-[15px] font-semibold truncate" style={{ color: C.ink }}>{label}</span>
      </div>
      <div className="flex items-center gap-3 md:gap-5">
        <button className="hidden sm:flex items-center gap-1.5 text-sm px-2 py-1 rounded-md" style={{ color: C.inkSoft }}>
          <Globe size={15} /> FR
        </button>
        <Bell size={19} color={C.inkSoft} />
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ background: C.accent }}>
              {profile?.fullName?.split(" ").map((n:string)=>n[0]).slice(0, 2).join("") || "A"}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <p className="text-[13px] font-semibold" style={{ color: C.ink }}>{profile?.fullName || "Administrateur"}</p>
              <p className="text-[11.5px]" style={{ color: C.inkSoft }}>{profile?.role || "Plateforme"}</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
