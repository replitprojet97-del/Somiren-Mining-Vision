import { Calendar, Mountain, Users, Truck, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function StatsBar() {
  const stats = [
    { value: "2024", label: "Année de fondation", icon: Calendar },
    { value: "02", label: "Sites opérationnels", icon: Mountain },
    { value: "100+", label: "Emplois locaux créés", icon: Users },
    { value: "20K+", label: "Tonnes en phase initiale", icon: Truck },
    { value: "100%", label: "Conformité réglementaire", icon: ShieldCheck },
  ];

  return (
    <div className="bg-[#0a0a0a] border-y border-white/5 relative z-20">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-primary/20">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="py-8 px-4 flex flex-col items-center text-center group"
            >
              <stat.icon className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-xs uppercase tracking-widest text-primary font-semibold">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
