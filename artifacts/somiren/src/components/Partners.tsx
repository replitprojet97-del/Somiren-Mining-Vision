import { motion } from "framer-motion";

export default function Partners() {
  const row1 = ["Samsung", "Hyundai", "POSCO", "Mitsubishi", "JFE", "Marubeni", "Sumitomo Corporation", "Bank of China", "ICBC", "KFW"];
  const row2 = ["Standard Bank", "ABSA", "Nedbank", "Investec", "FirstRand", "Rand Merchant Bank", "AMP", "Société Générale", "BNP Paribas", "HSBC", "ING", "UniCredit", "Crédit Agricole"];

  return (
    <section id="partners" className="py-24 bg-[#E5E5E5] overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 mb-12">
        <div className="text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block text-3xl md:text-4xl font-bold text-[#111] uppercase tracking-[0.1em]"
          >
            NOS PARTENAIRES
            <div className="h-0.5 w-1/2 bg-primary mx-auto mt-4"></div>
          </motion.h2>
        </div>
      </div>

      <div className="relative w-full flex flex-col gap-8">
        {/* Row 1 */}
        <div className="flex overflow-hidden relative">
          <div className="flex animate-scroll-left min-w-max">
            {[...row1, ...row1, ...row1].map((partner, i) => (
              <div key={i} className="flex items-center justify-center w-64 mx-4">
                <span className="text-2xl font-bold text-gray-500 hover:text-black hover:scale-110 transition-all duration-300 font-serif">
                  {partner}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex overflow-hidden relative">
          <div className="flex animate-scroll-right min-w-max">
            {[...row2, ...row2, ...row2].map((partner, i) => (
              <div key={i} className="flex items-center justify-center w-64 mx-4">
                <span className="text-2xl font-bold text-gray-500 hover:text-[#0055A4] hover:scale-110 transition-all duration-300 font-sans tracking-tight">
                  {partner}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
