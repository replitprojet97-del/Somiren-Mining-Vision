import { useEffect, useRef, useState } from "react";
import { TrendingUp, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { useLang } from "@/contexts/LanguageContext";
import type { Lang } from "@/i18n/translations";

const LANGS: { code: Lang; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
];

function LangDropdown({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGS.find((l) => l.code === lang)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 font-bold tracking-widest border transition-colors ${
          open
            ? "border-primary text-primary"
            : "border-white/20 text-white/80 hover:border-primary hover:text-primary"
        } ${compact ? "text-base px-4 py-2" : "text-sm px-3 py-1.5"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
      >
        {current.label}
        <ChevronDown
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""} ${compact ? "w-4 h-4" : "w-3 h-3"}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-1 w-full bg-black/95 border border-primary/30 backdrop-blur-md shadow-xl z-50 overflow-hidden"
        >
          {LANGS.map((l) => (
            <button
              key={l.code}
              role="option"
              aria-selected={lang === l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm font-bold tracking-widest transition-colors ${
                lang === l.code
                  ? "text-primary bg-primary/10"
                  : "text-white/70 hover:text-primary hover:bg-white/5"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { t } = useLang();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (target === "/") {
      if (location === "/") window.scrollTo({ top: 0, behavior: "smooth" });
      else setLocation("/");
      return;
    }
    if (target.startsWith("/")) { setLocation(target); return; }
    if (location !== "/") {
      sessionStorage.setItem("somiren:scrollTarget", target);
      setLocation("/");
    } else {
      document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleInvestorClick = () => {
    setMobileMenuOpen(false);
    if (location !== "/") {
      sessionStorage.setItem("somiren:scrollTarget", "#investisseurs");
      setLocation("/");
    } else {
      document.querySelector("#investisseurs")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navLinks = [
    { name: t.nav.home,       href: "/" },
    { name: t.nav.about,      href: "#apropos" },
    { name: t.nav.activities, href: "#activites" },
    { name: t.nav.projects,   href: "/projets" },
    { name: t.nav.team,       href: "#equipe" },
    { name: t.nav.partners,   href: "#partenaires" },
    { name: t.nav.tracking ?? "Suivi colis", href: "/tracking" },
    { name: t.nav.contact,    href: "/contact" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? "bg-black/95 backdrop-blur-md py-4 shadow-md" : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
        <Link href="/" className="flex flex-col items-start gap-1 cursor-pointer z-50">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Somiren Logo" className="w-6 h-6" />
            <span className="text-xl md:text-2xl font-bold tracking-wider text-white">SOMIREN S.A.</span>
          </div>
          <span className="text-[10px] text-primary tracking-widest font-semibold ml-8 hidden sm:block">
            {t.header.tagline}
          </span>
        </Link>

        <button
          className="lg:hidden text-white z-50"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        <nav
          className={`fixed inset-0 bg-black/95 flex flex-col items-center justify-center gap-8 transition-transform duration-300 lg:static lg:bg-transparent lg:flex-row lg:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNav(e, link.href)}
              className="text-xl lg:text-sm font-medium text-white/90 hover:text-primary transition-colors relative group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </a>
          ))}

          {/* Mobile: lang dropdown + investor button */}
          <div className="lg:hidden flex flex-col items-center gap-4 mt-2">
            <LangDropdown compact />
            <Button
              onClick={handleInvestorClick}
              className="flex gap-2 bg-primary text-black hover:bg-primary/90 rounded-none px-6 uppercase tracking-wider font-semibold"
            >
              <TrendingUp className="w-4 h-4" />
              {t.header.investors}
            </Button>
          </div>
        </nav>

        {/* Desktop: lang dropdown + investor button */}
        <div className="hidden lg:flex items-center gap-3">
          <LangDropdown />
          <Button
            onClick={handleInvestorClick}
            className="flex gap-2 bg-primary text-black hover:bg-primary/90 rounded-none px-6 uppercase tracking-wider font-semibold"
          >
            <TrendingUp className="w-4 h-4" />
            {t.header.investors}
          </Button>
        </div>
      </div>
    </header>
  );
}
