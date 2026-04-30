import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import imgRock from "@/assets/team-rock-benon.jpg";
import imgNuria from "@/assets/team-nuria.jpg";
import imgIbrahim from "@/assets/team-ibrahim.png";
import imgWeiChen from "@/assets/team-wei-chen.png";
import imgAissa from "@/assets/team-aissa.png";
import imgMoussa from "@/assets/team-moussa.png";

const team = [
  { name: "Rock Benon", role: "Fondateur & Directeur Général", img: imgRock },
  { name: "Nuria M. Rodriguez", role: "Assistante Exécutive & Conseillère Stratégique", img: imgNuria },
  { name: "Ibrahim Maman", role: "Directeur des Opérations", img: imgIbrahim },
  { name: "Wei Chen", role: "Directeur Technique", img: imgWeiChen },
  { name: "Aïssa K. Saley", role: "Directrice HSE & Développement Durable", img: imgAissa },
  { name: "Moussa Garba", role: "Responsable des Projets", img: imgMoussa },
];

export default function Team() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Track viewport size for visible-card count
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Track scroll position to update active index (mobile dots)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const card = el.querySelector<HTMLElement>("[data-card]");
      if (!card) return;
      const cardWidth = card.offsetWidth + 24; // gap-6
      const idx = Math.round(el.scrollLeft / cardWidth);
      setActiveIndex(Math.min(team.length - 1, Math.max(0, idx)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-advance on mobile only
  useEffect(() => {
    if (!isMobile) return;
    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const card = el.querySelector<HTMLElement>("[data-card]");
      if (!card) return;
      const cardWidth = card.offsetWidth + 24;
      const next = (Math.round(el.scrollLeft / cardWidth) + 1) % team.length;
      el.scrollTo({ left: next * cardWidth, behavior: "smooth" });
    }, 4500);
    return () => clearInterval(id);
  }, [isMobile]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    if (!card) return;
    const cardWidth = card.offsetWidth + 24;
    el.scrollBy({ left: dir * cardWidth, behavior: "smooth" });
  };

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    if (!card) return;
    const cardWidth = card.offsetWidth + 24;
    el.scrollTo({ left: i * cardWidth, behavior: "smooth" });
  };

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
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollByDir(-1)}
              aria-label="Précédent"
              className="rounded-none border-white/20 text-white hover:bg-primary hover:text-black"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollByDir(1)}
              aria-label="Suivant"
              className="rounded-none border-white/20 text-white hover:bg-primary hover:text-black"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="overflow-x-auto pb-8 hide-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4 md:mx-0 md:px-0"
        >
          <div className="flex gap-6 w-max">
            {team.map((member, idx) => (
              <motion.div
                key={idx}
                data-card
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="snap-center w-[88vw] sm:w-80 md:w-72 relative aspect-[3/4] border border-white/10 group overflow-hidden rounded-sm"
              >
                <img
                  src={member.img}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>

                <div className="absolute bottom-0 inset-x-0 p-6 md:translate-y-4 md:group-hover:translate-y-0 md:transition-transform">
                  <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                  <div className="text-sm text-primary font-medium">{member.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Dots indicator (mobile only) */}
        <div className="flex md:hidden justify-center gap-2 mt-2">
          {team.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Aller à la fiche ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? "w-6 bg-primary" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
