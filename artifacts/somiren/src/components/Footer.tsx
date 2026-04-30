import { MapPin, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Footer() {
  const [, setLocation] = useLocation();

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    e.preventDefault();

    if (target === '/') {
      if (window.location.pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setLocation('/');
      }
      return;
    }

    if (target.startsWith('/')) {
      setLocation(target);
      return;
    }

    if (window.location.pathname !== '/') {
      sessionStorage.setItem('somiren:scrollTarget', target);
      setLocation('/');
    } else {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const quickLinks = [
    { label: 'Accueil', target: '/' },
    { label: 'À propos', target: '#apropos' },
    { label: 'Activités', target: '#activites' },
    { label: 'Projets', target: '/projets' },
    { label: 'Équipe', target: '#equipe' },
    { label: 'Partenaires', target: '#partenaires' },
    { label: 'Contact', target: '/contact' }
  ];

  return (
    <footer id="footer" className="bg-[#050505] border-t border-primary/20 pt-20 pb-8">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">

          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <img src="/logo.svg" alt="Somiren Logo" className="w-8 h-8" />
              <span className="text-2xl font-bold tracking-wider text-white">SOMIREN S.A.</span>
            </div>
            <div className="text-xs text-primary tracking-widest font-semibold uppercase mb-4">EXCELLENCE MINIÈRE, AVENIR DURABLE</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Somiren S.A. s'engage pour une exploitation minière responsable, créatrice de valeur et d'opportunités pour le Niger et l'Afrique.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-bold tracking-widest mb-6">LIENS RAPIDES</h4>
            <ul className="space-y-3">
              {quickLinks.map(link => (
                <li key={link.label}>
                  <a
                    href={link.target}
                    onClick={(e) => handleNav(e, link.target)}
                    className="text-gray-400 hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold tracking-widest mb-6">CONTACTEZ-NOUS</h4>
            <ul className="space-y-4 mb-6">
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>Boulevard Mali Béro, Plateau<br/>BP 11045 — Niamey<br/>République du Niger</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <a href="tel:+22720734567" className="hover:text-primary transition-colors">+227 20 73 45 67</a>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <a href="mailto:contact@somiren.com" className="hover:text-primary transition-colors">contact@somiren.com</a>
              </li>
            </ul>
            <Button
              onClick={() => setLocation('/contact')}
              className="w-full bg-primary text-black hover:bg-primary/90 rounded-none tracking-widest font-bold"
            >
              NOUS CONTACTER
            </Button>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            © 2025 Somiren S.A. Tous droits réservés.
          </div>
          <div className="flex gap-4 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Mentions légales</a>
            <span>|</span>
            <a href="#" className="hover:text-white transition-colors">Politique de confidentialité</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
