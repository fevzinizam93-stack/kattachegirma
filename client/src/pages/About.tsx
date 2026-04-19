import { trpc } from "@/lib/trpc";
import { MapPin, Phone, Clock, Instagram, Send } from "lucide-react";
import { Link } from "wouter";

export default function About() {
  const { data: settings } = trpc.storeSettings.getAll.useQuery();
  const s = (settings as Record<string, string>) ?? {};

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-primary text-white py-12">
        <div className="container text-center">
          <h1 className="text-3xl font-black mb-2">Biz haqimizda</h1>
          <p className="text-white/80 text-lg">Katta Chegirma - Texnomagister</p>
        </div>
      </div>

      <div className="container py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Description + Photos */}
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-4">Do'konimiz haqida</h2>
            {s.description ? (
              <p className="text-gray-600 leading-relaxed text-lg mb-6">{s.description}</p>
            ) : (
              <div className="space-y-4 text-gray-600 leading-relaxed mb-6">
                <p>
                  <strong className="text-gray-900">Katta Chegirma</strong> — bu sifatli maishiy texnika va elektronika mahsulotlarini eng qulay narxlarda taqdim etuvchi do'kon.
                </p>
                <p>
                  Biz mijozlarimizga eng yaxshi brendlarning mahsulotlarini — Samsung, LG, Bosch, Beko, Ariston va boshqalarni — keng assortimentda taklif etamiz.
                </p>
                <p>
                  Do'konimizda siz har doim katta chegirmalar va maxsus takliflarni topishingiz mumkin. Bizning maqsadimiz — har bir oilaga sifatli texnikani arzon narxda yetkazib berish.
                </p>
              </div>
            )}

            {/* Photo gallery placeholder */}
            <div className="grid grid-cols-2 gap-3">
              <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <div className="text-3xl mb-1">🏪</div>
                  <p>Do'kon rasmi</p>
                </div>
              </div>
              <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <div className="text-3xl mb-1">📸</div>
                  <p>Galereya</p>
                </div>
              </div>
              <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <div className="text-3xl mb-1">🛒</div>
                  <p>Mahsulotlar</p>
                </div>
              </div>
              <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <div className="text-3xl mb-1">⭐</div>
                  <p>Mijozlar</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Rasmlar tez orada qo'shiladi</p>
          </div>

          {/* Right: Contact info */}
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-gray-900">Bog'lanish</h2>

            {/* Phone */}
            {(s.phone || s.phone2) && (
              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Phone size={18} className="text-primary" />
                  <span className="font-bold text-gray-900">Telefon</span>
                </div>
                {s.phone && (
                  <a href={`tel:${s.phone}`} className="block text-lg font-semibold text-primary hover:underline mb-1">
                    {s.phone}
                  </a>
                )}
                {s.phone2 && (
                  <a href={`tel:${s.phone2}`} className="block text-lg font-semibold text-primary hover:underline">
                    {s.phone2}
                  </a>
                )}
              </div>
            )}

            {/* Address */}
            {(s.address || s.address2) && (
              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={18} className="text-primary" />
                  <span className="font-bold text-gray-900">Manzil</span>
                </div>
                {s.address && <p className="text-gray-700 mb-1">{s.address}</p>}
                {s.address2 && <p className="text-gray-700">{s.address2}</p>}
              </div>
            )}

            {/* Working hours */}
            {s.workingHours && (
              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={18} className="text-primary" />
                  <span className="font-bold text-gray-900">Ish vaqti</span>
                </div>
                <p className="text-gray-700">{s.workingHours}</p>
              </div>
            )}

            {/* Social */}
            {(s.telegram || s.instagram) && (
              <div className="bg-gray-50 rounded-2xl p-5">
                <p className="font-bold text-gray-900 mb-3">Ijtimoiy tarmoqlar</p>
                <div className="flex gap-3">
                  {s.telegram && (
                    <a
                      href={`https://t.me/${s.telegram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-blue-600 transition-colors"
                    >
                      <Send size={15} /> Telegram
                    </a>
                  )}
                  {s.instagram && (
                    <a
                      href={`https://instagram.com/${s.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                      <Instagram size={15} /> Instagram
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* No settings yet */}
            {!s.phone && !s.address && !s.telegram && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-center">
                <p className="text-yellow-700 text-sm">
                  Kontakt ma'lumotlari hali qo'shilmagan.{" "}
                  <Link href="/admin" className="font-bold underline">Admin panelida</Link>{" "}
                  sozlamalarni to'ldiring.
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
              <p className="font-bold text-gray-900 mb-3">Mahsulotlarni ko'rish</p>
              <Link href="/catalog" className="inline-block bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors text-sm">
                Katalogga o'tish
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
