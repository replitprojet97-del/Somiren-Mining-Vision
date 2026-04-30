import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLang } from "@/contexts/LanguageContext";

type FormValues = { name: string; email: string; phone?: string; subject: string; message: string };

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { t } = useLang();
  const c = t.contact;
  const f = c.form;

  const formSchema = z.object({
    name: z.string().min(2, f.nameError),
    email: z.string().email(f.emailError),
    phone: z.string().optional(),
    subject: z.string().min(1, f.subjectError),
    message: z.string().min(20, f.messageError),
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { subject: "" },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subject") === "investisseurs") setValue("subject", f.subjects[2]);
  }, [setValue, f.subjects]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
      const res = await fetch(`${apiBase}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? c.serverError);
      }
      setIsSuccess(true);
      toast.success(c.toastSuccess);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : c.toastError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Helmet>
        <title>{c.metaTitle}</title>
        <meta name="description" content={c.metaDesc} />
        <link rel="canonical" href="https://somiren.com/contact" />
        <meta property="og:url" content="https://somiren.com/contact" />
        <meta property="og:title" content={c.metaTitle} />
        <meta property="og:description" content={c.metaDesc} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://somiren.com/" },
            { "@type": "ListItem", "position": 2, "name": "Contact", "item": "https://somiren.com/contact" }
          ]
        })}</script>
      </Helmet>
      <Header />
      <main className="flex-1 pt-24">
        <section className="relative py-24 bg-[#0a0a0a] border-b border-primary/20">
          <div className="absolute inset-0 opacity-10 bg-[url('/src/assets/hero.png')] bg-cover bg-center" />
          <div className="container relative z-10 mx-auto px-4 md:px-8 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-serif font-bold mb-6 text-white">
              {c.heroTitle}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-xl text-gray-400 max-w-2xl mx-auto">
              {c.heroSubtitle}
            </motion.p>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid lg:grid-cols-5 gap-12 lg:gap-24">

              <div className="lg:col-span-3">
                {isSuccess ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-primary/50 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                      <Mail className="w-8 h-8 text-black" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">{c.success.title}</h3>
                    <p className="text-gray-400 mb-8">{c.success.message}</p>
                    <Button variant="outline" onClick={() => { setIsSuccess(false); reset(); }} className="border-primary text-primary hover:bg-primary hover:text-black uppercase tracking-widest rounded-none">
                      {c.success.again}
                    </Button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-white/10 rounded-xl p-8 md:p-10 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">{f.nameLabel}</label>
                        <Input {...register("name")} placeholder={f.namePlaceholder} className="bg-black/50 border-white/20 focus-visible:ring-primary focus-visible:border-primary rounded-none" />
                        {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">{f.emailLabel}</label>
                        <Input {...register("email")} type="email" placeholder="email@company.com" className="bg-black/50 border-white/20 focus-visible:ring-primary focus-visible:border-primary rounded-none" />
                        {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">{f.phoneLabel}</label>
                        <Input {...register("phone")} type="tel" placeholder="+227 00 00 00 00" className="bg-black/50 border-white/20 focus-visible:ring-primary focus-visible:border-primary rounded-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">{f.subjectLabel}</label>
                        <Select onValueChange={(val) => setValue("subject", val)}>
                          <SelectTrigger className="bg-black/50 border-white/20 focus:ring-primary rounded-none">
                            <SelectValue placeholder={f.subjectPlaceholder} />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111] border-white/20">
                            {f.subjects.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.subject && <p className="text-red-500 text-xs">{errors.subject.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-300">{f.messageLabel}</label>
                      <Textarea {...register("message")} rows={6} placeholder={f.messagePlaceholder} className="bg-black/50 border-white/20 focus-visible:ring-primary focus-visible:border-primary rounded-none resize-none" />
                      {errors.message && <p className="text-red-500 text-xs">{errors.message.message}</p>}
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full bg-primary text-black hover:bg-primary/90 rounded-none py-6 uppercase tracking-widest font-bold">
                      {isSubmitting ? f.submitting : f.submit}
                    </Button>
                  </form>
                )}
              </div>

              <div className="lg:col-span-2 space-y-8">
                <div className="bg-card border border-white/10 rounded-xl p-8 space-y-8">
                  <h3 className="text-2xl font-serif font-bold text-white mb-6 border-b border-white/10 pb-4">{c.info.title}</h3>
                  <div className="space-y-6">
                    {[
                      { icon: MapPin, label: c.info.addressLabel, val: c.info.addressVal, href: null },
                      { icon: Mail,   label: c.info.emailLabel,   val: "contact@somiren.com", href: "mailto:contact@somiren.com" },
                      { icon: Phone,  label: c.info.phoneLabel,   val: "+227 20 73 45 67",   href: "tel:+22720734567" },
                      { icon: Clock,  label: c.info.hoursLabel,   val: c.info.hoursVal,       href: null },
                    ].map(({ icon: Icon, label, val, href }) => (
                      <div key={label} className="flex gap-4">
                        <div className="mt-1 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-white font-bold mb-1">{label}</h4>
                          {href ? (
                            <a href={href} className="text-primary hover:underline text-sm" style={{ whiteSpace: "pre-line" }}>{val}</a>
                          ) : (
                            <p className="text-gray-400 text-sm" style={{ whiteSpace: "pre-line" }}>{val}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-white/10 rounded-xl overflow-hidden h-64 relative">
                  <iframe
                    title="Siège social Somiren S.A. — Niamey, Niger"
                    src="https://maps.google.com/maps?q=Boulevard+Mali+B%C3%A9ro%2C+Plateau%2C+Niamey%2C+Niger&t=&z=14&ie=UTF8&iwloc=&output=embed"
                    className="w-full h-full"
                    style={{ border: 0, filter: "grayscale(0.4) contrast(1.05)" }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-4 text-xs font-bold text-white tracking-widest uppercase">{c.info.mapLabel}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
