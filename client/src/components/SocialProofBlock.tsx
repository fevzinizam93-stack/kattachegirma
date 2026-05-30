import SocialIcon from "@/components/SocialIcon";

export default function SocialProofBlock() {
  const socials = [
    {
      name: "Instagram",
      handle: "@katta.chegirma",
      followers: "930 ming",
      color: "from-purple-500 to-pink-500",
      url: "https://instagram.com/katta.chegirma",
    },
    {
      name: "Instagram",
      handle: "@texnomagister",
      followers: "787 ming",
      color: "from-orange-500 to-pink-500",
      url: "https://instagram.com/texnomagister",
    },
    {
      name: "Telegram",
      handle: "@kattachegirmauz",
      followers: "52 ming",
      color: "from-blue-400 to-blue-600",
      url: "https://t.me/kattachegirmauz",
    },
    {
      name: "TikTok",
      handle: "@katta.chegirma",
      followers: "109 ming",
      color: "from-gray-800 to-gray-900",
      url: "https://tiktok.com/@katta.chegirma",
    },
    {
      name: "YouTube",
      handle: "@katta.chegirma",
      followers: "15 mln ko'rish",
      color: "from-red-500 to-red-700",
      url: "https://youtube.com/@katta.chegirma",
    },
    {
      name: "Facebook",
      handle: "Katta.chegirma",
      followers: "128 ming",
      color: "from-blue-600 to-blue-700",
      url: "https://facebook.com/Katta.chegirma",
    },
  ];

  return (
    <section className="py-6 bg-white border-t border-gray-100">
      <div className="container">
        <div className="text-center mb-4">
          <h2 className="font-black text-lg text-gray-900">Biz ijtimoiy tarmoqlarda</h2>
          <p className="text-sm text-gray-500">2 milliondan ortiq obunachilar chegirmalarimizni kuzatib boradi</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {socials.map(s => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                <SocialIcon name={s.name} className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="text-[11px] font-black text-gray-800">{s.followers}</p>
                <p className="text-[10px] text-gray-400">{s.name}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
