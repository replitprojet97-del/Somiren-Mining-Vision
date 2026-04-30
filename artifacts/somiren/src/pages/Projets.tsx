import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useLang } from "@/contexts/LanguageContext";
import siteAgadez from "@/assets/site-agadez.png";
import siteArlit from "@/assets/site-arlit.png";
import siteImouraren from "@/assets/site-imouraren.png";
import siteTillaberi from "@/assets/site-tillaberi.png";
import heroBg from "@/assets/hero.png";

const images = [siteAgadez, siteArlit, siteImouraren, siteTillaberi, siteAgadez];

const statusConfig = [
  { key: "active",      cls: "bg-primary text-black" },
  { key: "active",      cls: "bg-primary text-black" },
  { key: "development", cls: "border border-amber-500 text-amber-500 bg-black/50" },
  { key: "exploration", cls: "border border-slate-400 text-slate-400 bg-black/50" },
  { key: "exploration", cls: "border border-slate-400 text-slate-400 bg-black/50" },
] as const;

export default function ProjetsPage() {
  const [, setLocation] = useLocation();
  const { t } = useLang();
  const p = t.projets;
  const s = t.sites;

  const sites = p.sites.map((site, i) => ({
    ...site,
    img: images[i],
    status: s.statuses[statusConfig[i].key],
    statusClass: statusConfig[i].cls,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Helmet>
        <title>{t.contact.metaTitle}</title>
        <meta name="description" content="Découvrez les 5 sites miniers stratégiques de Somiren S.A. au Niger : Agadez (or), Arlit (uranium), Imouraren, Tillabéri (nickel), Tahoua (phosphates). Innovation et durabilité." />
        <link rel="canonical" href="https://somiren.com/projets" />
        <meta property="og:url" content="https://somiren.com/projets" />
        <meta property="og:title" content="Nos Projets Miniers — Somiren S.A. | Or, Uranium, Nickel au Niger" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://somiren.com/" },
            { "@type": "ListItem", "position": 2, "name": "Projets", "item": "https://somiren.com/projets" }
          ]
        })}</script>
      </Helmet>
      <Header />
      <main className="flex-1 pt-24">
        <section className="relative py-24 bg-[#0a0a0a] border-b border-primary/20">
          <div className="absolute inset-0 opacity-10 bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }} />
          <div className="container relative z-10 mx-auto px-4 md:px-8 text-center">
            <div className="text-primary text-sm font-bold tracking-widest uppercase mb-4">{p.breadcrumb}</div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-serif font-bold mb-6 text-white">
              {p.heroTitle}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-xl text-gray-400 max-w-2xl mx-auto">
              {p.heroSubtitle}
            </motion.p>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sites.map((site, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-card border border-white/10 rounded-xl overflow-hidden flex flex-col hover:border-primary/50 transition-colors"
                >
                  <div className="relative h-64 overflow-hidden group">
                    <img src={site.img} alt={site.name} draggable={false} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none select-none" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className={`absolute top-4 right-4 text-xs font-bold px-3 py-1.5 tracking-widest rounded ${site.statusClass}`}>{site.status}</div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <h3 className="text-2xl font-bold text-primary tracking-widest mb-1">{site.name}</h3>
                    <div className="text-sm text-gray-400 mb-4 uppercase font-semibold">{site.tag}</div>
                    <p className="text-gray-300 leading-relaxed mb-8 flex-1">{site.desc}</p>
                    <div className="pt-6 border-t border-white/10 flex justify-between items-center text-sm font-medium text-gray-500">
                      <div><span className="text-white">{p.typeLabel}:</span> {site.type}</div>
                      <div><span className="text-white">{p.yearLabel}:</span> {site.year}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary text-black text-center">
          <div className="container mx-auto px-4 md:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 uppercase tracking-wider">{p.ctaTitle}</h2>
            <Button onClick={() => setLocation("/contact")} size="lg" className="bg-black text-primary hover:bg-black/90 rounded-none px-10 py-6 text-lg font-bold uppercase tracking-widest">
              {p.ctaButton}
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
