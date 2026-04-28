import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Plus, Package, Pencil, Trash2, Clock, CheckCircle, XCircle,
  Upload, X, Store
} from "lucide-react";

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

export default function SellerDashboard() {
  const { user, loading } = useAuth();
  const { lang, t } = useLanguage();
  const { formatPrice } = useCurrency();
  const [, navigate] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const emptyForm = {
    name: "", slug: "", description: "", categoryId: 0,
    brand: "", price: "", originalPrice: "", discount: 0,
    imageUrl: "", stock: 1, isNew: false,
  };
  const [form, setForm] = useState(emptyForm);

  const sellerQuery = trpc.sellers.me.useQuery(undefined, { enabled: !!user });
  const categoriesQuery = trpc.categories.list.useQuery();
  const myProductsQuery = trpc.products.sellerList.useQuery(undefined, {
    enabled: !!(user && sellerQuery.data?.isApproved),
  });

  const utils = trpc.useUtils();

  const uploadMut = trpc.products.uploadImage.useMutation({
    onSuccess: (data) => setForm(f => ({ ...f, imageUrl: data.url })),
    onError: (e) => toast.error(t.seller_image_error + e.message),
  });

  const createMut = trpc.products.sellerCreate.useMutation({
    onSuccess: () => {
      toast.success(t.seller_product_sent);
      utils.products.sellerList.invalidate();
      setShowForm(false);
      setForm(emptyForm);
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadMut.mutate({ base64, mimeType: file.type, productId: editId ?? 0, filename: file.name });
    };
    reader.readAsDataURL(file);
  }

  function generateSlug(name: string) {
    return name.toLowerCase()
      .replace(/[а-яё]/g, c => ({ а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" }[c] ?? c))
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(p: typeof products[0]) {
    setEditId(p.id);
    setForm({
      name: p.name, slug: p.slug, description: p.description ?? "",
      categoryId: p.categoryId, brand: p.brand ?? "", price: p.price,
      originalPrice: p.originalPrice ?? "", discount: p.discount ?? 0,
      imageUrl: p.imageUrl ?? "", stock: p.stock ?? 1, isNew: p.isNew ?? false,
    });
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.price || !form.categoryId) {
      toast.error(lang === "uz" ? "Nomi, kategoriya va narx majburiy" : "Название, категория и цена обязательны");
      return;
    }
    const slug = form.slug || generateSlug(form.name);
    if (editId) {
      updateMut.mutate({ id: editId, ...form });
    } else {
      createMut.mutate({ ...form, slug });
    }
  }

  const pending = products.filter(p => p.moderationStatus === "pending").length;
  const approved = products.filter(p => p.moderationStatus === "approved").length;

  return (
    <div className="min-h-screen bg-gray-50">
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
          <button
            onClick={openCreate}
            className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} /> {t.seller_add_product}
          </button>
        </div>
      </div>

      <div className="container py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: lang === "uz" ? "Jami" : "Всего", value: products.length, color: "text-gray-900" },
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
          <b>{lang === "uz" ? "Eslatma:" : "Важно:"}</b>{" "}
          {lang === "uz"
            ? "Siz qo'shgan har bir mahsulot uchun yetkazib berish, kafolat va xaridor pullari bo'yicha to'liq javobgarlik sizda. Platforma uchinchi tomon sotuvchilar uchun javobgarlik olmaydi."
            : "За каждый добавленный вами товар вы несёте полную ответственность за доставку, гарантию и возврат средств. Платформа не несёт ответственности за действия сторонних продавцов."}
        </div>

        {/* Product form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-gray-900">
                {editId ? t.admin_edit_product : t.seller_add_product}
              </h3>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }} className="text-gray-400 hover:text-gray-600">
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
                  placeholder={lang === "uz" ? "Masalan: Samsung 65 dyuym televizor" : "Например: Samsung телевизор 65 дюймов"}
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
                  <option value={0}>{lang === "uz" ? "Tanlang..." : "Выберите..."}</option>
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
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  {t.admin_product_price} ({lang === "uz" ? "so'm" : "сум"}) *
                </label>
                <input
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="5000000"
                  type="number"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  {t.admin_product_old_price} ({lang === "uz" ? "chegirma uchun" : "для скидки"})
                </label>
                <input
                  value={form.originalPrice}
                  onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))}
                  placeholder="6000000"
                  type="number"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  {lang === "uz" ? "Chegirma (%)" : "Скидка (%)"}
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
                  {lang === "uz" ? "Miqdor (dona)" : "Количество (шт.)"}
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
                  placeholder={lang === "uz" ? "Mahsulot haqida batafsil ma'lumot..." : "Подробное описание товара..."}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              {/* Image upload */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  {t.admin_product_images}
                </label>
                <div className="flex items-center gap-3">
                  {form.imageUrl && (
                    <img src={form.imageUrl} alt="" className="w-16 h-16 object-cover rounded-xl border border-gray-200" />
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadMut.isPending}
                    className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500 hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Upload size={16} />
                    {uploadMut.isPending ? t.seller_uploading : t.seller_upload_image}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSubmit}
                disabled={createMut.isPending || updateMut.isPending}
                className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMut.isPending || updateMut.isPending
                  ? t.seller_saving
                  : editId ? t.seller_update : t.seller_send}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
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
