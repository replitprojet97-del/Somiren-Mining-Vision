import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import heroImg from "@/assets/hero.png";

export default function Hero() {
  const [, setLocation] = useLocation();

  const scrollToAbout = () => {
    const el = document.querySelector('#apropos');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="home" className="relative min-h-[90vh] flex items-center pt-24 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src={heroImg}
          alt="Opérations minières Somiren S.A."
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/30" style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.5) 65%, rgba(0,0,0,0.2) 100%)" }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40"></div>
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-8">
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] mb-6 font-serif drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
            <span className="block text-white">EXCELLENCE MINIÈRE</span>
            <span className="block text-primary">AU CŒUR DU NIGER</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/95 mb-10 font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            Innovation. Performance. Engagement durable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={scrollToAbout}
              className="bg-primary text-black hover:bg-primary/90 hover:scale-105 transition-all rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider gap-2"
            >
              DÉCOUVRIR SOMIREN <ArrowRight className="w-4 h-4" />
            </Button>
            <Button 
              onClick={() => setLocation("/contact")}
              variant="outline" 
              className="border-white/20 text-white hover:bg-primary hover:text-black hover:border-primary transition-all rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider gap-2"
            >
              NOUS CONTACTER <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
