import { motion } from "framer-motion";
import type { IconType } from "react-icons";
import { useLang } from "@/contexts/LanguageContext";
import {
  SiCaterpillar, SiHyundai, SiMitsubishi, SiSamsung, SiVolvo,
  SiScania, SiJcb, SiSiemens, SiAbb, SiToyota,
  SiHsbc, SiBarclays, SiDeutschebank, SiAmp, SiGeneralelectric,
} from "react-icons/si";

type Partner = { name: string; Icon: IconType; color: string };

const row1: Partner[] = [
  { name: "Caterpillar",  Icon: SiCaterpillar,    color: "#FFCD11" },
  { name: "Hyundai",      Icon: SiHyundai,         color: "#002C5F" },
  { name: "Mitsubishi",   Icon: SiMitsubishi,      color: "#E60012" },
  { name: "Samsung",      Icon: SiSamsung,         color: "#1428A0" },
  { name: "Volvo",        Icon: SiVolvo,           color: "#003057" },
  { name: "Scania",       Icon: SiScania,          color: "#041E42" },
  { name: "JCB",          Icon: SiJcb,             color: "#FCB026" },
  { name: "Siemens",      Icon: SiSiemens,         color: "#009999" },
  { name: "ABB",          Icon: SiAbb,             color: "#FF000F" },
  { name: "Toyota",       Icon: SiToyota,          color: "#EB0A1E" },
];

const row2: Partner[] = [
  { name: "HSBC",           Icon: SiHsbc,          color: "#DB0011" },
  { name: "Barclays",       Icon: SiBarclays,      color: "#00AEEF" },
  { name: "Deutsche Bank",  Icon: SiDeutschebank,  color: "#0018A8" },
  { name: "AMP",            Icon: SiAmp,           color: "#005EB8" },
  { name: "General Electric", Icon: SiGeneralelectric, color: "#3360A9" },
];

function PartnerCard({ partner }: { partner: Partner }) {
  const Icon = partner.Icon;
  return (
    <div className="flex items-center justify-center gap-3 w-48 md:w-56 h-20 md:h-24 mx-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow shrink-0 px-5">
      <Icon className="w-9 h-9 md:w-10 md:h-10 shrink-0" style={{ color: partner.color }} />
      <span className="text-sm md:text-[15px] font-semibold text-black/80 truncate">{partner.name}</span>
    </div>
  );
}

export default function Partners() {
  const { t } = useLang();

  return (
    <section id="partenaires" className="py-20 md:py-24 bg-[#F5F1EA] overflow-hidden border-t border-b border-black/10">
      <div className="container mx-auto px-4 md:px-8 mb-12">
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block text-3xl md:text-4xl font-bold text-black uppercase tracking-[0.1em]"
          >
            {t.partners.sectionTitle}
            <div className="h-0.5 w-1/2 bg-primary mx-auto mt-4" />
          </motion.h2>
          <p className="text-sm md:text-base text-black/60 mt-4 max-w-2xl mx-auto">{t.partners.subtitle}</p>
        </div>
      </div>

      <div className="relative w-full flex flex-col gap-6 group">
        <div className="flex overflow-hidden relative">
          <div className="flex animate-scroll-left min-w-max group-hover:[animation-play-state:paused]">
            {[...row1, ...row1, ...row1].map((partner, i) => <PartnerCard key={`r1-${i}`} partner={partner} />)}
          </div>
        </div>
        <div className="flex overflow-hidden relative">
          <div className="flex animate-scroll-right min-w-max group-hover:[animation-play-state:paused]" style={{ animationDuration: "55s" }}>
            {[...row2, ...row2, ...row2, ...row2].map((partner, i) => <PartnerCard key={`r2-${i}`} partner={partner} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
