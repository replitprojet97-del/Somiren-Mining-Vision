import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Investors() {
  const [, setLocation] = useLocation();

  return (
    <section id="investisseurs" className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="bg-[#0B0B0B] border border-primary/20 p-8 md:p-12 lg:p-16 relative overflow-hidden rounded-xl shadow-2xl">
          {/* Subtle background accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full"></div>
          
          <div className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-4">
            ESPACE INVESTISSEURS
          </div>
          
          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-12">
            <span className="text-white">Investir dans l'avenir minier </span>
            <span className="text-primary">du Niger</span>
          </h2>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-gray-300 leading-relaxed space-y-6 mb-8 text-lg">
                <p>
                  Somiren S.A. est une jeune entreprise structurée avec une vision à long terme. Nous offrons une opportunité d'entrée précoce dans des projets à fort potentiel, soutenue par une conformité internationale stricte et une gouvernance solide.
                </p>
                <ul className="space-y-4">
                  {[
                    "Gouvernance transparente",
                    "Croissance maîtrisée",
                    "Impact ESG mesurable"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-white font-medium">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <Button 
                onClick={() => setLocation("/contact?subject=investisseurs")}
                className="bg-primary text-black hover:bg-primary/90 rounded-none px-8 py-6 font-bold uppercase tracking-wider"
              >
                Demander le dossier d'investissement
              </Button>
            </motion.div>

            {/* Right Column */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-2 gap-4 md:gap-6"
            >
              {[
                { val: "20K+ Tonnes", label: "Production initiale" },
                { val: "02 Sites", label: "Actifs en exploitation" },
                { val: "100% Conforme", label: "Standards internationaux" },
                { val: "Long terme", label: "Vision stratégique" }
              ].map((stat, i) => (
                <div key={i} className="bg-black/50 border border-white/10 p-6 flex flex-col items-start gap-2 hover:border-primary/50 transition-colors">
                  <div className="w-2 h-2 bg-primary rounded-full mb-2"></div>
                  <div className="text-xl md:text-2xl font-bold text-white">{stat.val}</div>
                  <div className="text-xs text-primary uppercase tracking-wider font-semibold">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
