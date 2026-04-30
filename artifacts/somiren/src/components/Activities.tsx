import { Search, LoaderPinwheel, Factory, Truck } from "lucide-react";
import { motion } from "framer-motion";
import imgExploration from "@/assets/activity-exploration.png";
import imgExtraction from "@/assets/activity-extraction.png";
import imgProcessing from "@/assets/activity-processing.png";
import imgLogistics from "@/assets/activity-logistics.png";

export default function Activities() {
  const activities = [
    {
      title: "EXPLORATION MINIÈRE",
      short: "Identification des gisements à haute valeur",
      desc: "Nos géologues conduisent des campagnes de prospection sismique, des forages d'exploration et des analyses géochimiques sur l'ensemble du sous-sol nigérien. Chaque étude suit les référentiels JORC et NI 43-101 pour garantir une estimation des ressources fiable et auditée.",
      icon: Search,
      image: imgExploration
    },
    {
      title: "EXTRACTION",
      short: "Exploitation responsable et sécurisée",
      desc: "Nous opérons des sites à ciel ouvert avec des équipements Caterpillar et Volvo de dernière génération. Nos protocoles HSE surpassent les exigences de l'AIEA et de l'ITIE. Objectif zéro accident : chaque employé bénéficie d'une formation terrain complète avant toute prise de poste.",
      icon: LoaderPinwheel,
      image: imgExtraction
    },
    {
      title: "TRAITEMENT DES RESSOURCES",
      short: "Valorisation maximale des minerais bruts",
      desc: "Nos installations de traitement sur site minimisent les coûts de transport et maximisent la valeur ajoutée. Nous produisons de l'or à plus de 99,5 % de pureté et de l'uranium concentré (yellowcake) conforme aux normes de l'Agence Internationale de l'Énergie Atomique.",
      icon: Factory,
      image: imgProcessing
    },
    {
      title: "LOGISTIQUE & TRANSPORT",
      short: "Chaîne d'approvisionnement intégrée",
      desc: "Somiren S.A. dispose d'une flotte sécurisée et d'accords avec des opérateurs certifiés pour acheminer les ressources jusqu'aux ports d'Afrique de l'Ouest. Chaque convoi est tracé en temps réel avec des protocoles de sécurité renforcés et une couverture assurantielle internationale.",
      icon: Truck,
      image: imgLogistics
    }
  ];

  return (
    <section id="activites" className="py-24 bg-[#050505]">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block text-3xl md:text-4xl font-bold text-primary uppercase tracking-[0.1em]"
          >
            NOS ACTIVITÉS
            <div className="h-0.5 w-1/2 bg-primary mx-auto mt-4"></div>
          </motion.h2>
          <p className="text-gray-400 mt-6 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            De l'exploration au transport, Somiren S.A. maîtrise l'intégralité de la chaîne de valeur minière avec des standards techniques et environnementaux de rang international.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activities.map((act, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className="group relative aspect-[4/5] overflow-hidden border border-white/10"
            >
              <img
                src={act.image}
                alt={act.title}
                draggable={false}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none select-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10 transition-opacity group-hover:opacity-95"></div>

              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <act.icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="text-lg font-bold text-white mb-1 tracking-wide group-hover:text-primary transition-colors">
                  {act.title}
                </h3>
                <p className="text-xs text-primary/80 font-semibold mb-3 opacity-100 group-hover:opacity-0 transition-opacity duration-200">{act.short}</p>
                <p className="text-xs text-gray-300 leading-relaxed opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  {act.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
