import { Search, LoaderPinwheel, Factory, Truck } from "lucide-react";
import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";
import imgExploration from "@/assets/activity-exploration.png";
import imgExtraction from "@/assets/activity-extraction.png";
import imgProcessing from "@/assets/activity-processing.png";
import imgLogistics from "@/assets/activity-logistics.png";

const icons = [Search, LoaderPinwheel, Factory, Truck];
const images = [imgExploration, imgExtraction, imgProcessing, imgLogistics];

export default function Activities() {
  const { t } = useLang();
  const act = t.activities;

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
            {act.sectionTitle}
            <div className="h-0.5 w-1/2 bg-primary mx-auto mt-4" />
          </motion.h2>
          <p className="text-gray-400 mt-6 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            {act.sectionSubtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {act.items.map((item, idx) => {
            const Icon = icons[idx];
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.6 }}
                className="group relative aspect-[4/5] overflow-hidden border border-white/10"
              >
                <img
                  src={images[idx]}
                  alt={item.title}
                  draggable={false}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none select-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10 transition-opacity group-hover:opacity-95" />
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <Icon className="w-8 h-8 text-primary mb-3" />
                  <h3 className="text-lg font-bold text-white mb-1 tracking-wide group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-xs text-primary/80 font-semibold mb-3 opacity-100 group-hover:opacity-0 transition-opacity duration-200">{item.short}</p>
                  <p className="text-xs text-gray-300 leading-relaxed opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
