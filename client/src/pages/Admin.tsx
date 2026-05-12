import { useAuth } from "@/_core/hooks/useAuth";
import ContactPhonePicker from "@/components/ContactPhonePicker";
import { trpc } from "@/lib/trpc";
import { BarChart3, Bell, Crown, Edit, FolderOpen, ImagePlus, MapPin, MessageSquare, Package, Plus, Search, Send, Settings, ShoppingBag, Star, Store, Trash2, Upload, Users, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuthModal } from "@/App";

function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("ru-RU").format(num) + " сум";
}

/** Lists all approved sellers so admin can start a conversation */
function AllSellersList({ onSelect, activeSellerUserId }: { onSelect: (sellerUserId: number) => void; activeSellerUserId: number | null }) {
  const { data, isLoading } = trpc.sellers.list.useQuery();
  if (isLoading) return <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /></div>;
  const sellers = (data ?? []).filter((s) => s.isApproved);
  if (sellers.length === 0) return <p className="text-xs text-gray-400 px-2 py-2">Нет одобренных продавцов</p>;
  return (
    <>
      {sellers.map((seller) => (
        <button
          key={seller.id}
          onClick={() => seller.userId !== null && onSelect(seller.userId)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
            activeSellerUserId === seller.userId ? "bg-red-50 text-red-700" : "hover:bg-gray-50 text-gray-700"
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
            {(seller.name ?? "П")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{seller.name}</p>
            <p className="text-xs text-gray-400">Продавец</p>
          </div>
        </button>
      ))}
    </>
  );
}

type Tab = "products" | "categories" | "orders" | "sellers" | "moderation" | "settings" | "banners" | "notifications" | "utm" | "vip" | "messaging";

interface BannerForm {
  id?: number;
  title: string;
  titleUz: string;
  description: string;
  descriptionUz: string;
  bgColor: string;
  textColor: string;
  link: string;
  linkText: string;
  linkTextUz: string;
  endsAt: string; // ISO date string for input[type=datetime-local]
  isActive: boolean;
  sortOrder: number;
}

const emptyBannerForm: BannerForm = {
  title: "", titleUz: "", description: "", descriptionUz: "",
  bgColor: "#dc2626", textColor: "#ffffff",
  link: "", linkText: "", linkTextUz: "",
  endsAt: "", isActive: true, sortOrder: 0,
};

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
  isHit: boolean;
  isPremium: boolean;
  hitOrder: number;
  costPrice: string;
  stockCount: string;
  discountEndsAt: string;
  sellerPhone: string;
  sellerTelegram: string;
  sellerName: string;
  contactPhone: string;
}

const emptyForm: ProductForm = {
  name: "", nameUz: "", slug: "", description: "", descriptionUz: "", categoryId: 0, brand: "",
  price: "", priceUsd: "", originalPrice: "", originalPriceUsd: "", discount: 0, imageUrl: "", images: [], stock: 0,
  isNew: false, isFeatured: false, isHit: false, isPremium: false, hitOrder: 0, costPrice: "", stockCount: "", discountEndsAt: "", sellerPhone: "", sellerTelegram: "", sellerName: "", contactPhone: "",
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
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null);
  const [adminSearch, setAdminSearch] = useState("");
  const rateQuery = trpc.currency.getRate.useQuery(undefined, { staleTime: 60 * 60 * 1000 });
  useEffect(() => {
    if (rateQuery.data) {
      setExchangeRate(rateQuery.data.usdToUzs);
      setRateUpdatedAt(rateQuery.data.updatedAt);
    }
  }, [rateQuery.data]);

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

  // Banner state
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bannerForm, setBannerForm] = useState<BannerForm>(emptyBannerForm);
  const [bannerEditId, setBannerEditId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: categoriesData } = trpc.categories.list.useQuery();
  const categories = categoriesData ?? [];

  const { data: productsData, isLoading: productsLoading } = trpc.products.adminList.useQuery({ limit: 500, offset: 0 });
  const products = productsData?.items ?? [];
  const filteredProducts = adminSearch.trim()
    ? products.filter(p => {
        const q = adminSearch.toLowerCase().trim();
        const name = (p.name ?? "").toLowerCase();
        const nameUz = ((p as any).nameUz ?? "").toLowerCase();
        const brand = (p.brand ?? "").toLowerCase();
        const slug = (p.slug ?? "").toLowerCase();
        return name.includes(q) || nameUz.includes(q) || brand.includes(q) || slug.includes(q);
      })
    : products;

  const { data: orders, isLoading: ordersLoading } = trpc.orders.list.useQuery(undefined, {
    enabled: tab === "orders" && user?.role === "admin",
  });

  const { data: sellers, isLoading: sellersLoading } = trpc.sellers.list.useQuery(undefined, {
    enabled: tab === "sellers" && user?.role === "admin",
  });

  const { data: storeSettingsRaw } = trpc.storeSettings.getAll.useQuery(undefined, {
    enabled: tab === "settings",
  });

  const { data: bannersData, isLoading: bannersLoading } = trpc.banners.listAll.useQuery(undefined, {
    enabled: tab === "banners" && user?.role === "admin",
  });
  const allBanners = bannersData ?? [];

  // Moderation
  const { data: pendingProductsData, isLoading: pendingLoading } = trpc.sellers.pendingProducts.useQuery(undefined, {
    enabled: tab === "moderation" && user?.role === "admin",
  });
  const pendingProducts = pendingProductsData ?? [];

  const approveProductMut = trpc.sellers.approveProduct.useMutation({
    onSuccess: () => { utils.sellers.pendingProducts.invalidate(); toast.success("Товар одобрен!"); },
    onError: (e) => toast.error(e.message),
  });
  const rejectProductMut = trpc.sellers.rejectProduct.useMutation({
    onSuccess: () => { utils.sellers.pendingProducts.invalidate(); toast.success("Товар отклонён"); },
    onError: (e) => toast.error(e.message),
  });

  // VIP management
  const [vipSearch, setVipSearch] = useState("");
  const [vipEmailOrPhone, setVipEmailOrPhone] = useState("");
  const [vipExpiresAt, setVipExpiresAt] = useState("");
  const { data: vipUsersData, isLoading: vipLoading } = trpc.vip.listUsers.useQuery(undefined, {
    enabled: tab === "vip" && user?.role === "admin",
  });
  const vipUsers = vipUsersData ?? [];
  const grantVipMut = trpc.vip.grantAccess.useMutation({
    onSuccess: (data) => {
      utils.vip.listUsers.invalidate();
      setVipEmailOrPhone("");
      setVipExpiresAt("");
      toast.success(`VIP доступ выдан: ${data.name ?? data.email}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const revokeVipMut = trpc.vip.revokeAccess.useMutation({
    onSuccess: () => { utils.vip.listUsers.invalidate(); toast.success("VIP доступ отозван"); },
    onError: (e) => toast.error(e.message),
  });

  // Messaging
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [msgInput, setMsgInput] = useState("");
  const { data: adminConvs, refetch: refetchConvs } = trpc.messaging.adminConversations.useQuery(undefined, {
    enabled: tab === "messaging" && user?.role === "admin",
    refetchInterval: tab === "messaging" ? 8000 : false,
  });
  const openConvMut = trpc.messaging.openConversation.useMutation({
    onSuccess: (data) => {
      setActiveConvId(data.conversation.id);
      refetchConvs();
    },
  });
  const sendMsgMut = trpc.messaging.send.useMutation({
    onSuccess: () => {
      setMsgInput("");
      if (activeConvId) openConvMut.mutate({ sellerUserId: activeConvSellerUserId! });
    },
  });
  const [activeConvSellerUserId, setActiveConvSellerUserId] = useState<number | null>(null);
  const [activeConvMessages, setActiveConvMessages] = useState<Array<{ id: number; senderId: number; body: string; createdAt: Date; isRead: boolean }>>([]);
  const [activeConvData, setActiveConvData] = useState<{ conversation: { id: number; adminId: number; sellerId: number } | null; messages: Array<{ id: number; senderId: number; body: string; createdAt: Date; isRead: boolean }> } | null>(null);
  // When openConvMut succeeds, update messages
  const openConvForSeller = async (sellerUserId: number) => {
    setActiveConvSellerUserId(sellerUserId);
    const result = await openConvMut.mutateAsync({ sellerUserId });
    setActiveConvData(result);
    setActiveConvMessages(result.messages);
  };
  const handleSendMsg = async () => {
    if (!msgInput.trim() || !activeConvData?.conversation) return;
    await sendMsgMut.mutateAsync({ conversationId: activeConvData.conversation.id, body: msgInput.trim() });
    // Refresh messages
    const result = await openConvMut.mutateAsync({ sellerUserId: activeConvSellerUserId! });
    setActiveConvData(result);
    setActiveConvMessages(result.messages);
  };

  // UTM stats
  const [utmDays, setUtmDays] = useState(30);
  const { data: utmStats, isLoading: utmLoading } = trpc.utm.getStats.useQuery(
    { days: utmDays },
    { enabled: tab === "utm" && user?.role === "admin" }
  );

  // Telegram recipients
  const { data: telegramRecipientsData, isLoading: telegramLoading } = trpc.telegram.listRecipients.useQuery(undefined, {
    enabled: tab === "notifications" && user?.role === "admin",
  });
  const telegramRecipients = telegramRecipientsData ?? [];
  const [newRecipientChatId, setNewRecipientChatId] = useState("");
  const [newRecipientName, setNewRecipientName] = useState("");
  const addRecipientMut = trpc.telegram.addRecipient.useMutation({
    onSuccess: () => { utils.telegram.listRecipients.invalidate(); setNewRecipientChatId(""); setNewRecipientName(""); toast.success("Получатель добавлен"); },
    onError: (e) => toast.error(e.message),
  });
  const toggleRecipientMut = trpc.telegram.toggleRecipient.useMutation({
    onSuccess: () => utils.telegram.listRecipients.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const deleteRecipientMut = trpc.telegram.deleteRecipient.useMutation({
    onSuccess: () => { utils.telegram.listRecipients.invalidate(); toast.success("Получатель удалён"); },
    onError: (e) => toast.error(e.message),
  });
  const { data: webhookInfo } = trpc.telegram.getWebhookInfo.useQuery(undefined, {
    enabled: tab === "notifications" && user?.role === "admin",
  });
  const registerWebhookMut = trpc.telegram.registerWebhook.useMutation({
    onSuccess: (data) => toast.success(`Webhook зарегистрирован: ${data.webhookUrl}`),
    onError: (e) => toast.error(e.message),
  });

  const createBannerMut = trpc.banners.create.useMutation({
    onSuccess: () => { utils.banners.listAll.invalidate(); setShowBannerForm(false); setBannerForm(emptyBannerForm); setBannerEditId(null); toast.success("Баннер создан"); },
    onError: (e) => toast.error(e.message),
  });
  const updateBannerMut = trpc.banners.update.useMutation({
    onSuccess: () => { utils.banners.listAll.invalidate(); setShowBannerForm(false); setBannerForm(emptyBannerForm); setBannerEditId(null); toast.success("Баннер обновлён"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteBannerMut = trpc.banners.delete.useMutation({
    onSuccess: () => { utils.banners.listAll.invalidate(); toast.success("Баннер удалён"); },
    onError: (e) => toast.error(e.message),
  });

  function handleBannerSubmit() {
    const endsAt = bannerForm.endsAt ? new Date(bannerForm.endsAt) : undefined;
    if (bannerEditId) {
      updateBannerMut.mutate({ id: bannerEditId, ...bannerForm, endsAt });
    } else {
      createBannerMut.mutate({ ...bannerForm, endsAt });
    }
  }

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
    onSuccess: () => { toast.success("Товар добавлен!"); utils.products.list.invalidate(); setShowForm(false); setForm(emptyForm); },
    onError: (e) => toast.error("Ошибка: " + e.message),
  });
  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => { toast.success("Товар обновлён!"); utils.products.list.invalidate(); setShowForm(false); setForm(emptyForm); setEditId(null); },
    onError: (e) => toast.error("Ошибка: " + e.message),
  });
  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => { toast.success("Товар удалён!"); utils.products.list.invalidate(); },
    onError: (e) => toast.error("Ошибка: " + e.message),
  });
  const toggleActive = trpc.products.toggleActive.useMutation({
    onSuccess: (_data, vars) => {
      toast.success(vars.isActive ? "Товар включён в каталог" : "Товар скрыт с сайта");
      utils.products.adminList.invalidate();
    },
    onError: (e) => toast.error("Ошибка: " + e.message),
  });
  const updateOrderStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { toast.success("Статус обновлён!"); utils.orders.list.invalidate(); },
  });

  const approveSeller = trpc.sellers.approve.useMutation({
    onSuccess: () => { toast.success("Продавец одобрен!"); utils.sellers.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const blockSeller = trpc.sellers.blockSeller.useMutation({
    onSuccess: (_data, vars) => {
      toast.success(vars.blocked ? "Продавец заблокирован" : "Продавец разблокирован");
      utils.sellers.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const approveProduct = trpc.sellers.approveProduct.useMutation({
    onSuccess: () => { toast.success("Товар одобрен!"); utils.products.list.invalidate(); },
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
    onSuccess: () => { toast.success("Настройки сохранены!"); utils.storeSettings.getAll.invalidate(); },
    onError: (e) => toast.error("Ошибка: " + e.message),
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

  if (loading) return <div className="container py-20 text-center">Загрузка...</div>;

  if (!user) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-xl font-bold mb-4">Для доступа необходимо войти</h2>
        <button onClick={() => openLogin()} className="bg-primary text-white px-6 py-3 rounded-xl font-bold inline-block">Войти</button>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Нет доступа</h2>
        <p className="text-gray-500">Эта страница только для администраторов</p>
        <Link href="/" className="text-primary hover:underline mt-4 inline-block">Вернуться на главную</Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.categoryId) {
      toast.error("Название, цена и категория обязательны");
      return;
    }
    // Transliterate Cyrillic and generate safe slug; fallback to timestamp if result is empty
    const cyrMap: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
    const translit = (s: string) => s.toLowerCase().split("").map(c => cyrMap[c] ?? c).join("");
    const rawSlug = translit(form.name).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const slug = form.slug || rawSlug || `product-${Date.now()}`;
    const stockCountNum = form.stockCount !== "" ? parseInt(form.stockCount) : undefined;
    if (editId) {
      updateProduct.mutate({ id: editId, ...form, slug, stockCount: stockCountNum });
    } else {
      createProduct.mutate({ ...form, slug, stockCount: stockCountNum });
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
      isNew: p.isNew ?? false, isFeatured: p.isFeatured ?? false, isHit: (p as any).isHit ?? false, isPremium: (p as any).isPremium ?? false, hitOrder: (p as any).hitOrder ?? 0,
      costPrice: (p as any).costPrice ? String((p as any).costPrice) : "",
      stockCount: (p as any).stockCount != null ? String((p as any).stockCount) : "",
      discountEndsAt: (p as any).discountEndsAt ? new Date((p as any).discountEndsAt).toISOString().slice(0, 16) : "",
      sellerPhone: (p as any).sellerPhone ?? "",
      sellerTelegram: (p as any).sellerTelegram ?? "",
      sellerName: (p as any).sellerName ?? "",
      contactPhone: (p as any).contactPhone ?? "",
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const statusLabels: Record<string, string> = {
    pending: "Ожидает", confirmed: "Подтверждён", delivered: "Доставлен", cancelled: "Отменён"
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
    { key: "moderation" as Tab, icon: Store, label: `Модерация${pendingProducts.length > 0 ? ` (${pendingProducts.length})` : ""}` },
    { key: "banners" as Tab, icon: ImagePlus, label: "Баннеры" },
    { key: "notifications" as Tab, icon: Bell, label: "Уведомления" },
    { key: "utm" as Tab, icon: MapPin, label: "Источники трафика" },
    { key: "vip" as Tab, icon: Crown, label: "VIP" },
    { key: "settings" as Tab, icon: Settings, label: "Настройки" },
    { key: "messaging" as Tab, icon: MessageSquare, label: `Сообщения${(adminConvs ?? []).reduce((s, c) => s + c.unread, 0) > 0 ? ` (${(adminConvs ?? []).reduce((s, c) => s + c.unread, 0)})` : ""}` },
  ];

  return (
    <div className="min-h-screen bg-gray-50" translate="no">
      <div className="bg-white border-b border-gray-200">
        <div className="container py-4">
          <h1 className="text-xl font-black text-gray-900">Панель администратора</h1>
          <p className="text-sm text-gray-500">Добро пожаловать, {user.name}</p>
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
          <Link href="/admin/analytics">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors bg-white border border-gray-200 hover:bg-gray-50 text-gray-700">
              <BarChart3 size={16} /> Аналитика
            </button>
          </Link>
          <Link href="/admin/reviews">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors bg-white border border-gray-200 hover:bg-gray-50 text-gray-700">
              <Star size={16} /> Отзывы
            </button>
          </Link>
        </div>

        {/* ==================== PRODUCTS TAB ==================== */}
        {tab === "products" && (
          <div>
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex justify-between items-center">
                <h2 className="font-black text-lg text-gray-900">
                  Товары ({adminSearch.trim() ? `${filteredProducts.length} / ${products.length}` : products.length})
                </h2>
                <button
                  onClick={() => { setShowForm(true); setForm(emptyForm); setEditId(null); }}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  <Plus size={16} /> Добавить
                </button>
              </div>
              {/* Admin product search bar */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                  placeholder="Поиск по названию, бренду, модели..."
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50 placeholder:text-gray-400"
                />
                {adminSearch && (
                  <button
                    onClick={() => setAdminSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {adminSearch.trim() && filteredProducts.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">Ничего не найдено по запросу «{adminSearch}»</p>
              )}
            </div>

            {/* Product Form Modal */}
            {showForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-5 border-b border-gray-200">
                    <h3 className="font-black text-lg">{editId ? "Редактировать товар" : "Новый товар"}</h3>
                    <button onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }} className="hover:text-red-500">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1">Название (русский) *</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Название на русском" />
                        {form.name && (() => {
                          const cm: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
                          const autoSlug = form.name.toLowerCase().split("").map(c => cm[c] ?? c).join("").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "") || "product-...";
                          const preview = form.slug || autoSlug;
                          return <p className="mt-1 text-xs text-gray-400">URL: <span className="font-mono text-gray-600">/product/{preview}</span>{form.slug && <span className="ml-1 text-blue-500">(ручной)</span>}</p>;
                        })()}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Название (узбекский, необязательно)</label>
                        <input value={form.nameUz} onChange={e => setForm(f => ({ ...f, nameUz: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Название на узбекском (необязательно)" />
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
                              🌐 Автоперевод на узбекский
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-400 mt-1">
                          {isTranslating
                            ? "Перевод занимает 5–15 секунд..."
                            : "Нажмите, чтобы автоматически заполнить поля на узбекском языке"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Категория *</label>
                        <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: parseInt(e.target.value) }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                          <option value={0}>Выберите...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Бренд</label>
                        <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="SAMSUNG, LG..." />
                      </div>
                      {/* Exchange rate row */}
                      <div className="col-span-2">
                        <div className="flex flex-wrap items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                          <span className="text-sm font-semibold text-blue-800">💱 Курс доллара:</span>
                          <input
                            type="number"
                            value={exchangeRate}
                            onChange={e => setExchangeRate(Number(e.target.value) || 12700)}
                            className="w-28 border border-blue-300 rounded-lg px-2 py-1 text-sm font-bold text-blue-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                            min={1}
                          />
                          <span className="text-sm text-blue-700">сум за 1 USD</span>
                          {rateQuery.isLoading && <span className="text-xs text-blue-400">Загрузка...</span>}
                          {rateUpdatedAt && <span className="text-xs text-blue-500">Автокурс: {new Date(rateUpdatedAt).toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
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
                          <p className="text-xs text-gray-500 mt-1">= {Number(form.price).toLocaleString("ru-RU")} сум</p>
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
                          <p className="text-xs text-gray-500 mt-1">= {Number(form.originalPrice).toLocaleString("ru-RU")} сум</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Скидка (%)</label>
                        <input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: parseInt(e.target.value) || 0 }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="20" min={0} max={99} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Количество на складе</label>
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
                        <label className="block text-sm font-semibold mb-1">Описание (русский)</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Описание на русском..." />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold mb-1">Описание (узбекский, необязательно)</label>
                        <textarea value={form.descriptionUz} onChange={e => setForm(f => ({ ...f, descriptionUz: e.target.value }))}
                          rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Описание на узбекском (необязательно)..." />
                      </div>
                      {/* Seller info */}
                      <div className="col-span-2 border-t border-gray-100 pt-3">
                        <p className="text-sm font-bold text-gray-700 mb-3">Данные продавца</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Имя продавца</label>
                        <input value={form.sellerName} onChange={e => setForm(f => ({ ...f, sellerName: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Название магазина" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1 text-purple-700">👑 Себестоимость (USD $) — только для VIP</label>
                        <input type="number" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))}
                          className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-purple-50" placeholder="Например: 350 (в долларах)" />
                        <p className="text-xs text-purple-500 mt-1">VIP-участники увидят эту цену как «Цена для вас»</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Телефон продавца</label>
                        <input value={form.sellerPhone} onChange={e => setForm(f => ({ ...f, sellerPhone: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="+998 90 123 45 67" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold mb-1">Telegram продавца</label>
                        <input value={form.sellerTelegram} onChange={e => setForm(f => ({ ...f, sellerTelegram: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="@username" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold mb-1">Контактный телефон (показывается на странице товара)</label>
                        <ContactPhonePicker
                          value={form.contactPhone}
                          onChange={(phone) => setForm(f => ({ ...f, contactPhone: phone }))}
                          placeholder="+998 90 123 45 67"
                        />
                        <p className="text-xs text-gray-400 mt-1">Нажмите на книжку справа, чтобы выбрать из сохранённых номеров или сохранить новый</p>
                      </div>
                      <div className="col-span-2 grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-3 text-sm cursor-pointer bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors select-none">
                          <input type="checkbox" checked={form.isNew} onChange={e => setForm(f => ({ ...f, isNew: e.target.checked }))} className="w-4 h-4 rounded flex-shrink-0" />
                          <span className="font-medium">🆕 Новинка</span>
                        </label>
                        <label className="flex items-center gap-3 text-sm cursor-pointer bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors select-none">
                          <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} className="w-4 h-4 rounded flex-shrink-0" />
                          <span className="font-medium">⭐ Рекомендуемый</span>
                        </label>
                        <label className="flex items-center gap-3 text-sm cursor-pointer bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 hover:bg-orange-100 transition-colors select-none">
                          <input type="checkbox" checked={form.isHit} onChange={e => setForm(f => ({ ...f, isHit: e.target.checked }))} className="w-4 h-4 rounded flex-shrink-0 accent-orange-500" />
                          <span className="text-orange-700 font-semibold">🔥 Хит продаж</span>
                        </label>
                        <label className="flex items-center gap-3 text-sm cursor-pointer bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 hover:bg-yellow-100 transition-colors select-none">
                          <input type="checkbox" checked={form.isPremium} onChange={e => setForm(f => ({ ...f, isPremium: e.target.checked }))} className="w-4 h-4 rounded flex-shrink-0" style={{ accentColor: '#d4af37' }} />
                          <span className="font-semibold" style={{ color: '#b8860b' }}>◈ Оригинал техника</span>
                        </label>
                      </div>
                      {form.isHit && (
                        <div className="col-span-2">
                          <label className="block text-sm font-semibold mb-1 text-orange-700">🔥 Порядок отображения в хитах (1 = первый)</label>
                          <input
                            type="number"
                            value={form.hitOrder}
                            onChange={e => setForm(f => ({ ...f, hitOrder: parseInt(e.target.value) || 0 }))}
                            className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-orange-50"
                            placeholder="0"
                            min={0}
                          />
                          <p className="text-xs text-gray-400 mt-1">Товары с меньшим номером отображаются раньше</p>
                        </div>
                      )}
                      {/* Stock count + Discount timer */}
                      <div className="col-span-2 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold mb-1 text-red-700">📦 Осталось на складе (шт.)</label>
                          <input type="number" value={form.stockCount} onChange={e => setForm(f => ({ ...f, stockCount: e.target.value }))}
                            className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-red-50"
                            placeholder="Например: 5" min={0} />
                          <p className="text-xs text-red-400 mt-1">Если ≤ 5 — покупатель увидит «Осталось X шт.»</p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-1 text-red-700">⏰ Скидка действует до</label>
                          <input type="datetime-local" value={form.discountEndsAt} onChange={e => setForm(f => ({ ...f, discountEndsAt: e.target.value }))}
                            className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-red-50" />
                          <p className="text-xs text-red-400 mt-1">Таймер обратного отсчёта на странице товара</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={createProduct.isPending || updateProduct.isPending}
                        className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
                        {editId ? "Сохранить" : "Добавить"}
                      </button>
                      <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}
                        className="px-6 border border-gray-200 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                        Отмена
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Products table */}
            {productsLoading ? (
       <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">Загрузка...</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Товар</th>
                        <th className="text-left px-4 py-3 font-semibold">Цена</th>
                        <th className="text-left px-4 py-3 font-semibold">Склад</th>
                        <th className="text-left px-4 py-3 font-semibold">Статус</th>
                        <th className="text-right px-4 py-3 font-semibold">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(p => (
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
                              {p.stock ?? 0} шт
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {(p as any).isActive === false && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">⛔ Нет в наличии</span>}
                              {(p as any).isApproved === false && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">На проверке</span>}
                              {p.isFeatured && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Рекомендуем</span>}
                              {p.isNew && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Новинка</span>}
                              {(p as any).isHit && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">🔥 Hit</span>}
                              {(p as any).isPremium && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#1a1a2e', color: '#d4af37' }}>◈ Original</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {(p as any).isApproved === false && (
                                <button onClick={() => approveProduct.mutate({ id: p.id })}
                                  className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 transition-colors font-semibold">
Одобрить
                                  </button>
                              )}
                              <button
                                onClick={() => toggleActive.mutate({ id: p.id, isActive: !(p as any).isActive })}
                                title={(p as any).isActive ? "Скрыть с сайта (нет в наличии)" : "Показать на сайте"}
                                className={`text-xs px-2 py-1 rounded-lg font-semibold transition-colors ${
                                  (p as any).isActive
                                    ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600"
                                    : "bg-red-100 text-red-600 hover:bg-green-100 hover:text-green-700"
                                }`}
                              >
                                {(p as any).isActive ? "✓ В наличии" : "⛔ Нет"}
                              </button>
                              <button onClick={() => handleEdit(p)} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                                <Edit size={15} />
                              </button>
                              <button onClick={() => { if (confirm("Удалить этот товар?")) deleteProduct.mutate({ id: p.id }); }}
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
            <h2 className="font-black text-lg mb-4 text-gray-900">Заказы ({orders?.length ?? 0})</h2>
            {ordersLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">Загрузка...</div>
            ) : !orders || orders.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Заказов нет</div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-black text-gray-900">Заказ #{order.id}</p>
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
                          <option value="pending">Ожидает</option>
                          <option value="confirmed">Подтвердить</option>
                          <option value="delivered">Доставлен</option>
                          <option value="cancelled">Отменить</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p><strong>Клиент:</strong> {order.customerName}</p>
                        <p><strong>Тел:</strong> {order.customerPhone}</p>
                        <p><strong>Адрес:</strong> {order.deliveryAddress}</p>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Товары:</p>
                        {(order.items as any[]).map((item, i) => (
                          <p key={i} className="text-xs text-gray-400">{item.name} × {item.quantity} — {formatPrice(item.price * item.quantity)}</p>
                        ))}
                        <p className="font-black text-primary mt-1">Итого: {formatPrice(parseFloat(order.totalAmount))}</p>
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
            <h2 className="font-black text-lg mb-4 text-gray-900">Продавцы ({sellers?.length ?? 0})</h2>
            {sellersLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">Загрузка...</div>
            ) : !sellers || sellers.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                <Users size={40} className="mx-auto mb-3 opacity-40" />
                <p>Продавцов пока нет</p>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        {!seller.isApproved && (
                          <button
                            onClick={() => approveSeller.mutate({ id: seller.id })}
                            className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                          >
Одобрить
                            </button>
                        )}
                        {seller.isApproved && (
                          <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full">Одобрен</span>
                        )}
                        {(seller as any).isBlocked ? (
                          <button
                            onClick={() => blockSeller.mutate({ id: seller.id, blocked: false })}
                            className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
                          >
                            Разблокировать
                          </button>
                        ) : (
                          <button
                            onClick={() => { if (confirm("Заблокировать продавца?")) blockSeller.mutate({ id: seller.id, blocked: true }); }}
                            className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                          >
Заблокировать
                            </button>
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

        {/* ==================== MODERATION TAB ==================== */}
        {tab === "moderation" && (
          <div>
            <h2 className="font-black text-lg mb-4 text-gray-900">
              Модерация — товары на проверке ({pendingProducts.length})
            </h2>
            {pendingLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">Загрузка...</div>
            ) : pendingProducts.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                <Package size={40} className="mx-auto mb-3 opacity-40" />
                <p>Товаров для проверки нет</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingProducts.map(p => (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex gap-4">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-20 h-20 object-cover rounded-xl border border-gray-100 flex-shrink-0" />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Package size={28} className="text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900">{p.name}</p>
                        <p className="text-sm text-gray-500">{p.brand && `${p.brand} · `}{formatPrice(p.price)}</p>
                        {p.sellerName && (
                          <p className="text-xs text-blue-600 mt-0.5">Продавец: {p.sellerName} {p.sellerPhone && `(${p.sellerPhone})`}</p>
                        )}
                        {p.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.description}</p>
                        )}
                        {p.discount && p.discount > 0 ? (
                          <span className="inline-block bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full mt-1">-{p.discount}% скидка</span>
                        ) : (
                          <span className="inline-block bg-gray-50 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full mt-1">Без скидки</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => approveProductMut.mutate({ id: p.id })}
                          disabled={approveProductMut.isPending}
                          className="bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
Одобрить
                          </button>
                        <button
                          onClick={() => { if (confirm(`Отклонить товар "${p.name}"?`)) rejectProductMut.mutate({ id: p.id }); }}
                          disabled={rejectProductMut.isPending}
                          className="bg-red-50 text-red-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
Отклонить
                          </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== MESSAGING TAB ==================== */}
        {tab === "messaging" && (
          <div className="flex gap-4" style={{ height: "calc(100vh - 260px)", minHeight: "500px" }}>
            {/* Left: seller list */}
            <div className="w-72 shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-black text-gray-900 text-sm">Продавцы</h3>
                <p className="text-xs text-gray-400 mt-0.5">Выберите продавца для переписки</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {/* Existing conversations */}
                {(adminConvs ?? []).length > 0 && (
                  <div className="p-2 border-b border-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase px-2 mb-1">Активные чаты</p>
                    {(adminConvs ?? []).map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => openConvForSeller(conv.sellerId)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          activeConvData?.conversation?.id === conv.id
                            ? "bg-red-50 text-red-700"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                          {(conv.sellerName ?? "П")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{conv.sellerName}</p>
                          <p className="text-xs text-gray-400">Продавец</p>
                        </div>
                        {conv.unread > 0 && (
                          <span className="bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                            {conv.unread}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {/* All sellers to start new conversation */}
                <div className="p-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase px-2 mb-1">Все продавцы</p>
                  <AllSellersList onSelect={openConvForSeller} activeSellerUserId={activeConvSellerUserId} />
                </div>
              </div>
            </div>

            {/* Right: chat window */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
              {!activeConvData ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <MessageSquare size={48} className="text-gray-200 mb-3" />
                  <p className="text-gray-400 font-medium">Выберите продавца</p>
                  <p className="text-gray-300 text-sm mt-1">Нажмите на продавца слева, чтобы начать переписку</p>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                      {((adminConvs ?? []).find(c => c.id === activeConvData.conversation?.id)?.sellerName ?? "П")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        {(adminConvs ?? []).find(c => c.id === activeConvData.conversation?.id)?.sellerName ?? "Продавец"}
                      </p>
                      <p className="text-xs text-gray-400">Продавец</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {activeConvMessages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-gray-300 text-sm">Нет сообщений. Напишите первым!</p>
                      </div>
                    )}
                    {activeConvMessages.map((msg) => {
                      const isOwn = msg.senderId === user.id;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isOwn
                                ? "bg-red-600 text-white rounded-br-sm"
                                : "bg-gray-100 text-gray-900 rounded-bl-sm"
                            }`}
                          >
                            <p>{msg.body}</p>
                            <p className={`text-[10px] mt-1 ${isOwn ? "text-red-200" : "text-gray-400"}`}>
                              {new Date(msg.createdAt).toLocaleString("ru-RU", {
                                day: "2-digit", month: "short",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Input */}
                  <div className="border-t border-gray-100 p-3">
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleSendMsg(); }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={msgInput}
                        onChange={(e) => setMsgInput(e.target.value)}
                        placeholder="Напишите сообщение продавцу..."
                        className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm outline-none focus:border-red-400 transition-colors bg-gray-50"
                        maxLength={2000}
                      />
                      <button
                        type="submit"
                        disabled={!msgInput.trim() || sendMsgMut.isPending}
                        className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
                      >
                        {sendMsgMut.isPending ? (
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ==================== SETTINGS TAB ==================== */}
        {/* ==================== BANNERS TAB ==================== */}
        {tab === "banners" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-lg text-gray-900">Акционные баннеры ({allBanners.length})</h2>
              <button
                onClick={() => { setShowBannerForm(true); setBannerForm(emptyBannerForm); setBannerEditId(null); }}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                <Plus size={16} /> Добавить баннер
              </button>
            </div>

            {/* Banner Form Modal */}
            {showBannerForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-lg">{bannerEditId ? "Редактировать баннер" : "Новый баннер"}</h3>
                    <button onClick={() => setShowBannerForm(false)}><X size={20} /></button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Заголовок (RU) *</label>
                      <input value={bannerForm.title} onChange={e => setBannerForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Большие скидки до 50%!" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Заголовок (узбекский, необязательно)</label>
                      <input value={bannerForm.titleUz} onChange={e => setBannerForm(f => ({ ...f, titleUz: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Заголовок на узбекском (необязательно)" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Описание (RU)</label>
                      <textarea value={bannerForm.description} onChange={e => setBannerForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Только до конца недели" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Описание (узбекский, необязательно)</label>
                      <textarea value={bannerForm.descriptionUz} onChange={e => setBannerForm(f => ({ ...f, descriptionUz: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Только до конца недели" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Цвет фона</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={bannerForm.bgColor} onChange={e => setBannerForm(f => ({ ...f, bgColor: e.target.value }))} className="w-10 h-9 rounded border border-gray-200 cursor-pointer" />
                          <input value={bannerForm.bgColor} onChange={e => setBannerForm(f => ({ ...f, bgColor: e.target.value }))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Цвет текста</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={bannerForm.textColor} onChange={e => setBannerForm(f => ({ ...f, textColor: e.target.value }))} className="w-10 h-9 rounded border border-gray-200 cursor-pointer" />
                          <input value={bannerForm.textColor} onChange={e => setBannerForm(f => ({ ...f, textColor: e.target.value }))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Ссылка (URL)</label>
                      <input value={bannerForm.link} onChange={e => setBannerForm(f => ({ ...f, link: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="/catalog или /bestsellers" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Текст кнопки (RU)</label>
                        <input value={bannerForm.linkText} onChange={e => setBannerForm(f => ({ ...f, linkText: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Смотреть все" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Текст кнопки (узбекский, необязательно)</label>
                        <input value={bannerForm.linkTextUz} onChange={e => setBannerForm(f => ({ ...f, linkTextUz: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Текст кнопки на узбекском (необязательно)" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Дата окончания акции</label>
                      <input type="datetime-local" value={bannerForm.endsAt} onChange={e => setBannerForm(f => ({ ...f, endsAt: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <p className="text-xs text-gray-400 mt-1">Оставьте пустым если акция бессрочная</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Порядок сортировки</label>
                        <input type="number" value={bannerForm.sortOrder} onChange={e => setBannerForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={bannerForm.isActive} onChange={e => setBannerForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-primary" />
                          <span className="text-sm font-semibold text-gray-700">Активен</span>
                        </label>
                      </div>
                    </div>
                    {/* Preview */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Предпросмотр</label>
                      <div className="rounded-xl px-4 py-3" style={{ backgroundColor: bannerForm.bgColor, color: bannerForm.textColor }}>
                        <div className="font-bold text-sm">{bannerForm.title || "Заголовок баннера"}</div>
                        {bannerForm.description && <div className="text-xs mt-0.5 opacity-90">{bannerForm.description}</div>}
                        {bannerForm.linkText && <div className="mt-2 inline-block text-xs border border-current rounded-full px-3 py-1 font-semibold">{bannerForm.linkText} →</div>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setShowBannerForm(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 font-semibold text-sm text-gray-700 hover:bg-gray-50">Отмена</button>
                    <button
                      onClick={handleBannerSubmit}
                      disabled={createBannerMut.isPending || updateBannerMut.isPending || !bannerForm.title}
                      className="flex-1 bg-primary text-white rounded-xl py-2.5 font-bold text-sm hover:bg-primary/90 disabled:opacity-50"
                    >
                      {(createBannerMut.isPending || updateBannerMut.isPending) ? "Сохранение..." : bannerEditId ? "Сохранить" : "Создать"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {bannersLoading ? (
              <div className="text-center py-12 text-gray-400">Загрузка...</div>
            ) : allBanners.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                <ImagePlus size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-semibold">Баннеров пока нет</p>
                <p className="text-xs text-gray-400 mt-1">Создайте первый акционный баннер</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allBanners.map(banner => {
                  const isExpired = banner.endsAt && new Date(banner.endsAt) < new Date();
                  return (
                    <div key={banner.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: banner.bgColor }}>
                        <span className="text-lg">🎯</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 truncate">{banner.title}</span>
                          {!banner.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Выкл</span>}
                          {isExpired && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Истёк</span>}
                          {banner.isActive && !isExpired && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Активен</span>}
                        </div>
                        {banner.description && <p className="text-xs text-gray-500 truncate mt-0.5">{banner.description}</p>}
                        {banner.endsAt && <p className="text-xs text-gray-400 mt-0.5">До: {new Date(banner.endsAt).toLocaleString("ru-RU")}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setBannerEditId(banner.id);
                            setBannerForm({
                              title: banner.title,
                              titleUz: banner.titleUz ?? "",
                              description: banner.description ?? "",
                              descriptionUz: banner.descriptionUz ?? "",
                              bgColor: banner.bgColor,
                              textColor: banner.textColor,
                              link: banner.link ?? "",
                              linkText: banner.linkText ?? "",
                              linkTextUz: banner.linkTextUz ?? "",
                              endsAt: banner.endsAt ? new Date(banner.endsAt).toISOString().slice(0, 16) : "",
                              isActive: banner.isActive,
                              sortOrder: banner.sortOrder,
                            });
                            setShowBannerForm(true);
                          }}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => { if (confirm("Удалить баннер?")) deleteBannerMut.mutate({ id: banner.id }); }}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "notifications" && (
          <div className="max-w-2xl">
            <h2 className="font-black text-lg mb-2 text-gray-900">Telegram уведомления</h2>
            <p className="text-sm text-gray-500 mb-5">При новом заказе уведомление поступит всем активным получателям в списке ниже.</p>

            {/* How to get chat_id */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 text-sm text-blue-800">
              <p className="font-bold mb-1">ℹ️ Как узнать свой Chat ID?</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Откройте Telegram и найдите бот <b>@userinfobot</b></li>
                <li>Напишите ему любое сообщение</li>
                <li>Бот ответит вашим <b>id</b> (например: 123456789)</li>
                <li>Скопируйте этот ID и вставьте в поле ниже</li>
                <li>Подчинённый должен отправить боту любое сообщение (например /start)</li>
              </ol>
            </div>

            {/* Add new recipient */}
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
              <h3 className="font-bold text-sm text-gray-700 mb-3">Добавить получателя</h3>
              <div className="flex gap-3 mb-3">
                <input
                  value={newRecipientName}
                  onChange={e => setNewRecipientName(e.target.value)}
                  placeholder="Имя (например: Ахмад менеджер)"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  value={newRecipientChatId}
                  onChange={e => setNewRecipientChatId(e.target.value)}
                  placeholder="Chat ID (123456789)"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={() => {
                  if (!newRecipientName.trim() || !newRecipientChatId.trim()) {
                    toast.error("Заполните имя и Chat ID");
                    return;
                  }
                  addRecipientMut.mutate({ chatId: newRecipientChatId.trim(), name: newRecipientName.trim() });
                }}
                disabled={addRecipientMut.isPending}
                className="w-full bg-primary text-white py-2 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {addRecipientMut.isPending ? "Добавление..." : "Добавить получателя"}
              </button>
            </div>

            {/* Recipients list */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-sm text-gray-700 mb-3">Список получателей</h3>
              {telegramLoading ? (
                <p className="text-sm text-gray-400">Загрузка...</p>
              ) : telegramRecipients.length === 0 ? (
                <p className="text-sm text-gray-400">Пока нет дополнительных получателей. Уведомления идут только вам.</p>
              ) : (
                <div className="space-y-2">
                  {telegramRecipients.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-800">{r.name}</p>
                        <p className="text-xs text-gray-400">Chat ID: {r.chatId}</p>
                      </div>
                      <button
                        onClick={() => toggleRecipientMut.mutate({ id: r.id, isActive: !r.isActive })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          r.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {r.isActive ? "Активен" : "Отключён"}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Удалить получателя "${r.name}"?`)) {
                            deleteRecipientMut.mutate({ id: r.id });
                          }
                        }}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Webhook Registration */}
            <div className="bg-white rounded-2xl shadow-sm p-5 mt-5">
              <h3 className="font-bold text-sm text-gray-700 mb-1">Inline-кнопки «Одобрить / Отклонить»</h3>
              <p className="text-xs text-gray-500 mb-3">
                Чтобы кнопки в Telegram работали, нужно зарегистрировать webhook. Нажмите кнопку один раз после публикации сайта.
              </p>
              {(webhookInfo as any)?.result?.url && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 text-xs text-green-800">
                  <p className="font-bold mb-0.5">Webhook активен</p>
                  <p className="break-all">{(webhookInfo as any).result.url}</p>
                  {(webhookInfo as any).result.last_error_message && (
                    <p className="text-red-600 mt-1">Ошибка: {(webhookInfo as any).result.last_error_message}</p>
                  )}
                </div>
              )}
              <button
                onClick={() => registerWebhookMut.mutate({ siteUrl: window.location.origin })}
                disabled={registerWebhookMut.isPending}
                className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {registerWebhookMut.isPending ? "Регистрация..." : "Зарегистрировать Webhook"}
              </button>
            </div>
          </div>
        )}

        {/* ==================== UTM TRAFFIC SOURCES TAB ==================== */}
        {tab === "utm" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-gray-900">Источники трафика</h2>
                <p className="text-sm text-gray-500 mt-0.5">UTM-метки для отслеживания переходов из Instagram и других источников</p>
              </div>
              <div className="flex gap-2">
                {[7, 30, 90].map(d => (
                  <button
                    key={d}
                    onClick={() => setUtmDays(d)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      utmDays === d ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {d} дн.
                  </button>
                ))}
              </div>
            </div>

            {/* UTM link for Instagram bio */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-bold text-blue-800 mb-1">Ссылка для Instagram Bio</p>
              <code className="text-xs text-blue-700 break-all select-all">
                https://kattachegirma.uz/?utm_source=instagram&amp;utm_medium=bio&amp;utm_campaign=katta.chegirma
              </code>
              <p className="text-xs text-blue-600 mt-1">Вставьте эту ссылку в шапку профиля @katta.chegirma</p>
            </div>

            {utmLoading ? (
              <div className="text-center py-12 text-gray-400">Загрузка статистики...</div>
            ) : !utmStats || utmStats.total === 0 ? (
              <div className="text-center py-12">
                <MapPin size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-semibold">Нет данных за выбранный период</p>
                <p className="text-sm text-gray-400 mt-1">Переходы по UTM-ссылкам появятся здесь</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Всего переходов</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{utmStats.total}</p>
                  </div>
                  <div className="bg-pink-50 rounded-xl p-4">
                    <p className="text-xs text-pink-600 font-semibold uppercase tracking-wide">Из Instagram</p>
                    <p className="text-2xl font-black text-pink-700 mt-1">{utmStats.instagramTotal}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Источников</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{utmStats.bySource.length}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Кампаний</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{utmStats.byCampaign.filter(c => c.campaign !== "—").length}</p>
                  </div>
                </div>

                {/* By source */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3">По источнику</h3>
                  <div className="space-y-2">
                    {utmStats.bySource.map(({ source, count }) => (
                      <div key={source} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-32 truncate font-medium">{source}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.round((count / utmStats.total) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-10 text-right">{count}</span>
                        <span className="text-xs text-gray-400 w-10 text-right">{Math.round((count / utmStats.total) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By campaign */}
                {utmStats.byCampaign.some(c => c.campaign !== "—") && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-3">По кампании</h3>
                    <div className="space-y-2">
                      {utmStats.byCampaign.filter(c => c.campaign !== "—").map(({ campaign, count }) => (
                        <div key={campaign} className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 w-40 truncate font-medium">{campaign}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.round((count / utmStats.total) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-gray-900 w-10 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Daily chart */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3">По дням</h3>
                  <div className="flex items-end gap-1 h-24">
                    {utmStats.byDay.map(({ date, count }) => {
                      const maxCount = Math.max(...utmStats.byDay.map(d => d.count), 1);
                      const heightPct = Math.round((count / maxCount) * 100);
                      return (
                        <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div
                            className="w-full bg-primary/20 rounded-sm group-hover:bg-primary/40 transition-colors"
                            style={{ height: `${Math.max(heightPct, 2)}%` }}
                          />
                          {count > 0 && (
                            <span className="absolute -top-5 text-xs text-gray-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{utmStats.byDay[0]?.date}</span>
                    <span>{utmStats.byDay[utmStats.byDay.length - 1]?.date}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "vip" && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Crown size={22} className="text-yellow-500" />
              <h2 className="font-black text-lg text-gray-900">VIP подписка</h2>
              <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">{vipUsers.length} VIP</span>
            </div>

            {/* Grant VIP */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-4">Дать VIP-доступ</h3>
              <p className="text-sm text-gray-500 mb-4">Пользователь должен сначала зарегистрироваться на сайте. Введите его email или номер телефона.</p>
              <div className="flex gap-3 flex-wrap">
                <input
                  value={vipEmailOrPhone}
                  onChange={e => setVipEmailOrPhone(e.target.value)}
                  placeholder="Email или номер телефона"
                  className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
                <input
                  type="date"
                  value={vipExpiresAt}
                  onChange={e => setVipExpiresAt(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  title="Дата окончания VIP (необязательно)"
                />
                <button
                  onClick={() => {
                    if (!vipEmailOrPhone.trim()) return toast.error("Введите email или телефон");
                    grantVipMut.mutate({ emailOrPhone: vipEmailOrPhone, expiresAt: vipExpiresAt || undefined });
                  }}
                  disabled={grantVipMut.isPending}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {grantVipMut.isPending ? "Выдаём..." : "Дать VIP"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Дата окончания — необязательно. Если не указана, VIP бессрочный.</p>
            </div>

            {/* VIP users list */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">VIP-участники ({vipUsers.length})</h3>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={vipSearch}
                    onChange={e => setVipSearch(e.target.value)}
                    placeholder="Поиск..."
                    className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 w-40"
                  />
                </div>
              </div>
              {vipLoading ? (
                <p className="text-sm text-gray-400">Загрузка...</p>
              ) : vipUsers.length === 0 ? (
                <p className="text-sm text-gray-400">Пока нет VIP-участников</p>
              ) : (
                <div className="space-y-2">
                  {vipUsers
                    .filter(u => {
                      if (!vipSearch.trim()) return true;
                      const q = vipSearch.toLowerCase();
                      return (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q) || ((u as any).phone ?? "").includes(q);
                    })
                    .map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{u.name ?? "Без имени"}</p>
                          <p className="text-xs text-gray-500">{u.email ?? (u as any).phone ?? "—"}</p>
                          {(u as any).vipExpiresAt && (
                            <p className="text-xs text-yellow-600">До: {new Date((u as any).vipExpiresAt).toLocaleDateString("ru-RU")}</p>
                          )}
                        </div>
                        <button
                          onClick={() => revokeVipMut.mutate({ userId: u.id })}
                          disabled={revokeVipMut.isPending}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                        >
                          Отозвать VIP
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-2">Как работает VIP?</h3>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Пользователь регистрируется на сайте (email + пароль)</li>
                <li>Вы добавляете его email здесь → он получает VIP-доступ</li>
                <li>VIP-участник видит кнопку «VIP» на сайте и себестоимость товаров</li>
                <li>Чтобы убрать VIP — нажмите «Отозвать VIP» рядом с именем</li>
              </ol>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="max-w-2xl">
            <h2 className="font-black text-lg mb-5 text-gray-900">Настройки магазина</h2>
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
              {/* Store name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Название магазина</label>
                <input
                  value={settingsForm.storeName}
                  onChange={e => setSettingsForm(f => ({ ...f, storeName: e.target.value }))}
                  placeholder="Katta Chegirma"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Описание</label>
                <textarea
                  value={settingsForm.description}
                  onChange={e => setSettingsForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Краткое описание магазина..."
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Phone numbers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Телефон 1</label>
                  <input
                    value={settingsForm.phone}
                    onChange={e => setSettingsForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+998 90 123 45 67"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Телефон 2</label>
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
                  Адрес 1
                </label>
                <input
                  value={settingsForm.address}
                  onChange={e => setSettingsForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Ташкент, Чиланзарский район, ..."
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary" />
                  Адрес 2 (необязательно)
                </label>
                <input
                  value={settingsForm.address2}
                  onChange={e => setSettingsForm(f => ({ ...f, address2: e.target.value }))}
                  placeholder="Второй адрес (необязательно)"
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
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Часы работы</label>
                <input
                  value={settingsForm.workingHours}
                  onChange={e => setSettingsForm(f => ({ ...f, workingHours: e.target.value }))}
                  placeholder="Пн - Сб: 9:00 - 20:00"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <button
                onClick={() => saveSettings.mutate(settingsForm)}
                disabled={saveSettings.isPending}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saveSettings.isPending ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
