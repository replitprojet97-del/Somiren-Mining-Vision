import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import imgRock from "@/assets/team-rock-benon.jpg";
import imgNuria from "@/assets/team-nuria.jpg";
import imgIbrahim from "@/assets/team-ibrahim.jpg";
import imgAbdoulaye from "@/assets/team-abdoulaye.jpg";
import imgAissa from "@/assets/team-aissa.jpg";
import imgMoussa from "@/assets/team-moussa.jpg";

export default function Team() {
  const team = [
    { name: "Rock Benon", role: "Fondateur & Directeur Général", img: imgRock },
    { name: "Nuria M. Rodriguez", role: "Assistante Exécutive & Conseillère Stratégique", img: imgNuria },
    { name: "Ibrahim Maman", role: "Directeur des Opérations", img: imgIbrahim },
    { name: "Abdoulaye Hassane", role: "Directeur Technique", img: imgAbdoulaye },
    { name: "Aïssa K. Saley", role: "Directrice HSE & Développement Durable", img: imgAissa },
    { name: "Moussa Garba", role: "Responsable des Projets", img: imgMoussa },
  ];

  return (
    <section id="equipe" className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-end justify-between mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white uppercase tracking-[0.1em]"
          >
            NOTRE ÉQUIPE DIRIGEANTE
          </motion.h2>
          <div className="hidden md:flex gap-2">
            <Button variant="outline" size="icon" className="rounded-none border-white/20 text-white hover:bg-primary hover:text-black">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-none border-white/20 text-white hover:bg-primary hover:text-black">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto pb-8 hide-scrollbar">
          <div className="flex gap-6 w-max">
            {team.map((member, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="w-72 relative aspect-[3/4] border border-white/10 group overflow-hidden"
              >
                <img src={member.img} alt={member.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="absolute bottom-0 inset-x-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform">
                  <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                  <div className="text-sm text-primary font-medium">{member.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
