import { MapPin, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer id="footer" className="bg-[#050505] border-t border-primary/20 pt-20 pb-8">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}></div>
              <span className="text-2xl font-bold tracking-wider text-white">SOMIREN S.A.</span>
            </div>
            <div className="text-xs text-primary tracking-widest font-semibold uppercase mb-4">EXCELLENCE MINIÈRE, AVENIR DURABLE</div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Somiren S.A. s'engage pour une exploitation minière responsable, créatrice de valeur et d'opportunités pour le Niger et l'Afrique.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold tracking-widest mb-6">LIENS RAPIDES</h4>
            <ul className="space-y-3">
              {['Accueil', 'À propos', 'Activités', 'Projets', 'Équipe', 'Partenaires', 'Actualités', 'Contact'].map(link => (
                <li key={link}>
                  <a href={`#${link.toLowerCase()}`} className="text-gray-400 hover:text-primary transition-colors text-sm">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold tracking-widest mb-6">CONTACTEZ-NOUS</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>Quartier Industriel, Niamey,<br/>République du Niger</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span>+227 20 73 45 67</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span>contact@somiren.com</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold tracking-widest mb-6">SUIVEZ-NOUS</h4>
            <div className="flex gap-3 mb-8">
              {['IN', 'FB', 'X', 'YT'].map(social => (
                <a key={social} href="#" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-gray-400 hover:border-primary hover:text-primary hover:scale-110 transition-all text-xs font-bold">
                  {social}
                </a>
              ))}
            </div>
            <Button className="w-full bg-primary text-black hover:bg-primary/90 rounded-none tracking-widest font-bold">
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
