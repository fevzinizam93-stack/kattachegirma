import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useAuthModal } from "@/App";
import { CheckCircle, Package, Plus, Store, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("ru-RU").format(num) + " сум";
}

export default function SellerPanel() {
  const { user, isAuthenticated, loading } = useAuth();
  const { openLogin } = useAuthModal();
  const utils = trpc.useUtils();

  // Seller profile state
  const [regForm, setRegForm] = useState({ name: "", phone: "", telegram: "", description: "" });
  const [showRegForm, setShowRegForm] = useState(false);

  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "", slug: "", description: "", categoryId: 0, brand: "",
    price: "", originalPrice: "", discount: 0, imageUrl: "", stock: 10,
    isNew: false, specs: {} as Record<string, string>,
  });
  const [specKey, setSpecKey] = useState("");
  const [specVal, setSpecVal] = useState("");

  // Approval notification
  const [showApprovalNotice, setShowApprovalNotice] = useState(false);

  const { data: sellerProfile, isLoading: profileLoading } = trpc.sellers.me.useQuery(
    undefined, { enabled: isAuthenticated }
  );
  const { data: myProducts } = trpc.products.sellerList.useQuery(
    undefined, { enabled: isAuthenticated && !!sellerProfile?.isApproved }
  );
  const { data: categoriesData } = trpc.categories.list.useQuery();
  const categories = categoriesData ?? [];

  const registerMutation = trpc.sellers.register.useMutation({
    onSuccess: () => {
      toast.success("Заявка отправлена! Ожидайте подтверждения администратора.");
      utils.sellers.me.invalidate();
      setShowRegForm(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const createProductMutation = trpc.products.sellerCreate.useMutation({
    onSuccess: () => {
      utils.products.sellerList.invalidate();
      setShowProductForm(false);
      setProductForm({ name: "", slug: "", description: "", categoryId: 0, brand: "", price: "", originalPrice: "", discount: 0, imageUrl: "", stock: 10, isNew: false, specs: {} });
      // Show approval notice
      setShowApprovalNotice(true);
      setTimeout(() => setShowApprovalNotice(false), 5000);
    },
    onError: (e) => toast.error(e.message),
  });

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
  };

  const handleAddSpec = () => {
    if (specKey && specVal) {
      setProductForm(f => ({ ...f, specs: { ...f.specs, [specKey]: specVal } }));
      setSpecKey(""); setSpecVal("");
    }
  };

  const handleRemoveSpec = (key: string) => {
    const newSpecs = { ...productForm.specs };
    delete newSpecs[key];
    setProductForm(f => ({ ...f, specs: newSpecs }));
  };

  const handleSubmitProduct = () => {
    if (!productForm.name || !productForm.price || !productForm.categoryId) {
      toast.error("Заполните название, цену и категорию");
      return;
    }
    const slug = productForm.slug || generateSlug(productForm.name);
    createProductMutation.mutate({ ...productForm, slug, specs: productForm.specs });
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <Store size={48} className="text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">Стать продавцом</h2>
          <p className="text-gray-500 mb-6">Для продажи товаров необходимо войти в систему</p>
          <button
            onClick={() => openLogin()}
            className="block w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
          >
            Войти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Approval notice popup */}
      {showApprovalNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-yellow-200 shadow-xl rounded-2xl p-5 max-w-md w-full mx-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
              <Package size={20} className="text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-1">Товар на проверке</p>
              <p className="text-sm text-gray-600">
                Товар проверяется. На проверку уйдёт от 30 минут до двух дней. Как только подтвердится, ваш товар появится на сайте.
              </p>
            </div>
            <button onClick={() => setShowApprovalNotice(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="container py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Store size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Панель продавца</h1>
              <p className="text-gray-500 text-sm">{user?.name || user?.email}</p>
            </div>
          </div>

          {/* Not registered yet */}
          {!sellerProfile && (
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Зарегистрируйтесь как продавец</h2>
              <p className="text-gray-500 text-sm mb-4">
                Чтобы добавлять товары на сайт, зарегистрируйтесь как продавец. После подтверждения администратором вы сможете добавлять товары.
              </p>
              {!showRegForm ? (
                <button
                  onClick={() => setShowRegForm(true)}
                  className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors"
                >
                  Подать заявку
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Магазин / Имя *</label>
                    <input
                      value={regForm.name}
                      onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Например: Техно Базар"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Номер телефона *</label>
                    <input
                      value={regForm.phone}
                      onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+998 90 123 45 67"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Telegram</label>
                    <input
                      value={regForm.telegram}
                      onChange={e => setRegForm(f => ({ ...f, telegram: e.target.value }))}
                      placeholder="@username или https://t.me/username"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Описание</label>
                    <textarea
                      value={regForm.description}
                      onChange={e => setRegForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Кратко о вашем магазине..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => registerMutation.mutate(regForm)}
                      disabled={registerMutation.isPending || !regForm.name || !regForm.phone}
                      className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {registerMutation.isPending ? "Отправка..." : "Подать заявку"}
                    </button>
                    <button
                      onClick={() => setShowRegForm(false)}
                      className="border border-gray-200 px-6 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending approval */}
          {sellerProfile && !sellerProfile.isApproved && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Package size={20} className="text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-bold text-yellow-800">Заявка на рассмотрении</h3>
                  <p className="text-yellow-700 text-sm">Ожидайте подтверждения администратора. Обычно от 30 минут до 2 дней.</p>
                </div>
              </div>
            </div>
          )}

          {sellerProfile?.isApproved && (
            <>
              {/* Seller info */}
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Мой магазин</h2>
                  <span className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                    <CheckCircle size={14} />
                    Подтверждён
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Имя:</span>
                    <span className="ml-2 font-semibold text-gray-800">{sellerProfile.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Телефон:</span>
                    <span className="ml-2 font-semibold text-gray-800">{sellerProfile.phone || "—"}</span>
                  </div>
                  {sellerProfile.telegram && (
                    <div>
                      <span className="text-gray-400">Telegram:</span>
                      <span className="ml-2 font-semibold text-gray-800">{sellerProfile.telegram}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Products */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900">Мои товары</h2>
                  <button
                    onClick={() => setShowProductForm(!showProductForm)}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
                  >
                    <Plus size={16} />
                    Добавить товар
                  </button>
                </div>

                {/* Product form */}
                {showProductForm && (
                  <div className="border border-gray-200 rounded-xl p-5 mb-5 bg-gray-50">
                    <h3 className="font-bold text-gray-800 mb-4">Новый товар</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Название товара *</label>
                        <input
                          value={productForm.name}
                          onChange={e => setProductForm(f => ({ ...f, name: e.target.value, slug: generateSlug(e.target.value) }))}
                          placeholder="Например: Samsung TV 55 дюймов"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Категория *</label>
                        <select
                          value={productForm.categoryId}
                          onChange={e => setProductForm(f => ({ ...f, categoryId: Number(e.target.value) }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                        >
                          <option value={0}>Выберите...</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Бренд</label>
                        <input
                          value={productForm.brand}
                          onChange={e => setProductForm(f => ({ ...f, brand: e.target.value }))}
                          placeholder="Samsung, LG, ..."
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Цена (сум) *</label>
                        <input
                          type="number"
                          value={productForm.price}
                          onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))}
                          placeholder="1500000"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Старая цена (сум)</label>
                        <input
                          type="number"
                          value={productForm.originalPrice}
                          onChange={e => setProductForm(f => ({ ...f, originalPrice: e.target.value }))}
                          placeholder="2000000"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Скидка (%)</label>
                        <input
                          type="number"
                          value={productForm.discount}
                          onChange={e => setProductForm(f => ({ ...f, discount: Number(e.target.value) }))}
                          placeholder="25"
                          min={0} max={99}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Количество (шт)</label>
                        <input
                          type="number"
                          value={productForm.stock}
                          onChange={e => setProductForm(f => ({ ...f, stock: Number(e.target.value) }))}
                          placeholder="10"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">URL фото</label>
                        <input
                          value={productForm.imageUrl}
                          onChange={e => setProductForm(f => ({ ...f, imageUrl: e.target.value }))}
                          placeholder="https://..."
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Описание</label>
                        <textarea
                          value={productForm.description}
                          onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))}
                          rows={3}
                          placeholder="О товаре..."
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                        />
                      </div>
                      {/* Specs */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Технические характеристики</label>
                        <div className="flex gap-2 mb-2">
                          <input
                            value={specKey}
                            onChange={e => setSpecKey(e.target.value)}
                            placeholder="Характеристика (напр.: Мощность)"
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <input
                            value={specVal}
                            onChange={e => setSpecVal(e.target.value)}
                            placeholder="Значение (напр.: 2000W)"
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <button
                            onClick={handleAddSpec}
                            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        {Object.entries(productForm.specs).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-1.5 mb-1 text-sm">
                            <span className="text-gray-600">{k}: <strong>{v}</strong></span>
                            <button onClick={() => handleRemoveSpec(k)} className="text-red-400 hover:text-red-600">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleSubmitProduct}
                        disabled={createProductMutation.isPending}
                        className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {createProductMutation.isPending ? "Добавление..." : "Добавить"}
                      </button>
                      <button
                        onClick={() => setShowProductForm(false)}
                        className="border border-gray-200 px-6 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}

                {/* Products list */}
                {!myProducts || myProducts.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Package size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Товары ещё не добавлены</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myProducts.map(p => (
                      <div key={p.id} className="flex items-center gap-4 border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition-colors">
                        <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                          <p className="text-primary font-bold text-sm">{formatPrice(p.price)}</p>
                        </div>
                        <div className="shrink-0">
                          {p.isApproved ? (
                            <span className="bg-green-50 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">Одобрен</span>
                          ) : (
                            <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full">На проверке</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
