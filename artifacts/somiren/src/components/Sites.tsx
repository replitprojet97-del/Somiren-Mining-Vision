import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useLang } from "@/contexts/LanguageContext";
import siteAgadez from "@/assets/site-agadez.png";
import siteArlit from "@/assets/site-arlit.png";
import siteImouraren from "@/assets/site-imouraren.png";
import siteTillaberi from "@/assets/site-tillaberi.png";

const images = [siteAgadez, siteArlit, siteImouraren, siteTillaberi, siteAgadez];

const statusConfig = [
  { key: "active",       cls: "bg-primary text-black" },
  { key: "active",       cls: "bg-primary text-black" },
  { key: "development",  cls: "border border-amber-500 text-amber-500 bg-black/50" },
  { key: "exploration",  cls: "border border-slate-400 text-slate-400 bg-black/50" },
  { key: "exploration",  cls: "border border-slate-400 text-slate-400 bg-black/50" },
] as const;

export default function Sites() {
  const [, setLocation] = useLocation();
  const { t } = useLang();
  const s = t.sites;

  const sites = s.tags.map((tag, i) => ({
    name: t.projets.sites[i].name,
    tag,
    img: images[i],
    status: s.statuses[statusConfig[i].key],
    statusClass: statusConfig[i].cls,
  }));

  return (
    <section id="sites" className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white uppercase tracking-[0.1em]"
          >
            {s.sectionTitle}
          </motion.h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {sites.map((site, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setLocation("/projets")}
              className="relative aspect-square border border-white/10 overflow-hidden group cursor-pointer"
            >
              <img
                src={site.img}
                alt={site.name}
                draggable={false}
                className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110 pointer-events-none select-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
              <div className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-1 tracking-widest z-10 ${site.statusClass}`}>
                {site.status}
              </div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-primary m-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-primary m-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 inset-x-0 p-4 text-center">
                <div className="font-bold text-white tracking-widest">{site.name}</div>
                <div className="text-xs text-primary mt-1">{site.tag}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Button
            onClick={() => setLocation("/projets")}
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-black rounded-none px-8 py-6 tracking-widest font-bold uppercase"
          >
            {s.viewAll}
          </Button>
        </div>
      </div>
    </section>
  );
}
