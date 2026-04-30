import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useLang } from "@/contexts/LanguageContext";

const icons = [ShieldCheck, TrendingUp, Leaf];

export default function Investors() {
  const [, setLocation] = useLocation();
  const { t } = useLang();
  const inv = t.investors;

  return (
    <section id="investisseurs" className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="bg-[#0B0B0B] border border-primary/20 p-8 md:p-12 lg:p-16 relative overflow-hidden rounded-xl shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/3 blur-[80px] rounded-full" />

          <div className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-4">{inv.eyebrow}</div>

          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-6">
            <span className="text-white">{inv.title1} </span>
            <span className="text-primary">{inv.title2}</span>
          </h2>

          <p className="text-gray-400 text-base md:text-lg leading-relaxed mb-12 max-w-3xl">{inv.subtitle}</p>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="space-y-6 mb-10">
                {inv.points.map((pt, i) => {
                  const Icon = icons[i];
                  return (
                    <div key={i} className="flex gap-4">
                      <div className="shrink-0 mt-1"><Icon className="w-5 h-5 text-primary" /></div>
                      <div>
                        <div className="text-white font-bold mb-1">{pt.title}</div>
                        <p className="text-gray-400 text-sm leading-relaxed">{pt.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-white/10 pt-8 mb-8">
                <p className="text-gray-400 text-sm leading-relaxed">{inv.dossierText}</p>
              </div>

              <Button
                onClick={() => setLocation("/contact?subject=investisseurs")}
                className="bg-primary text-black hover:bg-primary/90 rounded-none px-8 py-6 font-bold uppercase tracking-wider"
              >
                {inv.cta}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-2 gap-4 md:gap-6"
            >
              {inv.stats.map((stat, i) => (
                <div key={i} className="bg-black/50 border border-white/10 p-6 flex flex-col items-start gap-1 hover:border-primary/50 transition-colors">
                  <div className="w-2 h-2 bg-primary rounded-full mb-2" />
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
