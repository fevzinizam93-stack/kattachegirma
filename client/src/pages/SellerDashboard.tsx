import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import ContactPhonePicker from "@/components/ContactPhonePicker";
import { useCurrency } from "@/contexts/CurrencyContext";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Plus, Package, Pencil, Trash2, Clock, CheckCircle, XCircle,
  Upload, X, Store, ImagePlus, Loader2, MessageSquare
} from "lucide-react";
import { Link } from "wouter";

const MAX_PHOTOS = 10;

type ModerationStatus = "approved" | "pending" | "rejected";

function StatusBadge({ status }: { status: ModerationStatus }) {
  const { t } = useLanguage();
  const STATUS_LABEL: Record<ModerationStatus, { label: string; color: string; icon: React.ReactNode }> = {
    approved: { label: t.seller_moderation_approved, color: "text-green-600 bg-green-50", icon: <CheckCircle size={14} /> },
    pending: { label: t.seller_moderation_pending, color: "text-amber-600 bg-amber-50", icon: <Clock size={14} /> },
    rejected: { label: t.seller_moderation_rejected, color: "text-red-600 bg-red-50", icon: <XCircle size={14} /> },
  };
  const s = STATUS_LABEL[status] ?? STATUS_LABEL.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>
      {s.icon} {s.label}
    </span>
  );
}

/** Small button showing unread message count, links to /seller/messages */
function MessagesButton() {
  const { user } = useAuth();
  const { data } = trpc.messaging.unreadCount.useQuery(undefined, {
    refetchInterval: 15000,
    // Query runs for all authenticated users; backend returns 0 if no seller profile
    enabled: !!user,
  });
  const unread = data?.count ?? 0;
  return (
    <Link
      href="/seller/messages"
      className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <MessageSquare size={16} />
      <span className="hidden sm:inline">Сообщения</span>
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

export default function SellerDashboard() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const [, navigate] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Multi-photo state
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);

  const emptyForm = {
    name: "", slug: "", description: "", categoryId: 0,
    brand: "", price: "", originalPrice: "", discount: 0,
    stock: 1, isNew: false, contactPhone: "",
  };
  const [form, setForm] = useState(emptyForm);

  // Currency state
  const [priceCurrency, setPriceCurrency] = useState<"UZS" | "USD">("UZS");
  const [origCurrency, setOrigCurrency] = useState<"UZS" | "USD">("UZS");
  const [usdRate, setUsdRate] = useState<number>(12700);
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null);
  // Welcome popup
  const [showWelcomePopup, setShowWelcomePopup] = useState(() =>
    localStorage.getItem("seller_welcome_seen") !== "1"
  );
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const closeWelcomePopup = () => {
    if (neverShowAgain) localStorage.setItem("seller_welcome_seen", "1");
    setShowWelcomePopup(false);
  };
  const rateQuery = trpc.currency.getRate.useQuery(undefined, { staleTime: 60 * 60 * 1000 });
  useEffect(() => {
    if (rateQuery.data) {
      setUsdRate(rateQuery.data.usdToUzs);
      setRateUpdatedAt(rateQuery.data.updatedAt);
    }
  }, [rateQuery.data]);

  // Convert input to UZS string for storage
  function toUzs(val: string, currency: "UZS" | "USD"): string {
    if (!val) return "";
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return currency === "USD" ? String(Math.round(num * usdRate)) : val;
  }

  const sellerQuery = trpc.sellers.me.useQuery(undefined, { enabled: !!user });
  const categoriesQuery = trpc.categories.list.useQuery();
  const myProductsQuery = trpc.products.sellerList.useQuery(undefined, {
    enabled: !!(user && sellerQuery.data?.isApproved),
  });

  const utils = trpc.useUtils();

  const uploadMut = trpc.products.sellerUploadImage.useMutation({
    onError: (e) => toast.error("Ошибка загрузки фото: " + e.message),
  });

  const createMut = trpc.products.sellerCreate.useMutation({
    onSuccess: () => {
      toast.success(t.seller_product_sent);
      utils.products.sellerList.invalidate();
      setShowForm(false);
      setForm(emptyForm);
      setUploadedPhotos([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.products.sellerUpdate.useMutation({
    onSuccess: () => {
      toast.success(t.seller_product_updated);
      utils.products.sellerList.invalidate();
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      setUploadedPhotos([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.products.sellerDelete.useMutation({
    onSuccess: () => {
      toast.success(t.seller_product_deleted);
      utils.products.sellerList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading || sellerQuery.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!user) {
    navigate("/seller/register");
    return null;
  }

  if (!sellerQuery.data) {
    navigate("/seller/register");
    return null;
  }

  if (!sellerQuery.data.isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center max-w-md">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">{t.seller_pending_title}</h2>
          <p className="text-gray-500 text-sm">{t.seller_pending_desc}</p>
          <button onClick={() => navigate("/")} className="mt-6 text-primary text-sm font-semibold hover:underline">
            {t.seller_go_home}
          </button>
        </div>
      </div>
    );
  }

  const seller = sellerQuery.data;
  const products = myProductsQuery.data ?? [];

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_PHOTOS - uploadedPhotos.length;
    if (remaining <= 0) {
      toast.error(`Максимум ${MAX_PHOTOS} фотографий`);
      return;
    }

    const filesToUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.warning(`Загружаем первые ${remaining} фото из ${files.length}`);
    }

    setUploadingCount(prev => prev + filesToUpload.length);

    const uploadPromises = filesToUpload.map(file => {
      return new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const base64 = (ev.target?.result as string).split(",")[1];
            const result = await uploadMut.mutateAsync({
              base64,
              mimeType: file.type,
              filename: file.name,
            });
            resolve(result.url);
          } catch {
            resolve(null);
          }
        };
        reader.readAsDataURL(file);
      });
    });

    const results = await Promise.all(uploadPromises);
    const successUrls = results.filter((url): url is string => url !== null);
    setUploadedPhotos(prev => [...prev, ...successUrls]);
    setUploadingCount(prev => prev - filesToUpload.length);

    if (successUrls.length > 0) {
      toast.success(`Загружено ${successUrls.length} фото`);
    }
    // Reset file input
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  }

  function generateSlug(name: string) {
    return name.toLowerCase()
      .replace(/[а-яё]/g, c => ({ а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" }[c] ?? c))
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setUploadedPhotos([]);
    setShowForm(true);
  }

  function openEdit(p: typeof products[0]) {
    setEditId(p.id);
    setForm({
      name: p.name, slug: p.slug, description: p.description ?? "",
      categoryId: p.categoryId, brand: p.brand ?? "", price: p.price,
      originalPrice: p.originalPrice ?? "", discount: p.discount ?? 0,
      stock: p.stock ?? 1, isNew: p.isNew ?? false,
      contactPhone: (p as any).contactPhone ?? "",
    });
    // Load existing photos
    const existing: string[] = [];
    if (p.imageUrl) existing.push(p.imageUrl);
    if (p.images && Array.isArray(p.images)) {
      p.images.forEach((img: string) => { if (img && img !== p.imageUrl) existing.push(img); });
    }
    setUploadedPhotos(existing);
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.price || !form.categoryId) {
      toast.error("Название, категория и цена обязательны");
      return;
    }
    const slug = form.slug || generateSlug(form.name);
    const imageUrl = uploadedPhotos[0] ?? "";
    const images = uploadedPhotos;
    // Convert prices to UZS before saving
    const priceUzs = toUzs(form.price, priceCurrency);
    const origPriceUzs = toUzs(form.originalPrice, origCurrency);

    if (editId) {
      updateMut.mutate({ id: editId, ...form, price: priceUzs, originalPrice: origPriceUzs, imageUrl, images });
    } else {
      createMut.mutate({ ...form, slug, price: priceUzs, originalPrice: origPriceUzs, imageUrl, images });
    }
  }

  const pending = products.filter(p => p.moderationStatus === "pending").length;
  const approved = products.filter(p => p.moderationStatus === "approved").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Welcome popup */}
      {showWelcomePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Добро пожаловать в панель продавца!</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Когда вы добавляете товар, он отправляется на проверку.<br />
                <span className="font-semibold text-amber-600">Проверка занимает от 30 минут до 2 дней.</span><br />
                Как только товар будет одобрен — он появится на сайте.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mb-4 justify-center">
              <input
                type="checkbox"
                checked={neverShowAgain}
                onChange={e => setNeverShowAgain(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-gray-500">Больше не показывать</span>
            </label>
            <button
              onClick={closeWelcomePopup}
              className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Понятно, начать работу
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-xl p-2"><Store size={20} className="text-primary" /></div>
            <div>
              <p className="font-black text-gray-900 leading-tight">{seller.name}</p>
              <p className="text-xs text-gray-400">{t.seller_dashboard}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MessagesButton />
            <button
              onClick={openCreate}
              className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
            >
              <Plus size={16} /> {t.seller_add_product}
            </button>
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Всего", value: products.length, color: "text-gray-900" },
            { label: t.seller_moderation_approved, value: approved, color: "text-green-600" },
            { label: t.seller_moderation_pending, value: pending, color: "text-amber-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-xs text-amber-800">
          <b>Важно:</b>{" "}
          За каждый добавленный вами товар вы несёте полную ответственность за доставку, гарантию и возврат средств. Платформа не несёт ответственности за действия сторонних продавцов.
        </div>

        {/* Product form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-gray-900">
                {editId ? t.admin_edit_product : t.seller_add_product}
              </h3>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); setUploadedPhotos([]); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  {t.admin_product_name} *
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: generateSlug(e.target.value) }))}
                  placeholder="Например: Samsung телевизор 65 дюймов"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  {t.admin_product_category} *
                </label>
                <select
                  value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                  <option value={0}>Выберите...</option>
                  {(categoriesQuery.data ?? []).map((c: { id: number; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  {t.admin_product_brand}
                </label>
                <input
                  value={form.brand}
                  onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  placeholder="Samsung, LG, Artel..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {/* Currency rate info */}
              <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 flex items-center gap-3 text-xs text-blue-800">
                <span className="font-bold">💱 1 USD = {usdRate.toLocaleString()} сум</span>
                {rateUpdatedAt && <span className="text-blue-500">Обновлено: {new Date(rateUpdatedAt).toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
                {rateQuery.isLoading && <span className="text-blue-400">Загрузка курса...</span>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  {t.admin_product_price} *
                </label>
                <div className="flex gap-2">
                  <select
                    value={priceCurrency}
                    onChange={e => setPriceCurrency(e.target.value as "UZS" | "USD")}
                    className="border border-gray-200 rounded-xl px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-24"
                  >
                    <option value="UZS">🇺🇿 Сум</option>
                    <option value="USD">🇺🇸 USD</option>
                  </select>
                  <input
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder={priceCurrency === "USD" ? "100" : "1 270 000"}
                    type="number"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {priceCurrency === "USD" && form.price && !isNaN(parseFloat(form.price)) && (
                  <p className="text-xs text-gray-500 mt-1">≈ {(parseFloat(form.price) * usdRate).toLocaleString("ru")} сум</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  {t.admin_product_old_price} (для скидки)
                </label>
                <div className="flex gap-2">
                  <select
                    value={origCurrency}
                    onChange={e => setOrigCurrency(e.target.value as "UZS" | "USD")}
                    className="border border-gray-200 rounded-xl px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-24"
                  >
                    <option value="UZS">🇺🇿 Сум</option>
                    <option value="USD">🇺🇸 USD</option>
                  </select>
                  <input
                    value={form.originalPrice}
                    onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))}
                    placeholder={origCurrency === "USD" ? "120" : "1 524 000"}
                    type="number"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {origCurrency === "USD" && form.originalPrice && !isNaN(parseFloat(form.originalPrice)) && (
                  <p className="text-xs text-gray-500 mt-1">≈ {(parseFloat(form.originalPrice) * usdRate).toLocaleString("ru")} сум</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Скидка (%)
                </label>
                <input
                  value={form.discount}
                  onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) }))}
                  placeholder="0"
                  type="number"
                  min={0} max={99}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Количество (шт.)
                </label>
                <input
                  value={form.stock}
                  onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))}
                  type="number" min={1}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  {t.admin_product_description}
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Подробное описание товара..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Contact phone */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">Контактный телефон для покупателей</label>
                <ContactPhonePicker
                  value={form.contactPhone}
                  onChange={(phone) => setForm(f => ({ ...f, contactPhone: phone }))}
                  placeholder="+998 90 123 45 67"
                />
                <p className="text-xs text-gray-400 mt-1">Нажмите на книжку справа, чтобы выбрать из сохранённых номеров или сохранить новый</p>
              </div>

              {/* Multi-photo upload */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-2">
                  Фотографии товара ({uploadedPhotos.length}/{MAX_PHOTOS})
                </label>

                {/* Photo grid */}
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {uploadedPhotos.map((url, idx) => (
                    <div key={idx} className="relative aspect-square group">
                      <img
                        src={url}
                        alt={`Фото ${idx + 1}`}
                        className="w-full h-full object-cover rounded-xl border border-gray-200"
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                          Главное
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}

                  {/* Loading placeholders */}
                  {Array.from({ length: uploadingCount }).map((_, idx) => (
                    <div key={`loading-${idx}`} className="aspect-square bg-gray-100 rounded-xl border border-dashed border-gray-300 flex items-center justify-center">
                      <Loader2 size={20} className="text-gray-400 animate-spin" />
                    </div>
                  ))}

                  {/* Add more button */}
                  {uploadedPhotos.length + uploadingCount < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadingCount > 0}
                      className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
                    >
                      <ImagePlus size={20} />
                      <span className="text-[10px] font-medium">Добавить</span>
                    </button>
                  )}
                </div>

                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingCount > 0 || uploadedPhotos.length >= MAX_PHOTOS}
                  className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500 hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingCount > 0 ? (
                    <><Loader2 size={16} className="animate-spin" /> Загружаем {uploadingCount} фото...</>
                  ) : uploadedPhotos.length >= MAX_PHOTOS ? (
                    <><Upload size={16} /> Максимум {MAX_PHOTOS} фотографий достигнут</>
                  ) : (
                    <><Upload size={16} /> Загрузить фото (можно выбрать несколько сразу)</>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFilesChange}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Первое фото будет главным. Можно загрузить до {MAX_PHOTOS} фотографий.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSubmit}
                disabled={createMut.isPending || updateMut.isPending || uploadingCount > 0}
                className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMut.isPending || updateMut.isPending
                  ? t.seller_saving
                  : editId ? t.seller_update : t.seller_send}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); setUploadedPhotos([]); }}
                className="border border-gray-200 px-6 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t.common_cancel}
              </button>
            </div>
          </div>
        )}

        {/* Products list */}
        {myProductsQuery.isLoading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <Package size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-500">{t.seller_no_products}</p>
            <p className="text-sm text-gray-400 mt-1">{t.seller_no_products_hint}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-16 h-16 object-cover rounded-xl border border-gray-100 flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package size={24} className="text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{p.name}</p>
                  <p className="text-sm text-gray-500">{formatPrice(p.price)}</p>
                  <div className="mt-1">
                    <StatusBadge status={(p.moderationStatus ?? "pending") as ModerationStatus} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 transition-colors"
                    title={t.common_edit}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t.seller_confirm_delete)) {
                        deleteMut.mutate({ id: p.id });
                      }
                    }}
                    className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors"
                    title={t.common_delete}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
