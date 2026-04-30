import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import executiveImg from "@/assets/team-rock-benon.jpg";

export default function About() {
  const scrollToActivities = () => {
    const el = document.querySelector('#activites');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="apropos" className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <div className="bg-card border border-white/5 p-8 md:p-16 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1/2 h-1 bg-gradient-to-r from-primary to-transparent"></div>

          <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-4">
                À PROPOS DE SOMIREN S.A.
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8 leading-tight">
                <span className="text-white">Une vision. Une mission.</span>
                <br />
                <span className="text-primary">Un impact durable.</span>
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4 mb-8">
                <p>
                  Fondée en 2024 par Mr Rock Benon, ancien directeur du réseau financier Benon Business, Somiren S.A. a lancé ses premières opérations d'extraction au premier trimestre 2026. L'entreprise mobilise l'expertise de son fondateur en structuration financière et en gestion stratégique pour bâtir un acteur minier de référence, au service du développement économique du Niger et de l'Afrique subsaharienne.
                </p>
                <p>
                  En moins de deux ans d'existence, Somiren S.A. opère déjà deux sites actifs — Agadez (or) et Arlit (uranium) — et conduit des programmes d'exploration avancés sur trois sites additionnels. L'entreprise allie technologie de pointe, gouvernance transparente et engagement RSE sincère pour une exploitation des ressources naturelles qui profite autant aux communautés locales qu'aux partenaires internationaux.
                </p>
                <p>
                  Membre de l'Initiative pour la Transparence des Industries Extractives (ITIE) et signataire du Pacte Mondial des Nations Unies, Somiren S.A. s'impose des standards de conformité dépassant les obligations réglementaires nigériennes.
                </p>
              </div>
              <Button
                onClick={scrollToActivities}
                className="bg-primary text-black hover:bg-primary/90 rounded-none px-6 uppercase tracking-wider font-bold gap-2"
              >
                EN SAVOIR PLUS <ArrowRight className="w-4 h-4" />
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
                  <div className="text-primary text-sm">Fondateur & Directeur Général</div>
                </div>
              </div>

              <div className="absolute -right-8 top-1/2 -translate-y-1/2 bg-[#0B0B0B] border border-primary/20 p-6 hidden xl:block w-72 shadow-2xl">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <h4 className="text-white font-bold tracking-wider">VISION</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Devenir d'ici 2035 le premier groupe minier privé d'Afrique de l'Ouest, reconnu pour son excellence opérationnelle et son impact social positif.</p>
                  </div>
                  <div className="w-full h-px bg-white/10"></div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <h4 className="text-white font-bold tracking-wider">MISSION</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Exploiter durablement les ressources minérales du Niger en créant de la valeur partagée pour nos actionnaires, nos employés et nos communautés hôtes.</p>
                  </div>
                  <div className="w-full h-px bg-white/10"></div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <h4 className="text-white font-bold tracking-wider">VALEURS</h4>
                    </div>
                    <p className="text-sm text-primary">Intégrité — Sécurité — Innovation — Responsabilité — Performance</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
