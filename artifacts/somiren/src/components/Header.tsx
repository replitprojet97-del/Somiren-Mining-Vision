import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Accueil", href: "#home" },
    { name: "À propos", href: "#about" },
    { name: "Activités", href: "#activities" },
    { name: "Projets", href: "#sites" },
    { name: "Équipe", href: "#team" },
    { name: "Partenaires", href: "#partners" },
    { name: "Contact", href: "#footer" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? "bg-black/95 backdrop-blur-md py-4 shadow-md" : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}></div>
            <span className="text-xl md:text-2xl font-bold tracking-wider text-white">SOMIREN S.A.</span>
          </div>
          <span className="text-[10px] text-primary tracking-widest font-semibold ml-8">EXCELLENCE MINIÈRE, AVENIR DURABLE</span>
        </div>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-white/90 hover:text-primary transition-colors relative group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
            </a>
          ))}
        </nav>

        <Button className="hidden md:flex gap-2 bg-primary text-black hover:bg-primary/90 rounded-none px-6 uppercase tracking-wider font-semibold">
          <Phone className="w-4 h-4" />
          Nous Contacter
        </Button>
      </div>
    </header>
  );
}
