import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Edit, FolderOpen, ImagePlus, MapPin, Package, Plus, Settings, ShoppingBag, Store, Trash2, Upload, Users, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuthModal } from "@/App";

function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("ru-RU").format(num) + " so'm";
}

type Tab = "products" | "categories" | "orders" | "sellers" | "settings";

interface ProductForm {
  id?: number;
  name: string;
  nameUz: string;
  slug: string;
  description: string;
  descriptionUz: string;
  categoryId: number;
  brand: string;
  price: string;
  priceUsd: string;
  originalPrice: string;
  originalPriceUsd: string;
  discount: number;
  imageUrl: string;
  images: string[]; // all images including main
  stock: number;
  isNew: boolean;
  isFeatured: boolean;
  sellerPhone: string;
  sellerTelegram: string;
  sellerName: string;
}

const emptyForm: ProductForm = {
  name: "", nameUz: "", slug: "", description: "", descriptionUz: "", categoryId: 0, brand: "",
  price: "", priceUsd: "", originalPrice: "", originalPriceUsd: "", discount: 0, imageUrl: "", images: [], stock: 0,
  isNew: false, isFeatured: false, sellerPhone: "", sellerTelegram: "", sellerName: "",
};

export default function Admin() {
  const { user, loading } = useAuth();
  const { openLogin } = useAuthModal();
  const [tab, setTab] = useState<Tab>("products");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(12700); // UZS per 1 USD

  // Category form state
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({ id: 0, name: "", slug: "", icon: "" });
  const [catEditId, setCatEditId] = useState<number | null>(null);

  // Store settings state
  const [settingsForm, setSettingsForm] = useState({
    storeName: "", description: "", phone: "", phone2: "",
    address: "", address2: "", telegram: "", instagram: "", workingHours: "",
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const utils = trpc.useUtils();

  const { data: categoriesData } = trpc.categories.list.useQuery();
  const categories = categoriesData ?? [];

  const { data: productsData, isLoading: productsLoading } = trpc.products.list.useQuery({ limit: 200, offset: 0 });
  const products = productsData?.items ?? [];

  const { data: orders, isLoading: ordersLoading } = trpc.orders.list.useQuery(undefined, {
    enabled: tab === "orders" && user?.role === "admin",
  });

  const { data: sellers, isLoading: sellersLoading } = trpc.sellers.list.useQuery(undefined, {
    enabled: tab === "sellers" && user?.role === "admin",
  });

  const { data: storeSettingsRaw } = trpc.storeSettings.getAll.useQuery(undefined, {
    enabled: tab === "settings",
  });

  // Convert array of {key, value} to object when data loads
  useEffect(() => {
    if (storeSettingsRaw && !settingsLoaded) {
      const raw = storeSettingsRaw as Record<string, string>;
      setSettingsForm({
        storeName: raw.storeName ?? "",
        description: raw.description ?? "",
        phone: raw.phone ?? "",
        phone2: raw.phone2 ?? "",
        address: raw.address ?? "",
        address2: raw.address2 ?? "",
        telegram: raw.telegram ?? "",
        instagram: raw.instagram ?? "",
        workingHours: raw.workingHours ?? "",
      });
      setSettingsLoaded(true);
    }
  }, [storeSettingsRaw, settingsLoaded]);

  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => { toast.success("Mahsulot qo'shildi!"); utils.products.list.invalidate(); setShowForm(false); setForm(emptyForm); },
    onError: (e) => toast.error("Xatolik: " + e.message),
  });

  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => { toast.success("Mahsulot yangilandi!"); utils.products.list.invalidate(); setShowForm(false); setForm(emptyForm); setEditId(null); },
    onError: (e) => toast.error("Xatolik: " + e.message),
  });

  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => { toast.success("Mahsulot o'chirildi!"); utils.products.list.invalidate(); },
    onError: (e) => toast.error("Xatolik: " + e.message),
  });

  const updateOrderStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { toast.success("Holat yangilandi!"); utils.orders.list.invalidate(); },
  });

  const approveSeller = trpc.sellers.approve.useMutation({
    onSuccess: () => { toast.success("Sotuvchi tasdiqlandi!"); utils.sellers.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const approveProduct = trpc.sellers.approveProduct.useMutation({
    onSuccess: () => { toast.success("Mahsulot tasdiqlandi!"); utils.products.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const translateProduct = trpc.products.translate.useMutation({
    onSuccess: (data) => {
      setForm(f => ({ ...f, nameUz: data.nameUz, descriptionUz: data.descriptionUz }));
      toast.success("Перевод выполнен!");
      setIsTranslating(false);
    },
    onError: (e) => {
      toast.error("Ошибка перевода: " + e.message);
      setIsTranslating(false);
    },
  });

  const handleTranslate = () => {
    if (!form.name.trim()) { toast.error("Сначала введите название на русском"); return; }
    setIsTranslating(true);
    translateProduct.mutate({ name: form.name, description: form.description || undefined });
  };

  const saveSettings = trpc.storeSettings.setMany.useMutation({
    onSuccess: () => { toast.success("Sozlamalar saqlandi!"); utils.storeSettings.getAll.invalidate(); },
    onError: (e) => toast.error("Xatolik: " + e.message),
  });

  const upsertCategory = trpc.categories.upsert.useMutation({
    onSuccess: () => {
      toast.success(catEditId ? "Категория обновлена!" : "Категория добавлена!");
      utils.categories.list.invalidate();
      setShowCatForm(false);
      setCatForm({ id: 0, name: "", slug: "", icon: "" });
      setCatEditId(null);
    },
    onError: (e) => toast.error("Ошибка: " + e.message),
  });

  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => { toast.success("Категория удалена!"); utils.categories.list.invalidate(); },
    onError: (e) => toast.error("Ошибка: " + e.message),
  });

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setForm(f => ({
        ...f,
        imageUrl: f.imageUrl || data.url, // first image becomes main
        images: [...f.images, data.url],
      }));
      toast.success("Фото загружено!");
    } catch (e: any) {
      toast.error("Ошибка загрузки: " + e.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleMultipleImageUpload = async (files: FileList) => {
    setUploadingCount(files.length);
    setImageUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append("images", f));
      const res = await fetch("/api/upload/images", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const newUrls: string[] = data.urls;
      setForm(f => ({
        ...f,
        imageUrl: f.imageUrl || newUrls[0], // first uploaded becomes main if none set
        images: [...f.images, ...newUrls],
      }));
      toast.success(`Загружено ${newUrls.length} фото!`);
    } catch (e: any) {
      toast.error("Ошибка загрузки: " + e.message);
    } finally {
      setImageUploading(false);
      setUploadingCount(0);
    }
  };

  const removeImage = (url: string) => {
    setForm(f => {
      const newImages = f.images.filter(i => i !== url);
      const newMain = f.imageUrl === url ? (newImages[0] ?? "") : f.imageUrl;
      return { ...f, images: newImages, imageUrl: newMain };
    });
  };

  const setMainImage = (url: string) => {
    setForm(f => ({ ...f, imageUrl: url }));
    toast.success("Главное фото установлено!");
  };

  if (loading) return <div className="container py-20 text-center">Yuklanmoqda...</div>;

  if (!user) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-xl font-bold mb-4">Для доступа необходимо войти</h2>
        <button onClick={openLogin} className="bg-primary text-white px-6 py-3 rounded-xl font-bold inline-block">Войти</button>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Ruxsat yo'q</h2>
        <p className="text-gray-500">Bu sahifa faqat adminlar uchun</p>
        <Link href="/" className="text-primary hover:underline mt-4 inline-block">Bosh sahifaga qaytish</Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.categoryId) {
      toast.error("Nom, narx va kategoriya majburiy");
      return;
    }
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (editId) {
      updateProduct.mutate({ id: editId, ...form, slug });
    } else {
      createProduct.mutate({ ...form, slug });
    }
  };

  const handleEdit = (p: typeof products[0]) => {
    const existingImages: string[] = (p as any).images ?? (p.imageUrl ? [p.imageUrl] : []);
    setForm({
      name: p.name, nameUz: (p as any).nameUz ?? "", slug: p.slug,
      description: p.description ?? "", descriptionUz: (p as any).descriptionUz ?? "",
      categoryId: p.categoryId, brand: p.brand ?? "", price: p.price,
      priceUsd: p.price ? String(Math.round(parseFloat(p.price) / exchangeRate)) : "",
      originalPrice: p.originalPrice ?? "",
      originalPriceUsd: p.originalPrice ? String(Math.round(parseFloat(p.originalPrice) / exchangeRate)) : "",
      discount: p.discount ?? 0,
      imageUrl: p.imageUrl ?? "", images: existingImages, stock: p.stock ?? 0,
      isNew: p.isNew ?? false, isFeatured: p.isFeatured ?? false,
      sellerPhone: (p as any).sellerPhone ?? "",
      sellerTelegram: (p as any).sellerTelegram ?? "",
      sellerName: (p as any).sellerName ?? "",
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const statusLabels: Record<string, string> = {
    pending: "Kutilmoqda", confirmed: "Tasdiqlandi", delivered: "Yetkazildi", cancelled: "Bekor qilindi"
  };
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700"
  };

  const tabConfig = [
    { key: "products" as Tab, icon: Package, label: "Товары" },
    { key: "categories" as Tab, icon: FolderOpen, label: "Категории" },
    { key: "orders" as Tab, icon: ShoppingBag, label: "Заказы" },
    { key: "sellers" as Tab, icon: Users, label: "Продавцы" },
    { key: "settings" as Tab, icon: Settings, label: "Настройки" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container py-4">
          <h1 className="text-xl font-black text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500">Xush kelibsiz, {user.name}</p>
        </div>
      </div>

      <div className="container py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabConfig.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === key ? "bg-primary text-white" : "bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"}`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* ==================== PRODUCTS TAB ==================== */}
        {tab === "products" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-lg text-gray-900">Mahsulotlar ({products.length})</h2>
              <button
                onClick={() => { setShowForm(true); setForm(emptyForm); setEditId(null); }}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                <Plus size={16} /> Qo'shish
              </button>
            </div>

            {/* Product Form Modal */}
            {showForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-5 border-b border-gray-200">
                    <h3 className="font-black text-lg">{editId ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}</h3>
                    <button onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }} className="hover:text-red-500">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1">Nomi (RU) *</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Название на русском" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Nomi (UZ)</label>
                        <input value={form.nameUz} onChange={e => setForm(f => ({ ...f, nameUz: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="O'zbek tilidagi nomi" />
                      </div>
                      {/* Auto-translate button */}
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={handleTranslate}
                          disabled={isTranslating || !form.name.trim()}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                          {isTranslating ? (
                            <>
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                              Перевожу...
                            </>
                          ) : (
                            <>
                              🌐 Автоперевод RU → UZ
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-400 mt-1">
                          {isTranslating
                            ? "Перевод занимает 5–15 секунд..."
                            : "Нажмите, чтобы автоматически заполнить поля «Название (UZ)» и «Описание (UZ)» на основе русского текста"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Kategoriya *</label>
                        <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: parseInt(e.target.value) }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                          <option value={0}>Tanlang...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Brend</label>
                        <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="SAMSUNG, LG..." />
                      </div>
                      {/* Exchange rate row */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                          <span className="text-sm font-semibold text-blue-800">💱 Курс доллара:</span>
                          <input
                            type="number"
                            value={exchangeRate}
                            onChange={e => setExchangeRate(Number(e.target.value) || 12700)}
                            className="w-28 border border-blue-300 rounded-lg px-2 py-1 text-sm font-bold text-blue-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                            min={1}
                          />
                          <span className="text-sm text-blue-700">сум за 1 USD</span>
                        </div>
                      </div>
                      {/* Price USD → UZS */}
                      <div>
                        <label className="block text-sm font-semibold mb-1">💵 Цена (USD) *</label>
                        <input
                          type="number"
                          value={form.priceUsd}
                          onChange={e => {
                            const usd = e.target.value;
                            const uzs = usd ? String(Math.round(Number(usd) * exchangeRate)) : "";
                            setForm(f => ({ ...f, priceUsd: usd, price: uzs }));
                          }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="e.g. 150"
                          min={0}
                        />
                        {form.priceUsd && (
                          <p className="text-xs text-gray-500 mt-1">= {Number(form.price).toLocaleString("ru-RU")} so'm</p>
                        )}
                      </div>
                      {/* Original price USD → UZS */}
                      <div>
                        <label className="block text-sm font-semibold mb-1">💵 Старая цена (USD)</label>
                        <input
                          type="number"
                          value={form.originalPriceUsd}
                          onChange={e => {
                            const usd = e.target.value;
                            const uzs = usd ? String(Math.round(Number(usd) * exchangeRate)) : "";
                            setForm(f => ({ ...f, originalPriceUsd: usd, originalPrice: uzs }));
                          }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="e.g. 200"
                          min={0}
                        />
                        {form.originalPriceUsd && (
                          <p className="text-xs text-gray-500 mt-1">= {Number(form.originalPrice).toLocaleString("ru-RU")} so'm</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Chegirma (%)</label>
                        <input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: parseInt(e.target.value) || 0 }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="20" min={0} max={99} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Ombordagi soni</label>
                        <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="10" min={0} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold mb-1">Фотографии товара ({form.images.length}/10)</label>
                        {/* Image gallery */}
                        {form.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {form.images.map((url, idx) => (
                              <div key={idx} className="relative group">
                                <img
                                  src={url}
                                  alt={`Фото ${idx + 1}`}
                                  className={`w-20 h-20 rounded-lg object-cover border-2 cursor-pointer transition-all ${
                                    form.imageUrl === url ? 'border-primary ring-2 ring-primary/30' : 'border-gray-200 hover:border-primary/50'
                                  }`}
                                  onClick={() => setMainImage(url)}
                                  title="Нажмите чтобы сделать главным"
                                />
                                {form.imageUrl === url && (
                                  <span className="absolute top-1 left-1 bg-primary text-white text-xs px-1 py-0.5 rounded font-bold">Главное</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeImage(url)}
                                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Upload button */}
                        {form.images.length < 10 && (
                          <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 rounded-lg px-3 py-3 text-sm cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors ${imageUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={e => {
                                const files = e.target.files;
                                if (!files || files.length === 0) return;
                                if (files.length === 1) {
                                  handleImageUpload(files[0]);
                                } else {
                                  handleMultipleImageUpload(files);
                                }
                                e.target.value = "";
                              }}
                            />
                            <Upload size={16} className="text-gray-400" />
                            <span className="text-gray-500">
                              {imageUploading
                                ? `Загрузка${uploadingCount > 1 ? ` ${uploadingCount} фото` : ''}...`
                                : 'Добавить фото (можно выбрать несколько)'}
                            </span>
                          </label>
                        )}
                        {form.images.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">Нажмите на фото чтобы сделать его главным · Обведение — главное фото</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold mb-1">Tavsif (RU)</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Описание на русском..." />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold mb-1">Tavsif (UZ)</label>
                        <textarea value={form.descriptionUz} onChange={e => setForm(f => ({ ...f, descriptionUz: e.target.value }))}
                          rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="O'zbek tilidagi tavsif..." />
                      </div>
                      {/* Seller info */}
                      <div className="col-span-2 border-t border-gray-100 pt-3">
                        <p className="text-sm font-bold text-gray-700 mb-3">Sotuvchi ma'lumotlari</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Sotuvchi ismi</label>
                        <input value={form.sellerName} onChange={e => setForm(f => ({ ...f, sellerName: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Do'kon nomi" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Sotuvchi telefoni</label>
                        <input value={form.sellerPhone} onChange={e => setForm(f => ({ ...f, sellerPhone: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="+998 90 123 45 67" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold mb-1">Sotuvchi Telegram</label>
                        <input value={form.sellerTelegram} onChange={e => setForm(f => ({ ...f, sellerTelegram: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="@username" />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={form.isNew} onChange={e => setForm(f => ({ ...f, isNew: e.target.checked }))} className="rounded" />
                          Yangi
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} className="rounded" />
                          Tavsiya etilgan
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={createProduct.isPending || updateProduct.isPending}
                        className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
                        {editId ? "Saqlash" : "Qo'shish"}
                      </button>
                      <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}
                        className="px-6 border border-gray-200 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                        Bekor
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Products table */}
            {productsLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">Yuklanmoqda...</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Mahsulot</th>
                        <th className="text-left px-4 py-3 font-semibold">Narx</th>
                        <th className="text-left px-4 py-3 font-semibold">Ombor</th>
                        <th className="text-left px-4 py-3 font-semibold">Holat</th>
                        <th className="text-right px-4 py-3 font-semibold">Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                              </div>
                              <div>
                                <p className="font-semibold line-clamp-1">{p.name}</p>
                                <p className="text-xs text-gray-400">{p.brand}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-primary">{formatPrice(p.price)}</p>
                            <p className="text-xs text-gray-500 font-medium">${Math.round(parseFloat(p.price) / exchangeRate)}</p>
                            {p.discount ? <p className="text-xs text-gray-400">-{p.discount}%</p> : null}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${(p.stock ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {p.stock ?? 0} ta
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {(p as any).isApproved === false && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Tekshirilmoqda</span>}
                              {p.isFeatured && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Tavsiya</span>}
                              {p.isNew && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Yangi</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {(p as any).isApproved === false && (
                                <button onClick={() => approveProduct.mutate({ id: p.id })}
                                  className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 transition-colors font-semibold">
                                  Tasdiqlash
                                </button>
                              )}
                              <button onClick={() => handleEdit(p)} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                                <Edit size={15} />
                              </button>
                              <button onClick={() => { if (confirm("O'chirishni tasdiqlaysizmi?")) deleteProduct.mutate({ id: p.id }); }}
                                className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== CATEGORIES TAB ==================== */}
        {tab === "categories" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-lg text-gray-900">Категории ({categories.length})</h2>
              <button
                onClick={() => { setShowCatForm(true); setCatForm({ id: 0, name: "", slug: "", icon: "" }); setCatEditId(null); }}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                <Plus size={16} /> Добавить
              </button>
            </div>

            {/* Category Form Modal */}
            {showCatForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md">
                  <div className="flex items-center justify-between p-5 border-b border-gray-200">
                    <h3 className="font-black text-lg">{catEditId ? "Редактировать категорию" : "Новая категория"}</h3>
                    <button onClick={() => { setShowCatForm(false); setCatEditId(null); }} className="hover:text-red-500"><X size={20} /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Название *</label>
                      <input
                        value={catForm.name}
                        onChange={e => {
                          const name = e.target.value;
                          const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\u0400-\u04ff-]/g, "").replace(/[\u0400-\u04ff]/g, c => c.charCodeAt(0).toString(36));
                          setCatForm(f => ({ ...f, name, slug: f.slug || slug }));
                        }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Например: Холодильники"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Slug (URL)</label>
                      <input
                        value={catForm.slug}
                        onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="holodilniki"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Иконка (эмодзи)</label>
                      <input
                        value={catForm.icon}
                        onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="❄️"
                      />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => {
                          if (!catForm.name || !catForm.slug) { toast.error("Название и slug обязательны"); return; }
                          upsertCategory.mutate(catEditId ? { id: catEditId, name: catForm.name, slug: catForm.slug, icon: catForm.icon } : catForm);
                        }}
                        disabled={upsertCategory.isPending}
                        className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {catEditId ? "Сохранить" : "Добавить"}
                      </button>
                      <button
                        onClick={() => { setShowCatForm(false); setCatEditId(null); }}
                        className="px-6 border border-gray-200 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Categories table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {categories.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <FolderOpen size={40} className="mx-auto mb-3 opacity-40" />
                  <p>Категорий нет</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">#</th>
                      <th className="text-left px-4 py-3 font-semibold">Название</th>
                      <th className="text-left px-4 py-3 font-semibold">Slug</th>
                      <th className="text-left px-4 py-3 font-semibold">Иконка</th>
                      <th className="text-right px-4 py-3 font-semibold">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{cat.id}</td>
                        <td className="px-4 py-3 font-semibold">{cat.name}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cat.slug}</td>
                        <td className="px-4 py-3 text-xl">{cat.icon ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setCatForm({ id: cat.id, name: cat.name, slug: cat.slug, icon: cat.icon ?? "" });
                                setCatEditId(cat.id);
                                setShowCatForm(true);
                              }}
                              className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => { if (confirm("Удалить категорию \"" + cat.name + "\"?")) deleteCategory.mutate({ id: cat.id }); }}
                              className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ==================== ORDERS TAB ==================== */}
        {tab === "orders" && (
          <div>
            <h2 className="font-black text-lg mb-4 text-gray-900">Buyurtmalar ({orders?.length ?? 0})</h2>
            {ordersLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">Yuklanmoqda...</div>
            ) : !orders || orders.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Buyurtma yo'q</div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-black text-gray-900">Buyurtma #{order.id}</p>
                        <p className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleString("ru-RU")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColors[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                        <select
                          value={order.status}
                          onChange={e => updateOrderStatus.mutate({ id: order.id, status: e.target.value as any })}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                        >
                          <option value="pending">Kutilmoqda</option>
                          <option value="confirmed">Tasdiqlash</option>
                          <option value="delivered">Yetkazildi</option>
                          <option value="cancelled">Bekor qilish</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p><strong>Mijoz:</strong> {order.customerName}</p>
                        <p><strong>Tel:</strong> {order.customerPhone}</p>
                        <p><strong>Manzil:</strong> {order.deliveryAddress}</p>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Mahsulotlar:</p>
                        {(order.items as any[]).map((item, i) => (
                          <p key={i} className="text-xs text-gray-400">{item.name} × {item.quantity} — {formatPrice(item.price * item.quantity)}</p>
                        ))}
                        <p className="font-black text-primary mt-1">Jami: {formatPrice(parseFloat(order.totalAmount))}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== SELLERS TAB ==================== */}
        {tab === "sellers" && (
          <div>
            <h2 className="font-black text-lg mb-4 text-gray-900">Sotuvchilar ({sellers?.length ?? 0})</h2>
            {sellersLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">Yuklanmoqda...</div>
            ) : !sellers || sellers.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                <Users size={40} className="mx-auto mb-3 opacity-40" />
                <p>Hali sotuvchi yo'q</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sellers.map(seller => (
                  <div key={seller.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Store size={20} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{seller.name}</p>
                          <p className="text-sm text-gray-500">{seller.phone}</p>
                          {seller.telegram && <p className="text-xs text-blue-600">{seller.telegram}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {seller.isApproved ? (
                          <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full">Tasdiqlangan</span>
                        ) : (
                          <>
                            <button
                              onClick={() => approveSeller.mutate({ id: seller.id })}
                              className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                            >
                              Tasdiqlash
                            </button>
                            <button
                              onClick={() => { if (confirm("Sotuvchini rad etasizmi?")) approveSeller.mutate({ id: seller.id }); }}
                              className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              Rad etish
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {seller.description && (
                      <p className="text-sm text-gray-500 mt-2 ml-13">{seller.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== SETTINGS TAB ==================== */}
        {tab === "settings" && (
          <div className="max-w-2xl">
            <h2 className="font-black text-lg mb-5 text-gray-900">Do'kon sozlamalari</h2>
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
              {/* Store name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Do'kon nomi</label>
                <input
                  value={settingsForm.storeName}
                  onChange={e => setSettingsForm(f => ({ ...f, storeName: e.target.value }))}
                  placeholder="Katta Chegirma"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Tavsif</label>
                <textarea
                  value={settingsForm.description}
                  onChange={e => setSettingsForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Do'kon haqida qisqacha ma'lumot..."
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Phone numbers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Telefon 1</label>
                  <input
                    value={settingsForm.phone}
                    onChange={e => setSettingsForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+998 90 123 45 67"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Telefon 2</label>
                  <input
                    value={settingsForm.phone2}
                    onChange={e => setSettingsForm(f => ({ ...f, phone2: e.target.value }))}
                    placeholder="+998 91 234 56 78"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Addresses */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary" />
                  Manzil 1
                </label>
                <input
                  value={settingsForm.address}
                  onChange={e => setSettingsForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Toshkent, Chilonzor tumani, ..."
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary" />
                  Manzil 2 (ixtiyoriy)
                </label>
                <input
                  value={settingsForm.address2}
                  onChange={e => setSettingsForm(f => ({ ...f, address2: e.target.value }))}
                  placeholder="Ikkinchi manzil (ixtiyoriy)"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Social */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Telegram</label>
                  <input
                    value={settingsForm.telegram}
                    onChange={e => setSettingsForm(f => ({ ...f, telegram: e.target.value }))}
                    placeholder="@kattachegirma"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Instagram</label>
                  <input
                    value={settingsForm.instagram}
                    onChange={e => setSettingsForm(f => ({ ...f, instagram: e.target.value }))}
                    placeholder="@kattachegirma"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Working hours */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Ish vaqti</label>
                <input
                  value={settingsForm.workingHours}
                  onChange={e => setSettingsForm(f => ({ ...f, workingHours: e.target.value }))}
                  placeholder="Dushanba - Shanba: 9:00 - 20:00"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <button
                onClick={() => saveSettings.mutate(settingsForm)}
                disabled={saveSettings.isPending}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saveSettings.isPending ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
