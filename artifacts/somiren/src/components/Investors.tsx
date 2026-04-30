import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, TrendingUp, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Investors() {
  const [, setLocation] = useLocation();

  const points = [
    {
      icon: ShieldCheck,
      title: "Gouvernance transparente",
      desc: "Conseil d'administration indépendant, rapports trimestriels audités, conformité ITIE. Chaque franc investi est tracé et justifié."
    },
    {
      icon: TrendingUp,
      title: "Croissance maîtrisée",
      desc: "Plan de développement sur 10 ans avec jalons annuels définis. Deux sites actifs en 2026, cinq sites opérationnels visés d'ici 2030."
    },
    {
      icon: Leaf,
      title: "Impact ESG mesurable",
      desc: "1 200 emplois locaux créés, programme de reforestation des zones exploitées, partenariats avec les collectivités rurales riveraines."
    }
  ];

  return (
    <section id="investisseurs" className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="bg-[#0B0B0B] border border-primary/20 p-8 md:p-12 lg:p-16 relative overflow-hidden rounded-xl shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/3 blur-[80px] rounded-full"></div>

          <div className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-4">
            ESPACE INVESTISSEURS
          </div>

          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-6">
            <span className="text-white">Investir dans l'avenir minier </span>
            <span className="text-primary">du Niger</span>
          </h2>

          <p className="text-gray-400 text-base md:text-lg leading-relaxed mb-12 max-w-3xl">
            Le Niger détient les troisièmes plus grandes réserves d'uranium au monde, des gisements aurifères parmi les plus riches du Sahel et des ressources en nickel et phosphates encore largement sous-exploitées. Somiren S.A. vous ouvre l'accès à ces opportunités avec la rigueur d'une entreprise cotable.
          </p>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="space-y-6 mb-10">
                {points.map((pt, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="shrink-0 mt-1">
                      <pt.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-white font-bold mb-1">{pt.title}</div>
                      <p className="text-gray-400 text-sm leading-relaxed">{pt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-8 mb-8">
                <p className="text-gray-400 text-sm leading-relaxed">
                  Notre dossier d'investissement inclut : états financiers auditables, plan de mine certifié, étude d'impact environnemental, analyse de risques et projections de rendement sur 5 et 10 ans. Dossier transmis sous accord de confidentialité.
                </p>
              </div>

              <Button
                onClick={() => setLocation("/contact?subject=investisseurs")}
                className="bg-primary text-black hover:bg-primary/90 rounded-none px-8 py-6 font-bold uppercase tracking-wider"
              >
                Demander le dossier d'investissement
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-2 gap-4 md:gap-6"
            >
              {[
                { val: "20 000 t", label: "Production initiale (or + uranium)", sub: "Phase 1 — 2026" },
                { val: "02 Sites", label: "Actifs en exploitation", sub: "Agadez & Arlit" },
                { val: "100 %", label: "Conformité internationale", sub: "ITIE, AIEA, ISO 14001" },
                { val: "2030", label: "Horizon d'expansion", sub: "5 sites opérationnels" }
              ].map((stat, i) => (
                <div key={i} className="bg-black/50 border border-white/10 p-6 flex flex-col items-start gap-1 hover:border-primary/50 transition-colors">
                  <div className="w-2 h-2 bg-primary rounded-full mb-2"></div>
                  <div className="text-xl md:text-2xl font-bold text-white">{stat.val}</div>
                  <div className="text-xs text-primary uppercase tracking-wider font-semibold leading-tight">{stat.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.sub}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
