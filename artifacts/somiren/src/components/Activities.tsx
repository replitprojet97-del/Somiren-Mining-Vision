import { Search, LoaderPinwheel, Factory, Truck } from "lucide-react";
import { motion } from "framer-motion";

export default function Activities() {
  const activities = [
    {
      title: "EXPLORATION MINIÈRE",
      desc: "Études géologiques avancées et prospection pour identifier les meilleurs gisements.",
      icon: Search,
      image: "/src/assets/activity-exploration.png"
    },
    {
      title: "EXTRACTION",
      desc: "Exploitation responsable des minerais avec des équipements de pointe et des normes de sécurité strictes.",
      icon: LoaderPinwheel,
      image: "/src/assets/activity-extraction.png"
    },
    {
      title: "TRAITEMENT DES RESSOURCES",
      desc: "Stations de traitement modernes pour optimiser la qualité et la valeur des minerais extraits.",
      icon: Factory,
      image: "/src/assets/activity-processing.png"
    },
    {
      title: "LOGISTIQUE & TRANSPORT",
      desc: "Chaîne logistique intégrée pour assurer l'acheminement efficace et sécurisé des ressources.",
      icon: Truck,
      image: "/src/assets/activity-logistics.png"
    }
  ];

  return (
    <section id="activities" className="py-24 bg-[#050505]">
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
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity group-hover:opacity-90"></div>
              
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <act.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-xl font-bold text-white mb-2 tracking-wide group-hover:text-primary transition-colors">
                  {act.title}
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
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
