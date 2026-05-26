import { useAuth } from "@/_core/hooks/useAuth";
import ContactPhonePicker from "@/components/ContactPhonePicker";
import BrandPicker from "@/components/BrandPicker";
import AdminOrdersTab from "@/components/admin/AdminOrdersTab";
import AdminSellersTab from "@/components/admin/AdminSellersTab";
import AdminModerationTab from "@/components/admin/AdminModerationTab";
import AdminQuickOrdersTab from "@/components/admin/AdminQuickOrdersTab";
import AdminBannersTab from "@/components/admin/AdminBannersTab";
import AdminNotificationsTab from "@/components/admin/AdminNotificationsTab";
import AdminUTMTab from "@/components/admin/AdminUTMTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import { trpc } from "@/lib/trpc";
import { BarChart3, Bell, Edit, FolderOpen, ImagePlus, MapPin, MessageSquare, Package, Plus, Search, Send, Settings, ShoppingBag, Star, Store, Trash2, Upload, Users, X, Zap, Phone, CheckCircle2, Clock, Youtube, PlayCircle, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
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

type Tab = "products" | "categories" | "orders" | "sellers" | "moderation" | "settings" | "banners" | "notifications" | "utm" | "messaging" | "quickorders" | "indexing";

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
  videoId: string;
}

const emptyForm: ProductForm = {
  name: "", nameUz: "", slug: "", description: "", descriptionUz: "", categoryId: 0, brand: "",
  price: "", priceUsd: "", originalPrice: "", originalPriceUsd: "", discount: 0, imageUrl: "", images: [], stock: 0,
  isNew: false, isFeatured: false, isHit: false, isPremium: false, hitOrder: 0, costPrice: "", stockCount: "", discountEndsAt: "", sellerPhone: "", sellerTelegram: "", sellerName: "", contactPhone: "", videoId: "",
};

// ---- VideoSearchPicker component ----
/** Extract YouTube videoId from any URL format or plain ID */
function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  // Plain 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  try {
    const url = new URL(s);
    // youtu.be/ID
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split(/[?&]/)[0] || null;
    // youtube.com/watch?v=ID
    const v = url.searchParams.get("v");
    if (v) return v;
    // youtube.com/shorts/ID or /embed/ID
    const m = url.pathname.match(/\/(shorts|embed|v)\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[2];
  } catch {}
  // Fallback regex
  const m2 = s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m2 ? m2[1] : null;
}

function VideoSearchPicker({ productName, value, onChange }: { productName: string; value: string; onChange: (v: string) => void }) {
  const [input, setInput] = useState(productName);
  const [open, setOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedThumb, setSelectedThumb] = useState("");
  const [inputError, setInputError] = useState("");

  // Detect if current input looks like a YouTube URL / ID
  const isUrl = /youtube\.com|youtu\.be|^[a-zA-Z0-9_-]{11}$/.test(input.trim());

  const searchQuery = trpc.youtube.searchVideos.useQuery(
    { query: input.trim(), maxResults: 6 },
    { enabled: open && !isUrl && input.trim().length >= 2 }
  );

  const handleSelect = (videoId: string, title: string, thumb: string) => {
    onChange(videoId);
    setSelectedTitle(title);
    setSelectedThumb(thumb);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setSelectedTitle("");
    setSelectedThumb("");
    setInput(productName);
    setInputError("");
    setOpen(false);
  };

  const handleAction = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    // If it looks like a URL or plain ID — apply directly
    if (isUrl) {
      const id = parseYouTubeId(trimmed);
      if (!id) { setInputError("Не удалось распознать ID. Проверьте ссылку."); return; }
      setInputError("");
      onChange(id);
      setSelectedTitle("");
      setSelectedThumb(`https://img.youtube.com/vi/${id}/mqdefault.jpg`);
      setOpen(false);
    } else {
      // Text query — toggle search results
      setInputError("");
      setOpen(o => !o);
    }
  };

  return (
    <div className="col-span-2 border border-red-200 rounded-xl p-4 bg-red-50">
      <label className="block text-sm font-semibold mb-2 text-red-700 flex items-center gap-1.5">
        <Youtube size={15} className="text-red-600" />
        Видеообзор на YouTube
      </label>

      {value ? (
        <div className="flex items-center gap-3 bg-white rounded-lg p-2 border border-red-200">
          <img
            src={selectedThumb || `https://img.youtube.com/vi/${value}/mqdefault.jpg`}
            alt="" className="w-20 h-12 object-cover rounded shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{selectedTitle || "Видео привязано"}</p>
            <a href={`https://www.youtube.com/watch?v=${value}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-red-500 hover:underline font-mono">{value} ↗</a>
          </div>
          <button type="button" onClick={handleClear} className="text-gray-400 hover:text-red-500 shrink-0"><X size={16} /></button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Введите название товара для поиска <strong>или вставьте ссылку</strong> на YouTube (youtu.be/..., youtube.com/watch?v=..., /shorts/...)</p>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setInputError(""); setOpen(false); }}
              onKeyDown={e => e.key === "Enter" && handleAction()}
              placeholder="Название товара или ссылка на YouTube..."
              className="flex-1 border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
            />
            <button type="button" onClick={handleAction}
              className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 shrink-0">
              {isUrl ? <>✔ Применить</> : <><Search size={14} /> Найти</>}
            </button>
          </div>
          {inputError && <p className="text-xs text-red-500">{inputError}</p>}

          {/* Search results */}
          {open && (
            <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-md">
              {searchQuery.isLoading && (
                <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /></div>
              )}
              {!searchQuery.isLoading && (searchQuery.data?.videos ?? []).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Видео не найдено. Вставьте ссылку на YouTube вручную.</p>
              )}
              {(searchQuery.data?.videos ?? []).map((v: { videoId: string; title: string; thumbnail: string }) => (
                <button key={v.videoId} type="button"
                  onClick={() => handleSelect(v.videoId, v.title, v.thumbnail)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 text-left border-b border-gray-100 last:border-0">
                  <img src={v.thumbnail} alt="" className="w-20 h-12 object-cover rounded shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">{v.title}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{v.videoId}</p>
                  </div>
                  <PlayCircle size={20} className="text-red-500 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [isAutoTranslatingDesc, setIsAutoTranslatingDesc] = useState(false);
  const [isAutoTranslatingName, setIsAutoTranslatingName] = useState(false);
  // Track if user manually edited the UZ description — if so, don't auto-overwrite
  const descUzManualRef = useRef(false);
  const nameUzManualRef = useRef(false);
  // Track if user manually changed category/brand — if so, don't auto-overwrite
  const categoryManualRef = useRef(false);
  const brandManualRef = useRef(false);
  const autoTranslateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTranslateNameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(12700); // UZS per 1 USD
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null);
  const [adminSearch, setAdminSearch] = useState("");
  const [markupPercent, setMarkupPercent] = useState<number>(0);
  const [bulkUpdateResult, setBulkUpdateResult] = useState<{ updated: number; newRate: number } | null>(null);
  const rateQuery = trpc.currency.getRate.useQuery(undefined, { staleTime: 60 * 60 * 1000 });
  const bulkUpdatePricesMut = trpc.currency.bulkUpdatePrices.useMutation({
    onSuccess: (data) => {
      setBulkUpdateResult(data);
      utils.products.list.invalidate();
      setTimeout(() => setBulkUpdateResult(null), 5000);
    },
  });
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
  const { data: brandsData } = trpc.brands.list.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const brandsList = (brandsData ?? []) as Array<{ id: number; name: string }>;

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

  // Quick orders
  const { data: quickOrdersList, isLoading: quickOrdersLoading, refetch: refetchQuickOrders } = trpc.quickOrders.list.useQuery(undefined, {
    enabled: tab === "quickorders" && user?.role === "admin",
  });
  const updateQuickOrderStatusMut = trpc.quickOrders.updateStatus.useMutation({
    onSuccess: () => { refetchQuickOrders(); toast.success("Статус обновлён"); },
    onError: (e) => toast.error(e.message),
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
    onSuccess: () => { toast.success("Товар добавлен!"); utils.products.list.invalidate(); utils.products.adminList.invalidate(); setShowForm(false); setForm(emptyForm); descUzManualRef.current = false; nameUzManualRef.current = false; },
    onError: (e) => toast.error("Ошибка добавления: " + e.message),
  });
  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => { toast.success("Товар обновлён!"); utils.products.list.invalidate(); utils.products.adminList.invalidate(); setShowForm(false); setForm(emptyForm); setEditId(null); descUzManualRef.current = false; nameUzManualRef.current = false; },
    onError: (e) => toast.error("Ошибка обновления: " + e.message),
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
  const publishToTg = trpc.products.publishToTelegram.useMutation({
    onSuccess: () => toast.success("✅ Товар опубликован в Telegram канале!"),
    onError: (e) => toast.error("❌ Ошибка: " + e.message),
  });
  const updateOrderStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { toast.success("Статус обновлён!"); utils.orders.list.invalidate(); },
  });
  const [scanProgress, setScanProgress] = useState<{ updated: number; skipped: number } | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const autoScanMut = trpc.products.autoScanVideoReviews.useMutation({
    onMutate: () => { setScanLoading(true); setScanProgress(null); },
    onSuccess: (data) => { setScanProgress(data); setScanLoading(false); utils.products.adminList.invalidate(); toast.success(`Сканирование завершено: ${data.updated} привязано`); },
    onError: (e) => { setScanLoading(false); toast.error("Ошибка: " + e.message); },
  });

  // Bulk translate state
  const [bulkTranslateProgress, setBulkTranslateProgress] = useState<{ total: number; translated: number; skipped: number; errors: number } | null>(null);
  const [bulkTranslating, setBulkTranslating] = useState(false);
  const bulkTranslateMut = trpc.products.bulkTranslate.useMutation({
    onMutate: () => { setBulkTranslating(true); setBulkTranslateProgress(null); },
    onSuccess: (data: { total: number; translated: number; skipped: number; errors: number }) => {
      setBulkTranslateProgress(data);
      setBulkTranslating(false);
      utils.products.adminList.invalidate();
      toast.success(`Перевод завершён: ${data.translated} товаров переведено`);
    },
    onError: (e: any) => { setBulkTranslating(false); toast.error("Ошибка массового перевода: " + e.message); },
  });

  // UZ slug generation state
  const [genUzSlugsProgress, setGenUzSlugsProgress] = useState<{ total: number; updated: number } | null>(null);
  const [genUzSlugsLoading, setGenUzSlugsLoading] = useState(false);
  const genCatUzSlugsMut = trpc.categories.generateUzSlugs.useMutation({
    onMutate: () => { setGenUzSlugsLoading(true); setGenUzSlugsProgress(null); },
    onSuccess: (data: { total: number; updated: number }) => { setGenUzSlugsProgress(data); setGenUzSlugsLoading(false); toast.success(`UZ slug-и категорий: ${data.updated} сгенерировано`); },
    onError: (e: any) => { setGenUzSlugsLoading(false); toast.error('Ошибка: ' + e.message); },
  });
  const genProdUzSlugsMut = trpc.products.generateUzSlugs.useMutation({
    onMutate: () => { setGenUzSlugsLoading(true); setGenUzSlugsProgress(null); },
    onSuccess: (data: { total: number; updated: number }) => { setGenUzSlugsProgress(data); setGenUzSlugsLoading(false); toast.success(`UZ slug-и товаров: ${data.updated} сгенерировано`); },
    onError: (e: any) => { setGenUzSlugsLoading(false); toast.error('Ошибка: ' + e.message); },
  });

  // AI description generation state
  const [bulkGenDescProgress, setBulkGenDescProgress] = useState<{ total: number; generated: number; skipped: number; errors: number } | null>(null);
  const [bulkGenDescLoading, setBulkGenDescLoading] = useState(false);
  const bulkGenDescMut = trpc.products.bulkGenerateDescriptions.useMutation({
    onMutate: () => { setBulkGenDescLoading(true); setBulkGenDescProgress(null); },
    onSuccess: (data: { total: number; generated: number; skipped: number; errors: number }) => {
      setBulkGenDescProgress(data);
      setBulkGenDescLoading(false);
      utils.products.adminList.invalidate();
      toast.success(`Описания сгенерированы: ${data.generated} товаров`);
    },
    onError: (e: any) => { setBulkGenDescLoading(false); toast.error("Ошибка генерации описаний: " + e.message); },
  });
  const [genDescLoading, setGenDescLoading] = useState(false);
  const genDescMut = trpc.products.generateDescription.useMutation({
    onMutate: () => setGenDescLoading(true),
    onSuccess: (data: { description: string; descriptionUz: string }) => {
      setGenDescLoading(false);
      setForm(f => ({ ...f, description: data.description, descriptionUz: data.descriptionUz }));
      toast.success("Описание сгенерировано ИИ!");
    },
    onError: (e: any) => { setGenDescLoading(false); toast.error("Ошибка генерации: " + e.message); },
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

  const translateSourceRef = useRef<'manual' | 'autoDesc' | 'autoName'>('manual');
   const translateProduct = trpc.products.translate.useMutation({
    onSuccess: (data) => {
      const src = translateSourceRef.current;
      if (src === 'autoName') {
        // Only update nameUz if not manually edited
        if (!nameUzManualRef.current) setForm(f => ({ ...f, nameUz: data.nameUz }));
        setIsAutoTranslatingName(false);
      } else if (src === 'autoDesc') {
        // Only update descriptionUz if not manually edited
        if (!descUzManualRef.current) setForm(f => ({ ...f, descriptionUz: data.descriptionUz }));
        setIsAutoTranslatingDesc(false);
      } else {
        // Manual full translate button — update both
        setForm(f => ({ ...f, nameUz: data.nameUz, descriptionUz: data.descriptionUz }));
        toast.success("Перевод выполнен!");
        setIsTranslating(false);
      }
    },
    onError: (e) => {
      toast.error("Ошибка перевода: " + e.message);
      setIsTranslating(false);
      setIsAutoTranslatingDesc(false);
      setIsAutoTranslatingName(false);
    },
  });
  const handleTranslate = () => {
    if (!form.name.trim()) { toast.error("Сначала введите название на русском"); return; }
    setIsTranslating(true);
    translateSourceRef.current = 'manual';
    translateProduct.mutate({ name: form.name, description: form.description || undefined });
  };

  // Auto-translate description RU→UZ with 1.5s debounce
  // Only triggers when UZ description was NOT manually edited by user
  const handleDescriptionRuChange = useCallback((value: string) => {
    setForm(f => ({ ...f, description: value }));
    if (autoTranslateTimerRef.current) clearTimeout(autoTranslateTimerRef.current);
    if (descUzManualRef.current) return;
    if (!value.trim()) return;
    autoTranslateTimerRef.current = setTimeout(() => {
      setIsAutoTranslatingDesc(true);
      translateSourceRef.current = 'autoDesc';
      translateProduct.mutate({ name: form.name || "товар", description: value });
    }, 1500);
  }, [form.name, translateProduct]);
  // When user manually types in UZ description — mark as manual, stop auto-translate
  const handleDescriptionUzChange = useCallback((value: string) => {
    descUzManualRef.current = true;
    if (autoTranslateTimerRef.current) clearTimeout(autoTranslateTimerRef.current);
    setIsAutoTranslatingDesc(false);
    setForm(f => ({ ...f, descriptionUz: value }));
  }, []);
  // Category keyword map for auto-detection
  const CATEGORY_KEYWORDS: { keywords: string[]; id: number }[] = [
    { keywords: ['холодильник', 'холодилник', 'muzlatgich', 'sovutgich', 'rulls', 'hisense', 'immer nf', 'immer rd'], id: 210002 },
    { keywords: ['стиральн', 'kir yuvish', 'стирал'], id: 2 },
    { keywords: ['кондиционер', 'konditsioner', 'сплит', 'split', 'aero inverter', 'pure 12', 'trend ,turbo', 'wings 12'], id: 210001 },
    { keywords: ['пылесос', 'changyutkich'], id: 1 },
    { keywords: ['телевизор', 'televizor', 'tv ', 'smart tv'], id: 150001 },
    { keywords: ['микроволновк', 'mikroto'], id: 7 },
    { keywords: ['морозилк', 'muzlatk', 'морозильн', 'franco мороз', 'franco морозилк'], id: 30001 },
    { keywords: ['посудомоечн', 'idish yuvish'], id: 6 },
    { keywords: ['водонагреватель', 'suv isitgich', 'бойлер', 'boiler'], id: 10 },
    { keywords: ['духовк', 'pech', 'духов'], id: 90001 },
    { keywords: ['варочн', 'варочная', 'plita'], id: 180001 },
    { keywords: ['газов плит', 'газовая плит'], id: 8 },
    { keywords: ['вытяжк', 'hood', 'вытяж'], id: 330001 },
    { keywords: ['кулер', 'куллер', 'dispenser', 'water cooler', 'для воды', 'frctbc', 'techon tn'], id: 270001 },
    { keywords: ['очиститель воздух', 'havo tozalagich', 'увлажнитель', 'air purif'], id: 300001 },
    { keywords: ['утюг', 'dazmol'], id: 13 },
    { keywords: ['чайник', 'elektr choynak', 'электрочайник'], id: 12 },
    { keywords: ['фотоэпилятор', 'эпилятор', 'epilyator'], id: 390001 },
    { keywords: ['одежд', 'kiyim', 'платье', 'куртк', 'пальто'], id: 360001 },
    { keywords: ['мелк', 'блендер', 'миксер', 'тостер', 'фритюр', 'мультиварк'], id: 240001 },
  ];

  // Auto-translate name RU→UZ with 1.5s debounce
  const handleNameRuChange = useCallback((value: string) => {
    setForm(f => ({ ...f, name: value }));
    if (autoTranslateNameTimerRef.current) clearTimeout(autoTranslateNameTimerRef.current);
    // Auto-detect category from product name
    if (!categoryManualRef.current && value.trim().length > 3) {
      const lowerName = value.toLowerCase();
      for (const cat of CATEGORY_KEYWORDS) {
        if (cat.keywords.some(kw => lowerName.includes(kw))) {
          setForm(f => ({ ...f, categoryId: cat.id }));
          break;
        }
      }
    }
    // Auto-detect brand from product name using loaded brands list
    if (!brandManualRef.current && value.trim().length > 2) {
      const lowerName = value.toLowerCase();
      // Sort by name length desc so longer/more specific brands match first
      const sorted = [...brandsList].sort((a, b) => b.name.length - a.name.length);
      const matched = sorted.find(b => lowerName.includes(b.name.toLowerCase()));
      if (matched) {
        setForm(f => ({ ...f, brand: matched.name }));
      }
    }
    if (nameUzManualRef.current) return;
    if (!value.trim()) return;
    autoTranslateNameTimerRef.current = setTimeout(() => {
      setIsAutoTranslatingName(true);
      translateSourceRef.current = 'autoName';
      translateProduct.mutate({ name: value });
    }, 1500);
  }, [translateProduct, brandsList, CATEGORY_KEYWORDS]);
  // When user manually types in UZ name — mark as manual, stop auto-translate
  const handleNameUzChange = useCallback((value: string) => {
    nameUzManualRef.current = true;
    if (autoTranslateNameTimerRef.current) clearTimeout(autoTranslateNameTimerRef.current);
    setIsAutoTranslatingName(false);
    setForm(f => ({ ...f, nameUz: value }));
  }, []);

  const saveSettings = trpc.storeSettings.setMany.useMutation({
    onSuccess: () => { toast.success("Настройки сохранены!"); utils.storeSettings.getAll.invalidate(); },
    onError: (e) => toast.error("Ошибка: " + e.message),
  });

  // Auto-hits settings
  const [hitThreshold, setHitThreshold] = useState<number>(50);
  const [hitAutoEnabled, setHitAutoEnabled] = useState<boolean>(true);
  const hitSettingsQuery = trpc.hits.getHitSettings.useQuery(undefined, {
    enabled: tab === "settings",
    staleTime: 60 * 1000,
  });
  useEffect(() => {
    if (hitSettingsQuery.data) {
      setHitThreshold(hitSettingsQuery.data.threshold);
      setHitAutoEnabled(hitSettingsQuery.data.autoEnabled);
    }
  }, [hitSettingsQuery.data]);
  const saveHitSettingsMut = trpc.hits.saveHitSettings.useMutation({
    onSuccess: () => { toast.success("Настройки авто-хитов сохранены!"); hitSettingsQuery.refetch(); utils.products.getHits.invalidate(); },
    onError: (e) => toast.error("Ошибка: " + e.message),
  });
  const recalcHitsMut = trpc.hits.recalcHits.useMutation({
    onSuccess: () => { toast.success("Хиты пересчитаны!"); utils.products.getHits.invalidate(); utils.products.list.invalidate(); },
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
    // Validate required fields with specific error messages
    if (!form.name.trim()) {
      toast.error("Введите название товара");
      return;
    }
    // Validate category
    if (!form.categoryId || form.categoryId === 0) {
      toast.error("Выберите категорию товара из списка ниже");
      return;
    }
    // Accept either price (UZS) or priceUsd (USD) as valid price input
    const finalPrice = form.price || (form.priceUsd ? String(Math.round(Number(form.priceUsd) * exchangeRate)) : "");
    if (!finalPrice || finalPrice === "0") {
      toast.error("Введите цену товара (в поле USD)");
      return;
    }
    // Transliterate Cyrillic and generate safe slug; fallback to timestamp if result is empty
    const cyrMap: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
    const translit = (s: string) => s.toLowerCase().split("").map(c => cyrMap[c] ?? c).join("");
    const rawSlug = translit(form.name).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const slug = form.slug || rawSlug || `product-${Date.now()}`;
    const stockCountNum = form.stockCount !== "" ? parseInt(form.stockCount) : undefined;
    // Use finalPrice (computed from USD if needed)
    const formWithPrice = { ...form, price: finalPrice };
    if (editId) {
      updateProduct.mutate({ id: editId, ...formWithPrice, slug, stockCount: stockCountNum });
    } else {
      createProduct.mutate({ ...formWithPrice, slug, stockCount: stockCountNum });
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
      videoId: (p as any).videoId ?? "",
    });
    setEditId(p.id);
    setShowForm(true);
    // Reset manual UZ flags when editing a product
    descUzManualRef.current = false;
    nameUzManualRef.current = false;
    if (autoTranslateTimerRef.current) clearTimeout(autoTranslateTimerRef.current);
    if (autoTranslateNameTimerRef.current) clearTimeout(autoTranslateNameTimerRef.current);
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
    { key: "settings" as Tab, icon: Settings, label: "Настройки" },
    { key: "messaging" as Tab, icon: MessageSquare, label: `Сообщения${(adminConvs ?? []).reduce((s, c) => s + c.unread, 0) > 0 ? ` (${(adminConvs ?? []).reduce((s, c) => s + c.unread, 0)})` : ""}` },
    { key: "quickorders" as Tab, icon: Zap, label: `Быстрые заявки${(quickOrdersList ?? []).filter(o => o.status === 'new').length > 0 ? ` (${(quickOrdersList ?? []).filter(o => o.status === 'new').length})` : ""}` },
    { key: "indexing" as Tab, icon: Search, label: "Индексирование" },
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
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {tabConfig.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-colors whitespace-nowrap flex-shrink-0 ${tab === key ? "bg-primary text-white" : "bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"}`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
          <Link href="/admin/analytics">
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-colors bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 whitespace-nowrap flex-shrink-0">
              <BarChart3 size={16} /> Аналитика
            </button>
          </Link>
          <Link href="/admin/reviews">
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-colors bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 whitespace-nowrap flex-shrink-0">
              <Star size={16} /> Отзывы
            </button>
          </Link>
        </div>

        {/* ==================== PRODUCTS TAB ==================== */}
        {tab === "products" && (
          <div>
            <div className="flex flex-col gap-3 mb-4">
              {/* Строка 1: заголовок + кнопка Добавить */}
              <div className="flex justify-between items-center">
                <h2 className="font-black text-lg text-gray-900">
                  Товары ({adminSearch.trim() ? `${filteredProducts.length} / ${products.length}` : products.length})
                </h2>
                <button
                  onClick={() => { setShowForm(true); setForm(emptyForm); setEditId(null); descUzManualRef.current = false; nameUzManualRef.current = false; categoryManualRef.current = false; brandManualRef.current = false; if (autoTranslateTimerRef.current) clearTimeout(autoTranslateTimerRef.current); if (autoTranslateNameTimerRef.current) clearTimeout(autoTranslateNameTimerRef.current); }}
                  className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  <Plus size={16} /> Добавить
                </button>
              </div>
              {/* Строка 2: вспомогательные кнопки — 2×2 на мобильном, в ряд на десктопе */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => { if (!genUzSlugsLoading && window.confirm('Сгенерировать UZ URL slug-и для всех товаров без slugUz? Это займёт несколько минут.')) genProdUzSlugsMut.mutate(); }}
                  disabled={genUzSlugsLoading}
                  title="Сгенерировать узбекские URL slug-и для товаров"
                  className="flex items-center justify-center gap-1 border border-emerald-200 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  {genUzSlugsLoading ? <div className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /> : <span>🔗</span>}
                  {genUzSlugsLoading ? "Генерирую..." : "UZ slug"}
                </button>
                <button
                  type="button"
                  onClick={() => { if (!bulkTranslating && window.confirm('Перевести все товары без узбекского названия/описания? Это может занять несколько минут.')) bulkTranslateMut.mutate(); }}
                  disabled={bulkTranslating}
                  title="Перевести все товары без узбекского названия/описания RU→UZ"
                  className="flex items-center justify-center gap-1 border border-blue-200 text-blue-700 bg-blue-50 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {bulkTranslating ? <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" /> : <span>🌐</span>}
                  {bulkTranslating ? "Переводится..." : "Перевести"}
                </button>
                <button
                  type="button"
                  onClick={() => { if (!bulkGenDescLoading && window.confirm('Сгенерировать SEO-описания для всех товаров без описания? Это может занять несколько минут.')) bulkGenDescMut.mutate(); }}
                  disabled={bulkGenDescLoading}
                  title="Сгенерировать SEO-описания для товаров без описания"
                  className="flex items-center justify-center gap-1 border border-purple-200 text-purple-700 bg-purple-50 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                  {bulkGenDescLoading ? <div className="w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" /> : <span>🤖</span>}
                  {bulkGenDescLoading ? "Генерирую..." : "ИИ описания"}
                </button>
                <button
                  type="button"
                  onClick={() => autoScanMut.mutate({ overwrite: false })}
                  disabled={scanLoading}
                  title="Автоматически найти видеообзоры для товаров без видео"
                  className="flex items-center justify-center gap-1 border border-red-200 text-red-600 bg-red-50 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {scanLoading ? <div className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <RefreshCw size={12} />}
                  {scanLoading ? "Сканирую..." : "Скан видео"}
                </button>
              </div>
              {scanProgress && (
                <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                  <Youtube size={14} className="text-red-600" />
                  <span className="text-green-700 font-semibold">Сканирование завершено:</span>
                  <span className="text-green-800">привязано <strong>{scanProgress.updated}</strong> видео,</span>
                  <span className="text-gray-500">пропущено {scanProgress.skipped}</span>
                  <button onClick={() => setScanProgress(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
              )}
              {/* Bulk translate: loading indicator */}
              {bulkTranslating && (
                <div className="flex items-center gap-3 text-sm bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-blue-800 font-semibold">🌐 Перевод товаров RU→UZ...</p>
                    <p className="text-blue-600 text-xs mt-0.5">Пожалуйста, подождите. Это может занять несколько минут в зависимости от количества товаров.</p>
                  </div>
                </div>
              )}
              {/* Bulk translate: result statistics */}
              {bulkTranslateProgress && !bulkTranslating && (
                <div className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                  <span className="text-base">🌐</span>
                  <span className="text-blue-800 font-semibold">Перевод завершён:</span>
                  <span className="text-blue-700">переведено <strong>{bulkTranslateProgress.translated}</strong>,</span>
                  <span className="text-gray-500">всего {bulkTranslateProgress.total},</span>
                  <span className="text-gray-400">пропущено {bulkTranslateProgress.skipped}</span>
                  {bulkTranslateProgress.errors > 0 && (
                    <span className="text-red-500">ошибок {bulkTranslateProgress.errors}</span>
                  )}
                  <button onClick={() => setBulkTranslateProgress(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
              )}
              {/* Bulk AI descriptions: loading indicator */}
              {bulkGenDescLoading && (
                <div className="flex items-center gap-3 text-sm bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                  <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-purple-800 font-semibold">🤖 Генерация SEO-описаний...</p>
                    <p className="text-purple-600 text-xs mt-0.5">ИИ создаёт уникальные описания на русском и узбекском. Это может занять несколько минут.</p>
                  </div>
                </div>
              )}
              {/* Bulk AI descriptions: result statistics */}
              {bulkGenDescProgress && !bulkGenDescLoading && (
                <div className="flex items-center gap-2 text-sm bg-purple-50 border border-purple-200 rounded-xl px-4 py-2">
                  <span className="text-base">🤖</span>
                  <span className="text-purple-800 font-semibold">Генерация завершена:</span>
                  <span className="text-purple-700">создано <strong>{bulkGenDescProgress.generated}</strong>,</span>
                  <span className="text-gray-500">всего {bulkGenDescProgress.total},</span>
                  <span className="text-gray-400">пропущено {bulkGenDescProgress.skipped}</span>
                  {bulkGenDescProgress.errors > 0 && (
                    <span className="text-red-500">ошибок {bulkGenDescProgress.errors}</span>
                  )}
                  <button onClick={() => setBulkGenDescProgress(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
              )}
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
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
                <div className="bg-white w-full sm:max-w-2xl sm:mx-4 sm:rounded-2xl rounded-t-3xl flex flex-col" style={{ maxHeight: "92vh" }}>
                  {/* Шапка — фиксирована */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                    <div>
                      <h3 className="font-black text-base text-gray-900">
                        {editId ? "✏️ Редактировать товар" : "➕ Новый товар"}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {editId ? "Измените нужные поля и сохраните" : "Заполните основные поля — остальное необязательно"}
                      </p>
                    </div>
                    <button
                      onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {/* Содержимое — скроллится */}
                  <div className="overflow-y-auto flex-1 px-5 py-4">
                  <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Название (русский) *</label>
                        <input value={form.name} onChange={e => handleNameRuChange(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors" placeholder="Название на русском" />
                        {isAutoTranslatingName && (
                          <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                            Переводится на узбекский...
                          </p>
                        )}
                        {form.name && (() => {
                          const cm: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
                          const autoSlug = form.name.toLowerCase().split("").map(c => cm[c] ?? c).join("").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "") || "product-...";
                          const preview = form.slug || autoSlug;
                          return <p className="mt-1 text-xs text-gray-400">URL: <span className="font-mono text-gray-600">/product/{preview}</span>{form.slug && <span className="ml-1 text-blue-500">(ручной)</span>}</p>;
                        })()}
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-semibold">Название (узбекский, необязательно)</label>
                          {nameUzManualRef.current && (
                            <button type="button" onClick={() => { nameUzManualRef.current = false; setForm(f => ({ ...f, nameUz: "" })); if (form.name.trim()) { setIsAutoTranslatingName(true); translateSourceRef.current = 'autoName'; translateProduct.mutate({ name: form.name }); } }} className="text-xs text-blue-500 hover:underline">↺ Авто-перевод</button>
                          )}
                        </div>
                        <input value={form.nameUz} onChange={e => handleNameUzChange(e.target.value)}
                          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${nameUzManualRef.current ? 'border-orange-300 focus:ring-orange-300' : 'border-gray-200 focus:ring-primary/30'}`} placeholder={nameUzManualRef.current ? "Введено вручную (авто-перевод отключён)" : "Заполнится автоматически при вводе русского названия..."} />
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
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Категория *</label>
                        <select value={form.categoryId} onChange={e => { categoryManualRef.current = true; setForm(f => ({ ...f, categoryId: parseInt(e.target.value) })); }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                          <option value={0}>Выберите...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Бренд</label>
                        <BrandPicker
                          value={form.brand}
                          onChange={(v) => { brandManualRef.current = true; setForm(f => ({ ...f, brand: v })); }}
                          placeholder="SAMSUNG, LG..."
                        />
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
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">💵 Цена (USD) *</label>
                        <input
                          type="number"
                          value={form.priceUsd}
                          onChange={e => {
                            const usd = e.target.value;
                            const uzs = usd ? String(Math.round(Number(usd) * exchangeRate)) : "";
                            setForm(f => ({ ...f, priceUsd: usd, price: uzs }));
                          }}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors"
                          placeholder="e.g. 150"
                          min={0}
                        />
                        {form.priceUsd && (
                          <p className="text-xs text-gray-500 mt-1">= {Number(form.price).toLocaleString("ru-RU")} сум</p>
                        )}
                      </div>
                      {/* Original price USD → UZS */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">💵 Старая цена (USD)</label>
                        <input
                          type="number"
                          value={form.originalPriceUsd}
                          onChange={e => {
                            const usd = e.target.value;
                            const uzs = usd ? String(Math.round(Number(usd) * exchangeRate)) : "";
                            setForm(f => ({ ...f, originalPriceUsd: usd, originalPrice: uzs }));
                          }}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors"
                          placeholder="e.g. 200"
                          min={0}
                        />
                        {form.originalPriceUsd && (
                          <p className="text-xs text-gray-500 mt-1">= {Number(form.originalPrice).toLocaleString("ru-RU")} сум</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Скидка (%)</label>
                        <input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: parseInt(e.target.value) || 0 }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors" placeholder="20" min={0} max={99} />
                        {form.originalPriceUsd && form.priceUsd && Number(form.originalPriceUsd) > Number(form.priceUsd) && (
                          <p className="text-xs text-green-600 mt-1 font-medium">
                            Авто: {Math.round((1 - Number(form.priceUsd) / Number(form.originalPriceUsd)) * 100)}% →
                            <button type="button" className="ml-1 underline" onClick={() => setForm(f => ({ ...f, discount: Math.round((1 - Number(f.priceUsd) / Number(f.originalPriceUsd)) * 100) }))}
                            >применить</button>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Количество на складе</label>
                        <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors" placeholder="10" min={0} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Фотографии товара ({form.images.length}/10)</label>
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
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-semibold">Описание (русский)</label>
                          {editId && (
                            <button
                              type="button"
                              onClick={() => genDescMut.mutate({ productId: editId })}
                              disabled={genDescLoading}
                              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-semibold disabled:opacity-50"
                            >
                              {genDescLoading ? <div className="w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" /> : <span>🤖</span>}
                              {genDescLoading ? "Генерирую..." : "Сгенерировать ИИ"}
                            </button>
                          )}
                        </div>
                        <textarea value={form.description} onChange={e => handleDescriptionRuChange(e.target.value)}
                          rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Описание на русском..." />
                        {isAutoTranslatingDesc && (
                          <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                            Переводится на узбекский...
                          </p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-semibold">Описание (узбекский, необязательно)</label>
                          {descUzManualRef.current && (
                            <button type="button" onClick={() => { descUzManualRef.current = false; setForm(f => ({ ...f, descriptionUz: "" })); if (form.description.trim()) { setIsAutoTranslatingDesc(true); translateProduct.mutate({ name: form.name || "товар", description: form.description }); } }} className="text-xs text-blue-500 hover:underline">↺ Авто-перевод</button>
                          )}
                        </div>
                        <textarea value={form.descriptionUz} onChange={e => handleDescriptionUzChange(e.target.value)}
                          rows={3} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${descUzManualRef.current ? 'border-orange-300 focus:ring-orange-300' : 'border-gray-200 focus:ring-primary/30'}`} placeholder={descUzManualRef.current ? "Введено вручную (авто-перевод отключён)" : "Заполнится автоматически при вводе русского описания..."} />
                      </div>
                      {/* Seller info */}
                      <div className="col-span-2 border-t border-gray-100 pt-3">
                        <p className="text-sm font-bold text-gray-700 mb-3">Данные продавца</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Имя продавца</label>
                        <input value={form.sellerName} onChange={e => setForm(f => ({ ...f, sellerName: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors" placeholder="Название магазина" />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Контактный телефон (показывается на странице товара)</label>
                        <ContactPhonePicker
                          value={form.contactPhone}
                          onChange={(phone) => setForm(f => ({ ...f, contactPhone: phone, sellerPhone: phone, sellerTelegram: phone }))}
                          onSelectContact={(phone, name) => setForm(f => ({ ...f, contactPhone: phone, sellerPhone: phone, sellerTelegram: phone, sellerName: name }))}
                          placeholder="+998 90 123 45 67"
                        />
                        <p className="text-xs text-gray-400 mt-1">Нажмите на книжку справа, чтобы выбрать из сохранённых номеров или сохранить новый</p>
                      </div>
                      {/* Метки товара — компактные toggle */}
                      <div className="col-span-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Метки</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, isNew: !f.isNew }))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                              form.isNew
                                ? "bg-green-500 text-white border-green-500"
                                : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
                            }`}
                          >
                            🆕 Новинка
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, isFeatured: !f.isFeatured }))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                              form.isFeatured
                                ? "bg-blue-500 text-white border-blue-500"
                                : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
                            }`}
                          >
                            ⭐ Рекомендуемый
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, isHit: !f.isHit }))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                              form.isHit
                                ? "bg-orange-500 text-white border-orange-500"
                                : "bg-white text-gray-600 border-gray-200 hover:border-orange-400"
                            }`}
                          >
                            🔥 Хит продаж
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, isPremium: !f.isPremium }))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                              form.isPremium
                                ? "text-white border-yellow-600"
                                : "bg-white text-gray-600 border-gray-200 hover:border-yellow-500"
                            }`}
                            style={form.isPremium ? { background: "#b8860b" } : {}}
                          >
                            ◈ Оригинал
                          </button>
                        </div>
                        {form.isHit && (
                          <p className="text-xs text-orange-600 mt-2 bg-orange-50 px-3 py-1.5 rounded-lg">
                            ⚠️ Ручное добавление — товар останется в хитах даже с низким рейтингом
                          </p>
                        )}
                      </div>
                      {form.isHit && (
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Порядок в хитах</label>
                          <input
                            type="number"
                            value={form.hitOrder}
                            onChange={e => setForm(f => ({ ...f, hitOrder: parseInt(e.target.value) || 0 }))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors"
                            placeholder="0"
                            min={0}
                          />
                          <p className="text-xs text-gray-400 mt-1">Товары с меньшим номером отображаются раньше</p>
                        </div>
                      )}
                      {/* Склад + Таймер — нейтральный стиль */}
                      <div className="col-span-2 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Остаток на складе</label>
                          <input type="number" value={form.stockCount} onChange={e => setForm(f => ({ ...f, stockCount: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors"
                            placeholder="Например: 10" min={0} />
                          <p className="text-xs text-gray-400 mt-1">≤ 5 шт → покупатель увидит предупреждение</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Скидка до</label>
                          <input type="datetime-local" value={form.discountEndsAt} onChange={e => setForm(f => ({ ...f, discountEndsAt: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors" />
                          <p className="text-xs text-gray-400 mt-1">Таймер на странице товара</p>
                        </div>
                      </div>
                    </div>

                    {/* Video Review Search */}
                    <VideoSearchPicker
                      productName={form.name}
                      value={form.videoId}
                      onChange={videoId => setForm(f => ({ ...f, videoId }))}
                    />

                  </form>
                  </div>
                  {/* Кнопки — фиксированы внизу */}
                  <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-white shrink-0 rounded-b-2xl">
                    <button
                      type="submit"
                      form="product-form"
                      disabled={createProduct.isPending || updateProduct.isPending}
                      className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all disabled:opacity-50"
                    >
                      {(createProduct.isPending || updateProduct.isPending) ? (
                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Сохраняю...</>
                      ) : (
                        <>{editId ? "💾 Сохранить изменения" : "✅ Добавить товар"}</>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}
                      className="h-12 px-5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Products table */}
            {productsLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">Загрузка...</div>
            ) : (
              <div>
                {/* МОБИЛЬНЫЙ ВИД — карточки (md:hidden) */}
                <div className="md:hidden space-y-2">
                  {filteredProducts.map(p => (
                    <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-3">
                      <div className="flex gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight">{p.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{p.brand}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="font-black text-sm text-primary">{formatPrice(p.price)}</span>
                            <span className="text-xs text-gray-400">${Math.round(parseFloat(p.price) / exchangeRate)}</span>
                            {p.discount ? <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">-{p.discount}%</span> : null}
                            <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${(p.stock ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {p.stock ?? 0} шт
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(p as any).isActive === false && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">⛔ Скрыт</span>}
                            {(p as any).isApproved === false && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">На проверке</span>}
                            {(p as any).isHit && (
                              <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                🔥 Hit
                                {(p as any).isHitManual
                                  ? <span className="text-orange-500">(ручной)</span>
                                  : <span className="text-orange-500">({(p as any).hitScore ?? 0}pts)</span>
                                }
                              </span>
                            )}
                            {!(p as any).isHit && ((p as any).hitScore ?? 0) > 20 && (
                              <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded-full">
                                📈 {(p as any).hitScore}pts
                              </span>
                            )}
                            {p.isNew && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Новинка</span>}
                            {p.isFeatured && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">⭐ Топ</span>}
                            {(p as any).isPremium && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#1a1a2e', color: '#d4af37' }}>◈ Original</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        {(p as any).isApproved === false && (
                          <button
                            onClick={() => approveProduct.mutate({ id: p.id })}
                            className="flex-1 h-9 bg-green-100 text-green-700 rounded-xl text-xs font-bold hover:bg-green-200 transition-colors"
                          >
                            ✓ Одобрить
                          </button>
                        )}
                        <button
                          onClick={() => toggleActive.mutate({ id: p.id, isActive: !(p as any).isActive })}
                          className={`flex-1 h-9 rounded-xl text-xs font-bold transition-colors ${
                            (p as any).isActive
                              ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600"
                              : "bg-red-100 text-red-600 hover:bg-green-100 hover:text-green-700"
                          }`}
                        >
                          {(p as any).isActive ? "✓ В наличии" : "⛔ Скрыт"}
                        </button>
                        <button
                          onClick={() => publishToTg.mutate({ id: p.id })}
                          disabled={publishToTg.isPending}
                          className="h-9 px-2 flex items-center gap-1 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                          title="Опубликовать в Telegram"
                        >
                          <Send size={13} />
                          TG
                        </button>
                        <button
                          onClick={() => handleEdit(p)}
                          className="h-9 w-9 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => { if (confirm("Удалить этот товар?")) deleteProduct.mutate({ id: p.id }); }}
                          className="h-9 w-9 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ДЕСКТОП ВИД — таблица (hidden md:block) */}
                <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                                {(p as any).isHit && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                    🔥 Hit
                                    {(p as any).isHitManual
                                      ? <span className="text-orange-500 ml-1">(ручной)</span>
                                      : <span className="text-orange-500 ml-1">{(p as any).hitScore ?? 0}pts</span>
                                    }
                                  </span>
                                )}
                                {!(p as any).isHit && ((p as any).hitScore ?? 0) > 20 && (
                                  <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full">
                                    📈 {(p as any).hitScore}pts
                                  </span>
                                )}
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
                                <button
                                  onClick={() => publishToTg.mutate({ id: p.id })}
                                  disabled={publishToTg.isPending}
                                  className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors disabled:opacity-50"
                                  title="Опубликовать в Telegram"
                                >
                                  <Send size={15} />
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
              </div>
            )}
          </div>
        )}

        {/* ==================== CATEGORIES TAB ==================== */}
        {tab === "categories" && (
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="font-black text-lg text-gray-900">Категории ({categories.length})</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (!genUzSlugsLoading && window.confirm('Сгенерировать UZ URL slug-и для всех категорий без slugUz? Это займёт ~1 мин.')) genCatUzSlugsMut.mutate(); }}
                  disabled={genUzSlugsLoading}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  title="Сгенерировать узбекские URL для категорий"
                >
                  {genUzSlugsLoading ? <div className="w-4 h-4 border-2 border-emerald-300 border-t-white rounded-full animate-spin" /> : <span>🔗</span>}
                  UZ slug-и
                </button>
                <button
                  onClick={() => { setShowCatForm(true); setCatForm({ id: 0, name: "", slug: "", icon: "" }); setCatEditId(null); }}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  <Plus size={16} /> Добавить
                </button>
              </div>
            </div>
            {genUzSlugsProgress && !genUzSlugsLoading && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 mb-3 text-sm">
                <span className="text-emerald-700">✅ UZ slug-и: <strong>{genUzSlugsProgress.updated}</strong> из {genUzSlugsProgress.total} сгенерировано</span>
                <button onClick={() => setGenUzSlugsProgress(null)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
              </div>
            )}

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
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Название *</label>
                      <input
                        value={catForm.name}
                        onChange={e => {
                          const name = e.target.value;
                          const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\u0400-\u04ff-]/g, "").replace(/[\u0400-\u04ff]/g, c => c.charCodeAt(0).toString(36));
                          setCatForm(f => ({ ...f, name, slug: f.slug || slug }));
                        }}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors"
                        placeholder="Например: Холодильники"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Slug (URL)</label>
                      <input
                        value={catForm.slug}
                        onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors"
                        placeholder="holodilniki"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Иконка (эмодзи)</label>
                      <input
                        value={catForm.icon}
                        onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-colors"
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
        {tab === "orders" && <AdminOrdersTab />}

        {/* ==================== SELLERS TAB ==================== */}
        {tab === "sellers" && <AdminSellersTab />}

        {/* ==================== MODERATION TAB ==================== */}
        {tab === "moderation" && <AdminModerationTab />}

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

        {/* ==================== BANNERS TAB ==================== */}
        {tab === "banners" && <AdminBannersTab />}

        {tab === "notifications" && <AdminNotificationsTab />}

        {/* ==================== UTM TRAFFIC SOURCES TAB ==================== */}
        {tab === "utm" && <AdminUTMTab />}

        {tab === "settings" && <AdminSettingsTab />}

        {/* ==================== QUICK ORDERS TAB ==================== */}
        {tab === "quickorders" && <AdminQuickOrdersTab />}
      </div>

      {/* ==================== INDEXING TAB ==================== */}
      {tab === "indexing" && (
        <IndexingPanel />
      )}
    </div>
  );
}

function IndexingPanel() {
  const [indexResults, setIndexResults] = useState<Array<{ url: string; success: boolean; error?: string }>>([]);
  const [singleUrl, setSingleUrl] = useState("");
  const [yandexSingleUrl, setYandexSingleUrl] = useState("");

  const utils = trpc.useUtils();
  const logsQuery = trpc.indexing.getLogs.useQuery({ limit: 30 }, { refetchOnWindowFocus: false });

  // Yandex IndexNow mutations
  const yandexAllMut = trpc.indexing.submitAllProductsYandex.useMutation({
    onSuccess: (data) => { toast.success(`✅ Яндекс: ${data.total} товаров отправлено`, { description: "Яндекс поставил страницы в очередь на переобход" }); utils.indexing.getLogs.invalidate(); },
    onError: (err: { message: string }) => toast.error("Яндекс ошибка: " + err.message),
  });
  const yandexCatsMut = trpc.indexing.submitAllCategoriesYandex.useMutation({
    onSuccess: (data) => { toast.success(`✅ Яндекс: ${data.total} категорий отправлено`, { description: "Яндекс поставил страницы в очередь на переобход" }); utils.indexing.getLogs.invalidate(); },
    onError: (err: { message: string }) => toast.error("Яндекс ошибка: " + err.message),
  });
  const yandexOneMut = trpc.indexing.submitUrlYandex.useMutation({
    onSuccess: () => { toast.success("✅ Яндекс: URL отправлен", { description: "Страница поставлена в очередь на переобход" }); utils.indexing.getLogs.invalidate(); },
    onError: (err: { message: string }) => toast.error("Яндекс ошибка: " + err.message),
  });

  const submitAllMut = trpc.indexing.submitAllProducts.useMutation({
    onSuccess: (data) => {
      setIndexResults(data.results);
      if (data.failed === 0) {
        toast.success(`✅ Google: все ${data.succeeded} товаров отправлены`, { description: "Страницы появятся в поиске в течение нескольких часов" });
      } else {
        toast.warning(`⚠️ Google: ${data.succeeded} из ${data.total} отправлено`, { description: `${data.failed} ошибок — смотрите результаты ниже` });
      }
      utils.indexing.getLogs.invalidate();
    },
    onError: (err) => toast.error("Ошибка Google Indexing: " + err.message),
  });

  const submitCatsMut = trpc.indexing.submitAllCategories.useMutation({
    onSuccess: (data) => {
      setIndexResults(data.results);
      toast.success(`✅ Google: ${data.succeeded} категорий отправлено`, { description: "Страницы появятся в поиске в течение нескольких часов" });
      utils.indexing.getLogs.invalidate();
    },
    onError: (err) => toast.error("Ошибка: " + err.message),
  });

  const submitOneMut = trpc.indexing.submitUrl.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("✅ Google: URL отправлен на индексирование", { description: "Страница появится в поиске в течение нескольких часов" });
      } else {
        toast.error("Ошибка: " + data.error);
      }
      setIndexResults([data]);
      utils.indexing.getLogs.invalidate();
    },
    onError: (err) => toast.error("Ошибка: " + err.message),
  });

  const submitSitemapMut = trpc.indexing.submitSitemap.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("✅ Sitemap отправлен в Google Search Console", { description: "Google начнёт обход sitemap.xml в течение нескольких часов" });
      } else {
        toast.error("Ошибка отправки sitemap: " + data.error);
      }
      utils.indexing.getLogs.invalidate();
      utils.indexing.getSitemapStatus.invalidate();
    },
    onError: (err) => toast.error("Ошибка Search Console: " + err.message),
  });

  const sitemapStatusQuery = trpc.indexing.getSitemapStatus.useQuery(undefined, {
    refetchOnWindowFocus: false,
    retry: false,
  });

  const isLoading = submitAllMut.isPending || submitCatsMut.isPending || submitOneMut.isPending;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-2">

      {/* ── Header ── */}
      <div className="text-center">
        <h2 className="font-black text-2xl text-gray-900 mb-2">🔍 Индексирование в поисковиках</h2>
        <p className="text-sm text-gray-500 max-w-xl mx-auto">
          Ускоряет появление страниц сайта в Google и Яндексе. При добавлении/изменении товара через админку — всё происходит <strong>автоматически</strong>. Этот раздел нужен только для массовых или ручных операций.
        </p>
      </div>

      {/* ── Автоматика — статус ── */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-2xl mt-0.5">✅</span>
        <div>
          <p className="font-bold text-green-900 text-sm">Автоматическое индексирование включено</p>
          <p className="text-xs text-green-700 mt-1">
            При каждом <strong>добавлении, изменении или удалении товара</strong> через админку — сервер автоматически уведомляет Google (Indexing API) и Яндекс (IndexNow) в течение 30 секунд. Вручную ничего делать не нужно.
          </p>
        </div>
      </div>

      {/* ── Когда использовать этот раздел ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <p className="font-bold text-amber-900 text-sm mb-3">📋 Когда нужно нажимать кнопки ниже?</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 border border-amber-100">
            <p className="font-semibold text-xs text-amber-800 mb-1">🆕 Первый запуск сайта</p>
            <p className="text-xs text-gray-600">Нажмите «Отправить все товары» один раз — Google сразу узнает обо всех 155+ товарах.</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-amber-100">
            <p className="font-semibold text-xs text-amber-800 mb-1">📥 Массовый импорт</p>
            <p className="text-xs text-gray-600">Добавили 20+ товаров через CSV или скрипт (не через форму)? Нажмите «Отправить все товары».</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-amber-100">
            <p className="font-semibold text-xs text-amber-800 mb-1">🔗 Изменились URL</p>
            <p className="text-xs text-gray-600">Поменяли slug-и товаров? Переотправьте все URL чтобы Google обновил ссылки в поиске.</p>
          </div>
        </div>
      </div>

      {/* ── Google + Yandex side by side ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Google */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <span className="text-xl">🔵</span>
            <div>
              <h3 className="font-black text-base text-gray-900">Google Indexing API</h3>
              <p className="text-xs text-gray-500">Лимит: <strong>200 запросов/день</strong> · Скорость: несколько часов</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="font-semibold text-sm text-blue-900 mb-1">📦 Все товары</p>
            <p className="text-xs text-blue-700 mb-3">Отправить URL всех активных товаров. Используйте при первом запуске или после массового импорта.</p>
            <button
              onClick={() => { if (confirm("Отправить все активные товары на индексирование? (до 200 URL)")) submitAllMut.mutate({ limit: 200 }); }}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {submitAllMut.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Отправляю товары...
                </>
              ) : <>🚀 Отправить все товары</>}
            </button>
            {submitAllMut.isPending && (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-600 h-1.5 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{ width: "100%" }} />
                </div>
                <p className="text-xs text-blue-600">Отправляем URL в Google Indexing API... Это может занять 10–30 секунд.</p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="font-semibold text-sm text-blue-900 mb-1">📂 Категории и главная</p>
            <p className="text-xs text-blue-700 mb-3">Отправить URL категорий, главной и каталога. Используйте после добавления новой категории.</p>
            <button
              onClick={() => { if (confirm("Отправить все категории на индексирование?")) submitCatsMut.mutate(); }}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {submitCatsMut.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Отправляю...
                </>
              ) : <>📤 Отправить категории</>}
            </button>
          </div>

          {/* Search Console Sitemap */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="font-semibold text-sm text-green-900 mb-1">🗺️ Sitemap в Search Console</p>
            <p className="text-xs text-green-700 mb-2">Отправить sitemap.xml напрямую в Google Search Console — надёжный способ без лимита 200 URL/день.</p>

            {/* Sitemap status */}
            {sitemapStatusQuery.data && sitemapStatusQuery.data.success && (
              <div className="bg-white rounded-xl p-2.5 border border-green-100 mb-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-green-600 font-bold">✓ Sitemap зарегистрирован</span>
                  {sitemapStatusQuery.data.isPending && <span className="text-amber-600">(обрабатывается)</span>}
                </div>
                {sitemapStatusQuery.data.urlCount !== undefined && (
                  <p className="text-gray-600">URL в sitemap: <strong>{sitemapStatusQuery.data.urlCount}</strong></p>
                )}
                {sitemapStatusQuery.data.lastDownloaded && (
                  <p className="text-gray-500">Последнее скачивание: {new Date(sitemapStatusQuery.data.lastDownloaded).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                )}
                {(sitemapStatusQuery.data.errors ?? 0) > 0 && (
                  <p className="text-red-600">Ошибок: {sitemapStatusQuery.data.errors}</p>
                )}
              </div>
            )}
            {sitemapStatusQuery.data && !sitemapStatusQuery.data.success && (
              <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-100 mb-3 text-xs">
                <p className="text-amber-700">⚠️ Sitemap ещё не зарегистрирован в Search Console или нет доступа. Нажмите кнопку ниже чтобы отправить.</p>
              </div>
            )}

            <button
              onClick={() => { if (confirm("Отправить sitemap.xml в Google Search Console?")) submitSitemapMut.mutate(); }}
              disabled={isLoading || submitSitemapMut.isPending}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {submitSitemapMut.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Отправляю...
                </>
              ) : <>🗺️ Отправить sitemap.xml</>}
            </button>
            <p className="text-xs text-green-600 mt-2">URL: https://kattachegirma.uz/sitemap.xml</p>
          </div>

          <div className="bg-white border border-blue-200 rounded-2xl p-4">
            <p className="font-semibold text-sm text-gray-900 mb-1">🔗 Один URL</p>
            <p className="text-xs text-gray-500 mb-3">Товар не появляется в Google несколько дней? Отправьте его URL вручную.</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={singleUrl}
                onChange={e => setSingleUrl(e.target.value)}
                placeholder="https://kattachegirma.uz/product/..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
              <button
                onClick={() => { if (singleUrl) submitOneMut.mutate({ url: singleUrl }); }}
                disabled={isLoading || !singleUrl}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {submitOneMut.isPending ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : "Отправить"}
              </button>
            </div>
          </div>
        </div>

        {/* Yandex */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <span className="text-xl">🟡</span>
            <div>
              <h3 className="font-black text-base text-gray-900">Яндекс IndexNow</h3>
              <p className="text-xs text-gray-500"><strong>Без лимитов</strong> · Скорость: минуты</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <p className="font-semibold text-sm text-yellow-900 mb-1">📦 Все товары</p>
            <p className="text-xs text-yellow-700 mb-3">Отправить URL всех активных товаров в Яндекс. Без лимита — все товары за один раз.</p>
            <button
              onClick={() => { if (confirm("Отправить все товары в Яндекс IndexNow?")) yandexAllMut.mutate({ limit: 500 }); }}
              disabled={yandexAllMut.isPending || yandexCatsMut.isPending || yandexOneMut.isPending}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {yandexAllMut.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Отправляю товары...
                </>
              ) : <>🚀 Отправить все товары</>}
            </button>
            {yandexAllMut.isPending && (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-yellow-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-yellow-500 h-1.5 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{ width: "100%" }} />
                </div>
                <p className="text-xs text-yellow-700">Отправляем URL в Яндекс IndexNow...</p>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <p className="font-semibold text-sm text-yellow-900 mb-1">📂 Категории и главная</p>
            <p className="text-xs text-yellow-700 mb-3">Отправить URL всех категорий и главной страницы в Яндекс.</p>
            <button
              onClick={() => { if (confirm("Отправить все категории в Яндекс IndexNow?")) yandexCatsMut.mutate(); }}
              disabled={yandexAllMut.isPending || yandexCatsMut.isPending || yandexOneMut.isPending}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {yandexCatsMut.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Отправляю...
                </>
              ) : <>📤 Отправить категории</>}
            </button>
          </div>

          <div className="bg-white border border-yellow-200 rounded-2xl p-4">
            <p className="font-semibold text-sm text-gray-900 mb-1">🔗 Один URL</p>
            <p className="text-xs text-gray-500 mb-3">Отправить конкретный URL в Яндекс IndexNow.</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={yandexSingleUrl}
                onChange={e => setYandexSingleUrl(e.target.value)}
                placeholder="https://kattachegirma.uz/product/..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
              />
              <button
                onClick={() => { if (yandexSingleUrl) yandexOneMut.mutate({ url: yandexSingleUrl }); }}
                disabled={yandexAllMut.isPending || yandexCatsMut.isPending || yandexOneMut.isPending || !yandexSingleUrl}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {yandexOneMut.isPending ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {indexResults.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base text-gray-900">Результаты ({indexResults.filter(r => r.success).length}/{indexResults.length} успешно)</h3>
            <button onClick={() => setIndexResults([])} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {indexResults.map((r, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs px-3 py-1.5 rounded-lg ${r.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                <span className="shrink-0">{r.success ? "✅" : "❌"}</span>
                <span className="truncate flex-1">{r.url}</span>
                {r.error && <span className="text-red-600 shrink-0 max-w-40 truncate">{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quota note */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-500 text-center">
        Google Indexing API: лимит <strong>200 запросов/день</strong> · Если товаров больше 200 — отправляйте частями (сегодня 200, завтра следующие 200) · Индексирование обычно занимает <strong>несколько часов</strong>
      </div>

      {/* ── История отправок ── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-gray-900">📜 История отправок</h3>
            <p className="text-xs text-gray-500 mt-0.5">Последние 30 операций индексирования</p>
          </div>
          <button
            onClick={() => utils.indexing.getLogs.invalidate()}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className={`h-3.5 w-3.5 ${logsQuery.isFetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Обновить
          </button>
        </div>

        {logsQuery.isLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Загрузка истории...</div>
        ) : !logsQuery.data || logsQuery.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <span className="text-3xl mb-2">📭</span>
            <p className="text-sm">История пуста — нажмите любую кнопку выше чтобы начать</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Дата и время</th>
                  <th className="text-left px-4 py-3 font-semibold">Поисковик</th>
                  <th className="text-left px-4 py-3 font-semibold">Тип</th>
                  <th className="text-right px-4 py-3 font-semibold">URL</th>
                  <th className="text-right px-4 py-3 font-semibold">Успешно</th>
                  <th className="text-right px-4 py-3 font-semibold">Ошибок</th>
                  <th className="text-center px-4 py-3 font-semibold">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logsQuery.data.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        log.engine === 'google' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {log.engine === 'google' ? '🔵 Google' : '🟡 Яндекс'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      <>{log.type === 'products' ? '📦 Товары' :
                       log.type === 'categories' ? '📂 Категории' :
                       log.type === 'single_url' ? '🔗 Один URL' :
                       log.type === 'auto' ? '⚡ Авто' :
                       log.type === 'sitemap' ? '🗺️ Sitemap' : log.type}
                      {log.note && <span className="block text-gray-400 truncate max-w-32" title={log.note}>{log.note}</span>}</>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-mono text-xs">{log.urlCount}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-mono text-xs font-semibold">{log.succeeded}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold">
                      <span className={log.failed > 0 ? 'text-red-600' : 'text-gray-300'}>{log.failed}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        log.status === 'success' ? 'bg-green-100 text-green-700' :
                        log.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {log.status === 'success' ? '✅ Успешно' :
                         log.status === 'partial' ? '⚠️ Частично' :
                         '❌ Ошибка'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
