import { motion } from "framer-motion";
import { SiMitsubishi, SiHyundai, SiHsbc } from "react-icons/si";
import type { ReactNode } from "react";

type Partner = {
  name: string;
  icon?: ReactNode;
  color: string;
  font?: string;
  letterSpacing?: string;
};

export default function Partners() {
  const row1: Partner[] = [
    { name: "Mitsubishi", icon: <SiMitsubishi className="w-10 h-10 text-[#E60012]" />, color: "#E60012" },
    { name: "Sumitomo", color: "#00479A", letterSpacing: "0.02em" },
    { name: "Marubeni", color: "#C8102E", letterSpacing: "0.02em" },
    { name: "Hyundai", icon: <SiHyundai className="w-10 h-10 text-[#002C5F]" />, color: "#002C5F" },
    { name: "POSCO", color: "#004B87", letterSpacing: "0.08em" },
  ];

  const row2: Partner[] = [
    { name: "Standard Bank", color: "#0033A0", letterSpacing: "0.01em" },
    { name: "ABSA", color: "#E3000F", letterSpacing: "0.05em" },
    { name: "Nedbank", color: "#00563F", letterSpacing: "0.02em" },
    { name: "BNP PARIBAS", color: "#00915A", letterSpacing: "0.04em" },
    { name: "Société Générale", color: "#E10019", letterSpacing: "0.01em" },
    { name: "HSBC", icon: <SiHsbc className="w-10 h-10 text-[#DB0011]" />, color: "#DB0011" },
    { name: "ING", color: "#FF6200", letterSpacing: "0.04em" },
  ];

  return (
    <section id="partenaires" className="py-24 bg-[#F5F1EA] overflow-hidden border-t border-b border-black/10">
      <div className="container mx-auto px-4 md:px-8 mb-16">
        <div className="text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block text-3xl md:text-4xl font-bold text-black uppercase tracking-[0.1em]"
          >
            NOS PARTENAIRES
            <div className="h-0.5 w-1/2 bg-primary mx-auto mt-4"></div>
          </motion.h2>
        </div>
      </div>

      <div className="relative w-full flex flex-col gap-8 group">
        {/* Row 1 */}
        <div className="flex overflow-hidden relative">
          <div className="flex animate-scroll-left min-w-max group-hover:[animation-play-state:paused]">
            {[...row1, ...row1, ...row1, ...row1].map((partner, i) => (
              <div key={i} className="flex items-center justify-center w-36 md:w-48 h-20 mx-4 bg-white rounded-lg border border-black/5 hover:scale-105 hover:shadow-lg transition-all duration-300">
                {partner.icon ? (
                  partner.icon
                ) : (
                  <span
                    className="text-base md:text-lg font-bold whitespace-nowrap px-3 text-center"
                    style={{ color: partner.color, letterSpacing: partner.letterSpacing ?? "normal" }}
                  >
                    {partner.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex overflow-hidden relative">
          <div className="flex animate-scroll-right min-w-max group-hover:[animation-play-state:paused]" style={{ animationDuration: '50s' }}>
            {[...row2, ...row2, ...row2, ...row2].map((partner, i) => (
              <div key={i} className="flex items-center justify-center w-36 md:w-48 h-20 mx-4 bg-white rounded-lg border border-black/5 hover:scale-105 hover:shadow-lg transition-all duration-300">
                {partner.icon ? (
                  partner.icon
                ) : (
                  <span
                    className="text-base md:text-lg font-bold whitespace-nowrap px-3 text-center"
                    style={{ color: partner.color, letterSpacing: partner.letterSpacing ?? "normal" }}
                  >
                    {partner.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
