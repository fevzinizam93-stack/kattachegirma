import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Edit, Package, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("uz-UZ").format(num) + " so'm";
}

type Tab = "products" | "orders";

interface ProductForm {
  id?: number;
  name: string;
  slug: string;
  description: string;
  categoryId: number;
  brand: string;
  price: string;
  originalPrice: string;
  discount: number;
  imageUrl: string;
  stock: number;
  isNew: boolean;
  isFeatured: boolean;
}

const emptyForm: ProductForm = {
  name: "", slug: "", description: "", categoryId: 0, brand: "",
  price: "", originalPrice: "", discount: 0, imageUrl: "", stock: 0, isNew: false, isFeatured: false,
};

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("products");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: categoriesData } = trpc.categories.list.useQuery();
  const categories = categoriesData ?? [];

  const { data: productsData, isLoading: productsLoading } = trpc.products.list.useQuery({ limit: 100, offset: 0 });
  const products = productsData?.items ?? [];

  const { data: orders, isLoading: ordersLoading } = trpc.orders.list.useQuery(undefined, {
    enabled: tab === "orders" && user?.role === "admin",
  });

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

  if (loading) return <div className="container py-20 text-center">Yuklanmoqda...</div>;

  if (!user) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-xl font-bold mb-4">Kirish talab etiladi</h2>
        <a href={getLoginUrl()} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold inline-block">Kirish</a>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Ruxsat yo'q</h2>
        <p className="text-muted-foreground">Bu sahifa faqat adminlar uchun</p>
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
    setForm({
      name: p.name, slug: p.slug, description: p.description ?? "",
      categoryId: p.categoryId, brand: p.brand ?? "", price: p.price,
      originalPrice: p.originalPrice ?? "", discount: p.discount ?? 0,
      imageUrl: p.imageUrl ?? "", stock: p.stock ?? 0,
      isNew: p.isNew ?? false, isFeatured: p.isFeatured ?? false,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-border">
        <div className="container py-4">
          <h1 className="text-xl font-black">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Xush kelibsiz, {user.name}</p>
        </div>
      </div>

      <div className="container py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("products")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === "products" ? "bg-primary text-primary-foreground" : "bg-white border border-border hover:bg-accent"}`}
          >
            <Package size={16} /> Mahsulotlar
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === "orders" ? "bg-primary text-primary-foreground" : "bg-white border border-border hover:bg-accent"}`}
          >
            <ShoppingBag size={16} /> Buyurtmalar
          </button>
        </div>

        {/* Products Tab */}
        {tab === "products" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-lg">Mahsulotlar ({products.length})</h2>
              <button
                onClick={() => { setShowForm(true); setForm(emptyForm); setEditId(null); }}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                <Plus size={16} /> Qo'shish
              </button>
            </div>

            {/* Product Form Modal */}
            {showForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-5 border-b border-border">
                    <h3 className="font-black text-lg">{editId ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}</h3>
                    <button onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }} className="hover:text-red-500">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold mb-1">Nomi *</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Mahsulot nomi" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Kategoriya *</label>
                        <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: parseInt(e.target.value) }))}
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option value={0}>Tanlang...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Brend</label>
                        <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="SAMSUNG, LG..." />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Narx (so'm) *</label>
                        <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="500000" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Eski narx (so'm)</label>
                        <input type="number" value={form.originalPrice} onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))}
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="700000" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Chegirma (%)</label>
                        <input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: parseInt(e.target.value) || 0 }))}
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="20" min={0} max={99} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Ombordagi soni</label>
                        <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="10" min={0} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold mb-1">Rasm URL</label>
                        <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="https://..." />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold mb-1">Tavsif</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Mahsulot haqida..." />
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
                        className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
                        {editId ? "Saqlash" : "Qo'shish"}
                      </button>
                      <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}
                        className="px-6 border border-border py-2.5 rounded-xl font-medium hover:bg-accent transition-colors">
                        Bekor
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Products table */}
            {productsLoading ? (
              <div className="bg-white rounded-xl border border-border p-8 text-center">Yuklanmoqda...</div>
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-border">
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
                        <tr key={p.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">🏠</div>}
                              </div>
                              <div>
                                <p className="font-semibold line-clamp-1">{p.name}</p>
                                <p className="text-xs text-muted-foreground">{p.brand}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-primary">{formatPrice(p.price)}</p>
                            {p.discount ? <p className="text-xs text-muted-foreground">-{p.discount}%</p> : null}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${(p.stock ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {p.stock ?? 0} ta
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {p.isFeatured && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Tavsiya</span>}
                              {p.isNew && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Yangi</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
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

        {/* Orders Tab */}
        {tab === "orders" && (
          <div>
            <h2 className="font-black text-lg mb-4">Buyurtmalar ({orders?.length ?? 0})</h2>
            {ordersLoading ? (
              <div className="bg-white rounded-xl border border-border p-8 text-center">Yuklanmoqda...</div>
            ) : !orders || orders.length === 0 ? (
              <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">Buyurtma yo'q</div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl border border-border p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-black">Buyurtma #{order.id}</p>
                        <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString("uz-UZ")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColors[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                        <select
                          value={order.status}
                          onChange={e => updateOrderStatus.mutate({ id: order.id, status: e.target.value as any })}
                          className="border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                          <p key={i} className="text-xs text-muted-foreground">{item.name} × {item.quantity} — {formatPrice(item.price * item.quantity)}</p>
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
      </div>
    </div>
  );
}
