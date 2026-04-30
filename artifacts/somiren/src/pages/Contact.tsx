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

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez entrer un email valide"),
  phone: z.string().optional(),
  subject: z.string().min(1, "Veuillez sélectionner un sujet"),
  message: z.string().min(20, "Le message doit contenir au moins 20 caractères"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { subject: "" }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subject") === "investisseurs") {
      setValue("subject", "Investisseurs");
    }
  }, [setValue]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Erreur serveur");
      }
      setIsSuccess(true);
      toast.success("Message envoyé avec succès !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi, veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 pt-24">
        <section className="relative py-24 bg-[#0a0a0a] border-b border-primary/20">
          <div className="absolute inset-0 opacity-10 bg-[url('/src/assets/hero.png')] bg-cover bg-center"></div>
          <div className="container relative z-10 mx-auto px-4 md:px-8 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-serif font-bold mb-6 text-white"
            >
              Contactez Somiren S.A.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto"
            >
              Notre équipe est à votre écoute pour toute demande de partenariat, d'investissement ou d'information.
            </motion.p>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid lg:grid-cols-5 gap-12 lg:gap-24">
              
              {/* Form Side */}
              <div className="lg:col-span-3">
                {isSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card border border-primary/50 rounded-xl p-12 text-center"
                  >
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                      <Mail className="w-8 h-8 text-black" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">Merci !</h3>
                    <p className="text-gray-400 mb-8">
                      Votre message a bien été enregistré. Notre équipe vous répondra sous 48 heures ouvrées.
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => setIsSuccess(false)}
                      className="border-primary text-primary hover:bg-primary hover:text-black uppercase tracking-widest rounded-none"
                    >
                      Envoyer un autre message
                    </Button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-white/10 rounded-xl p-8 md:p-10 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">Nom complet *</label>
                        <Input 
                          {...register("name")} 
                          className="bg-black/50 border-white/20 focus-visible:ring-primary focus-visible:border-primary rounded-none" 
                          placeholder="Jean Dupont"
                        />
                        {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">Email *</label>
                        <Input 
                          {...register("email")} 
                          type="email"
                          className="bg-black/50 border-white/20 focus-visible:ring-primary focus-visible:border-primary rounded-none" 
                          placeholder="jean@entreprise.com"
                        />
                        {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">Téléphone</label>
                        <Input 
                          {...register("phone")} 
                          type="tel"
                          className="bg-black/50 border-white/20 focus-visible:ring-primary focus-visible:border-primary rounded-none" 
                          placeholder="+227 00 00 00 00"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">Sujet *</label>
                        <Select onValueChange={(val) => setValue("subject", val)} defaultValue={undefined}>
                          <SelectTrigger className="bg-black/50 border-white/20 focus:ring-primary rounded-none">
                            <SelectValue placeholder="Sélectionnez un sujet" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111] border-white/20">
                            <SelectItem value="Demande d'information">Demande d'information</SelectItem>
                            <SelectItem value="Partenariat">Partenariat</SelectItem>
                            <SelectItem value="Investisseurs">Investisseurs</SelectItem>
                            <SelectItem value="Presse">Presse</SelectItem>
                            <SelectItem value="Carrières">Carrières</SelectItem>
                            <SelectItem value="Autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.subject && <p className="text-red-500 text-xs">{errors.subject.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-300">Message *</label>
                      <Textarea 
                        {...register("message")} 
                        rows={6}
                        className="bg-black/50 border-white/20 focus-visible:ring-primary focus-visible:border-primary rounded-none resize-none" 
                        placeholder="Votre message ici..."
                      />
                      {errors.message && <p className="text-red-500 text-xs">{errors.message.message}</p>}
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-primary text-black hover:bg-primary/90 rounded-none py-6 uppercase tracking-widest font-bold"
                    >
                      {isSubmitting ? "Envoi en cours..." : "Envoyer le message"}
                    </Button>
                  </form>
                )}
              </div>

              {/* Info Side */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-card border border-white/10 rounded-xl p-8 space-y-8">
                  <h3 className="text-2xl font-serif font-bold text-white mb-6 border-b border-white/10 pb-4">Coordonnées</h3>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="mt-1 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-1">Adresse</h4>
                        <p className="text-gray-400 text-sm">Boulevard Mali Béro, Plateau<br />BP 11045 — Niamey<br />République du Niger</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="mt-1 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-1">Email</h4>
                        <a href="mailto:contact@somiren.com" className="text-primary hover:underline text-sm">contact@somiren.com</a>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="mt-1 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-1">Téléphone</h4>
                        <a href="tel:+22720734567" className="text-gray-400 hover:text-white transition-colors text-sm">+227 20 73 45 67</a>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="mt-1 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-1">Horaires</h4>
                        <p className="text-gray-400 text-sm">Lundi — Vendredi :<br />8h00 — 18h00 (GMT+1)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map */}
                <div className="bg-card border border-white/10 rounded-xl overflow-hidden h-64 relative">
                  <iframe
                    title="Siège social Somiren S.A. — Niamey, Niger"
                    src="https://maps.google.com/maps?q=Boulevard+Mali+B%C3%A9ro%2C+Plateau%2C+Niamey%2C+Niger&t=&z=14&ie=UTF8&iwloc=&output=embed"
                    className="w-full h-full"
                    style={{ border: 0, filter: "grayscale(0.4) contrast(1.05)" }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-3 left-4 text-xs font-bold text-white tracking-widest uppercase">
                    Siège Social — Niamey
                  </div>
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