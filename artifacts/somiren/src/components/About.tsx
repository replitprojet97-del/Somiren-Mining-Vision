import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";
import executiveImg from "@/assets/team-rock-benon.jpg";

export default function About() {
  const { t } = useLang();
  const a = t.about;

  return (
    <section id="apropos" className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <div className="bg-card border border-white/5 p-8 md:p-16 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1/2 h-1 bg-gradient-to-r from-primary to-transparent" />

          <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-4">{a.eyebrow}</div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8 leading-tight">
                <span className="text-white">{a.title1}</span>
                <br />
                <span className="text-primary">{a.title2}</span>
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4 mb-8">
                <p>{a.p1}</p>
                <p>{a.p2}</p>
                <p>{a.p3}</p>
              </div>
              <Button
                onClick={() => document.querySelector("#activites")?.scrollIntoView({ behavior: "smooth" })}
                className="bg-primary text-black hover:bg-primary/90 rounded-none px-6 uppercase tracking-wider font-bold gap-2"
              >
                {a.cta} <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="relative aspect-[3/4] max-w-md mx-auto overflow-hidden border border-white/10">
                <img
                  src={executiveImg}
                  alt="Mr Rock Benon — Fondateur & Directeur Général de Somiren S.A."
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
                <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-sm p-4 border-t border-primary/30">
                  <div className="text-white font-bold text-lg">Mr Rock Benon</div>
                  <div className="text-primary text-sm">{a.role}</div>
                </div>
              </div>

              <div className="absolute -right-8 top-1/2 -translate-y-1/2 bg-[#0B0B0B] border border-primary/20 p-6 hidden xl:block w-72 shadow-2xl">
                <div className="space-y-6">
                  {[
                    { title: a.visionTitle, text: a.visionText, gold: false },
                    { title: a.missionTitle, text: a.missionText, gold: false },
                    { title: a.valuesTitle, text: a.valuesText, gold: true },
                  ].map((item, i) => (
                    <div key={i}>
                      {i > 0 && <div className="w-full h-px bg-white/10 mb-6" />}
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <h4 className="text-white font-bold tracking-wider">{item.title}</h4>
                      </div>
                      <p className={`text-sm ${item.gold ? "text-primary" : "text-muted-foreground"}`}>{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
