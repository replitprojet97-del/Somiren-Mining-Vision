import { motion, type Transition, type Variants } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useLang } from "@/contexts/LanguageContext";
import heroImg from "@/assets/hero.png";

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18, delayChildren: 0.2 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export default function Hero() {
  const [, setLocation] = useLocation();
  const { t } = useLang();

  const scrollToAbout = () => {
    document.querySelector("#apropos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="home" className="relative min-h-[90vh] flex items-center pt-24 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <motion.img
          src={heroImg}
          alt="Opérations minières Somiren S.A."
          draggable={false}
          className="w-full h-full object-cover pointer-events-none select-none"
          initial={{ scale: 1 }}
          animate={{ scale: 1.06 }}
          transition={{ duration: 22, ease: [0.42, 0, 0.58, 1], repeat: Infinity, repeatType: "reverse" } as Transition}
        />
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.5) 65%, rgba(0,0,0,0.2) 100%)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-8">
        <motion.div className="max-w-3xl" variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
            <div className="h-px w-10 bg-primary" />
            <span className="text-primary text-xs font-bold tracking-[0.25em] uppercase">{t.hero.eyebrow}</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl font-bold leading-[1.05] mb-6 font-serif drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)]"
          >
            <span className="block text-white">{t.hero.line1}</span>
            <span className="block text-primary">{t.hero.line2}</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-xl md:text-2xl text-white/95 mb-10 font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            {t.hero.subtitle}
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={scrollToAbout}
              className="bg-primary text-black hover:bg-primary/90 hover:scale-105 transition-all rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider gap-2"
            >
              {t.hero.cta1} <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setLocation("/contact")}
              variant="outline"
              className="border-white/20 text-white hover:bg-primary hover:text-black hover:border-primary transition-all rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider gap-2"
            >
              {t.hero.cta2} <ExternalLink className="w-4 h-4" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
