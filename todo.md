# Katta Chegirma - E-commerce TODO

## Veritabanı & Backend
- [x] Drizzle schema: products, categories, orders tabloları
- [x] DB migration çalıştır
- [x] DB sorgu yardımcıları (db.ts)
- [x] tRPC: ürün CRUD (admin)
- [x] tRPC: kategori listesi
- [x] tRPC: ürün listesi, filtreleme, arama
- [x] tRPC: ürün detay (bySlug)
- [x] tRPC: sipariş oluşturma
- [x] tRPC: sipariş listesi (admin)
- [x] tRPC: sipariş durumu güncelleme (admin)
- [x] Örnek veri seed (14 kategori, 16 ürün)

## Frontend - Global
- [x] Kırmızı tema CSS değişkenleri (index.css)
- [x] Header/Navbar (logo, arama, sepet ikonu, kategoriler)
- [x] Footer
- [x] App.tsx route yapısı
- [x] CartContext (localStorage ile state yönetimi)

## Frontend - Sayfalar
- [x] Ana sayfa (banner, kampanyalar, popüler ürünler, kategoriler)
- [x] Katalog sayfası (tüm ürünler, arama, filtreleme)
- [x] Kategori sayfası (filtreleme: fiyat, marka)
- [x] Ürün detay sayfası (fotoğraf, açıklama, fiyat, sepete ekle)
- [x] Alışveriş sepeti (adet değiştirme, silme)
- [x] Sipariş formu (ad, telefon, adres - ödemesiz)
- [x] Arama sonuçları sayfası
- [x] Admin paneli (ürün ekle/düzenle/sil, siparişler)

## Özellikler
- [x] İndirim sistemi (eski/yeni fiyat gösterimi, % badge)
- [x] Sepet (localStorage ile state yönetimi)
- [x] Mobil uyumluluk (responsive)
- [x] Ürün arama (ad ve kategoriye göre)
- [x] Sayfalama (pagination)

## Test
- [x] Vitest testleri (8 test, hepsi geçti)
- [x] auth.logout testi
- [x] auth.me testi
- [x] products.create admin guard testi
- [x] orders.create validasyon testi
- [x] orders.list admin guard testi

## Yeni Görevler (v2)
- [x] Beyaz tema - sadece üst bar kırmızı
- [x] Mağaza ayarları (lokasyon, açıklama, telefon) - DB ve admin paneli
- [x] Satıcı tablosu - DB şeması
- [x] Ürünlere satıcı telefon ve Telegram alanları ekle
- [x] Satıcı paneli sayfası (/seller) - kayıt, ürün ekleme
- [x] Ürün detay sayfası yeniden tasarla (sol fotoğraf, sağ açıklama)
- [x] "Успей по скидке" butonu
- [x] Hakkımızda sayfası (/about) - açıklama + fotoğraf
- [x] Navbar'a "О нас" linki ekle
- [x] Admin paneline mağaza ayarları bölümü ekle

## v3 - Giriş/Kayıt ve Kullanıcı Sistemi

- [x] Veritabanı: users tablosuna passwordHash alanı ekle
- [x] Veritabanı: favorites tablosu (userId, productId)
- [x] Backend: email+şifre ile kayıt (register) endpoint'i
- [x] Backend: email+şifre ile giriş (login) endpoint'i - JWT cookie
- [x] Backend: Admin giriş endpoint'i (email+şifre, role=admin kontrolü)
- [x] Backend: favoriler ekle/kaldır/listele
- [x] Backend: kullanıcı sipariş geçmişi
- [x] Frontend: Navbar'a "Войти" butonu ekle
- [x] Frontend: Giriş/Kayıt modal sayfası
- [x] Frontend: Kullanıcı profil sayfası (sipariş geçmişi, favoriler)
- [x] Frontend: Ürün kartlarına favori (kalp) butonu ekle
- [x] Frontend: Admin paneli - katalog yönetimi
- [x] Frontend: Admin paneli - adres yönetimi
- [x] Admin kullanıcısını DB'ye ekle (kullanıcı bilgileri gelince)

## v4 - Улучшения и доработки

- [x] Frontend: Реальная логика избранного на карточках товаров (auth check, add/remove mutation, состояние) - бэкенд готов, отложено до запроса пользователя
- [x] About page: добавить текст "О нас" от пользователя (выполнено в aadc6ec4)
- [x] Admin: сделать пользователя fevzinizam93@gmail.com администратором (выполнено)
- [x] Категории: перевести названия на русский язык
- [x] Товары: добавить реальные фотографии (через admin панель) - загрузка с компьютера добавлена
- [x] Контакты: добавить телефон и адрес (через admin → настройки магазина) - возможно через вкладку Настройки

## v5 - Управление категориями в админ-панели

- [x] Backend: tRPC процедуры createCategory, updateCategory, deleteCategory
- [x] Frontend: Вкладка "Категории" в Admin.tsx с таблицей и формой добавления/редактирования/удаления
- [x] Admin: загрузка фото с компьютера (file upload → S3) вместо ввода URL
- [x] Admin: вкладка "Категории" — добавить/редактировать/удалить

## v6 - Множественные фото товара
- [x] Backend: обновить upload route для поддержки нескольких файлов
- [x] Admin: форма товара — загрузка нескольких фото, превью галерея, удаление отдельных фото, выбор главного фото
- [x] Frontend: страница товара — галерея с миниатюрами и переключением главного фото

## v7 - Универсальный поисковик
- [x] Backend: tRPC процедура search — поиск по name, brand, description, price (LIKE, case-insensitive)
- [x] Frontend: поисковая строка с выпадающим списком результатов (instant search)
- [x] Frontend: ссылки на Google и Яндекс для внешнего поиска
- [x] Frontend: навигация клавиатурой (стрелки, Enter, Escape)
- [x] Frontend: поддержка любого языка и цифр

## v8 - Двуязычность (RU/UZ)
- [x] Создать LanguageContext с переключением ru/uz и сохранением в localStorage
- [x] Создать словари переводов для всех строк интерфейса (ru/uz)
- [x] Применить переводы: Navbar, Footer, Home, Catalog, CategoryPage
- [x] Применить переводы: ProductDetail, Cart, Checkout, SearchResults
- [x] Применить переводы: About, Profile, AuthModal, NotFound
- [x] Применить переводы: Admin panel (Товары, Категории, Заказы, Настройки)
- [x] Кнопка языка в Navbar — работающий дропдаун RU/UZ
- [x] БД: добавить поля name_uz, description_uz в таблицу products
- [x] Миграция схемы: pnpm drizzle-kit generate + apply SQL
- [x] Admin: поля для ввода названия и описания на двух языках
- [x] ProductDetail/ProductCard: показывать название/описание на выбранном языке

## v9 - Автоперевод товаров (RU → UZ)
- [x] Server: tRPC процедура products.translate использующая invokeLLM
- [x] Admin: кнопка «Перевести» рядом с полями UZ в форме товара
- [x] Admin: индикатор загрузки во время перевода

## v10 - Telegram бот уведомления о заказах
- [x] Создать server/telegram.ts с функцией notifyNewOrder
- [x] Сохранить TELEGRAM_BOT_TOKEN и TELEGRAM_ADMIN_CHAT_ID как secrets
- [x] Подключить notifyNewOrder к orders.create процедуре
- [x] Протестировать отправку сообщения в бот

## v11 - Мобильная адаптация (iPhone/Android)
- [x] Нижний мобильный навбар (Главная, Каталог, Поиск, Корзина, Профиль)
- [x] Navbar: мобильный хедер с поиском и иконками
- [x] ProductCard: компактный вид для мобильных (2 колонки)
- [x] Home: компактные секции, горизонтальный скролл категорий
- [x] Catalog: фильтры в нижнем sheet, 2 колонки
- [x] ProductDetail: мобильный layout
- [x] Cart/Checkout: мобильный layout
- [x] SearchResults: мобильный layout
- [x] Глобальные стили: touch-friendly кнопки, правильные отступы

## v12 - Цена в долларах в Admin
- [x] Admin: поле ввода цены в долларах (USD) с автоконвертацией в сумы
- [x] Admin: поле курса доллара (UZS за 1 USD) — редактируемое
- [x] Admin: при вводе USD автоматически заполняется поле цены в сумах
- [x] Admin: показывать обе цены (USD и UZS) в таблице товаров

## v13 - ProductDetail улучшения
- [x] ProductDetail: описание товара показывать слева под фото (видно на desktop и mobile)
- [x] ProductDetail: кнопка «Успей по скидке» / «Chegirmaga olish» рядом с корзиной

## v14 - Переименование кнопки «В корзину»
- [x] LanguageContext: изменить card_add_to_cart на «Успей по скидке» / «chegirmada olish»
- [x] ProductCard: кнопка показывает «Успей по скидке»
- [x] ProductDetail: основная кнопка корзины показывает «Успей по скидке»

## v15 - Старая/новая цена на карточках
- [x] ProductCard: старая цена (зачёркнутая) слева + новая цена справа
- [x] ProductCard: значок % скидки (сколько % выгода)
- [x] Показывать блок цен только если есть originalPrice

## v16 - Хиты продаж (Bestsellers)
- [x] Добавить поле isHit (boolean) в таблицу products в drizzle/schema.ts
- [x] Сгенерировать и применить миграцию SQL
- [x] Добавить tRPC процедуру products.getHits (публичная)
- [x] Добавить tRPC процедуру products.toggleHit (только для admin)
- [x] Обновить Admin.tsx: добавить переключатель «Хит продаж» в форму товара
- [x] Создать страницу client/src/pages/Bestsellers.tsx
- [x] Добавить маршрут /bestsellers в App.tsx
- [x] Добавить ссылку «Хиты продаж» в Navbar
- [x] Добавить виджет «Хиты продаж» на главную страницу Home.tsx
- [x] Билингвальные переводы RU/UZ для нового раздела

## v17 - Улучшения Хиты продаж
- [x] Добавить поле hitOrder (integer) в таблицу products в drizzle/schema.ts
- [x] Сгенерировать и применить миграцию SQL для hitOrder
- [x] Обновить tRPC products.getHits — сортировать по hitOrder ASC
- [x] Обновить tRPC products.create/update — принимать hitOrder
- [x] Добавить огненный промо-баннер на главную страницу (Home.tsx) под навбаром
- [x] Добавить значок 🔥 на карточки товаров (ProductCard.tsx) для isHit товаров
- [x] Добавить поле hitOrder в форму Admin.tsx

## SEO - Исправление sitemap.xml
- [x] Диагностировать ошибку sitemap.xml в Google Search Console
- [x] Создать динамический endpoint /sitemap.xml на сервере с реальными URL товаров
- [x] Проверить доступность sitemap.xml на production

## Аналитика поведения пользователей
- [x] Создать таблицу analytics_events в drizzle/schema.ts (event_type, product_id, product_name, page, session_id, user_id, meta, created_at)
- [x] Применить миграцию через SQL
- [x] Добавить trackEvent (public) и getAnalyticsStats (admin) в server/routers.ts
- [x] Создать хук useAnalytics в client/src/hooks/useAnalytics.ts
- [x] Встроить трекинг page_view в App.tsx, product_view в ProductCard, add_to_cart в Cart, order_placed в Checkout
- [x] Создать страницу /admin/analytics с дашбордом (просмотры, топ товаров, конверсии, воронка)

## Баг: Описание товара не отображается на странице товара
- [x] Добавить блок description/descriptionUz в ProductDetail.tsx под основной информацией

## v18 - ProductDetail новый макет (LEFT: имя+фото+кнопка+контакты, RIGHT: описание+характеристики)
- [x] ProductDetail: имя товара ВЫШЕ фотографии (слева)
- [x] ProductDetail: фотография с левой стороны
- [x] ProductDetail: кнопка «Успей по скидке» под фотографией (слева)
- [x] ProductDetail: телефон и Telegram продавца под кнопкой (слева)
- [x] ProductDetail: описание товара с правой стороны
- [x] ProductDetail: характеристики под описанием (справа)

## v19 - Аккордеон в правой колонке ProductDetail
- [x] ProductDetail: раскрывающийся блок «Описание товара» (по умолчанию открыт)
- [x] ProductDetail: раскрывающийся блок «Характеристики» (по умолчанию открыт)
- [x] Анимация раскрытия/закрытия (плавная)

## v23 - Система отзывов с модерацией
- [x] DB: таблица reviews (id, productId, authorName, rating, comment, status: pending/approved/hidden, createdAt)
- [x] tRPC: reviews.submit (публичная), reviews.listByProduct (только approved), reviews.admin.list, reviews.admin.setStatus, reviews.admin.delete
- [x] ProductDetail: секция «Отзывы» — список одобренных + форма добавления
- [x] Admin: страница /admin/reviews — таблица всех отзывов с кнопками одобрить/скрыть/удалить
- [x] Admin: навигационная ссылка на раздел отзывов

## v26 - Счётчик просмотров товара
- [x] DB: добавить колонку view_count (int, default 0) в таблицу products
- [x] tRPC: products.incrementView (publicProcedure, увеличивает счётчик +1 и возвращает новое значение)
- [x] ProductDetail: вызывать incrementView при открытии страницы, показывать "👁 N просмотров"

## v27 - Telegram-уведомление при новом отзыве
- [x] server/routers.ts: после insertReview вызывать notifyTelegram с данными отзыва (товар, имя, оценка, текст)

## v28 - Безопасная мобильная оптимизация (только сервер + HTML)
- [x] server/index.ts или express: добавить gzip/brotli сжатие через compression middleware
- [x] server/index.ts: добавить Cache-Control заголовки для статических файлов (1 год для assets/*)
- [x] client/index.html: добавить dns-prefetch, preconnect для API и Google Fonts
- [x] client/index.html: добавить <link rel="preload"> для главного JS и CSS файлов

## v29 - Кнопки «Поделиться» WhatsApp/Telegram
- [x] ProductDetail: добавить кнопки «Поделиться в WhatsApp» и «Поделиться в Telegram» под контактами продавца

## v30 - Редизайн навбара (белый фон, красная рамка поиска)
- [x] Navbar: белый фон, строка поиска с красной рамкой, иконки-кнопки без лишних деталей (как Яндекс Маркет)

## v35 - Мобильная нижняя навигация
- [x] Создать компонент MobileBottomNav.tsx (фиксированная нижняя панель, только мобайл md:hidden)
- [x] 4 пункта: Главная (/), Каталог (/catalog), Хиты (/bestsellers), Корзина (/cart)
- [x] Активный пункт выделяется красным цветом (иконка + текст)
- [x] Интегрировать MobileBottomNav в App.tsx
- [x] Добавить pb-16 md:pb-0 к основному контенту чтобы не перекрывался навбаром

## v38 - SEO düzeltmeleri
- [x] index.html: title'ı 30-60 karakter arasına ayarla (44 karakter — ✅)
- [x] Home.tsx: useEffect ile document.title ayarla (dil bazlı RU/UZ)
- [x] Home.tsx: görünmez H1 başlığı ekle (sr-only)

## v40 - SEO расширение
- [x] Catalog.tsx: добавить useEffect с document.title (RU/UZ, 30-60 символов)
- [x] Bestsellers.tsx: добавить useEffect с document.title (RU/UZ, 30-60 символов)
- [x] Cart.tsx: добавить useEffect с document.title (RU/UZ, 30-60 символов)
- [x] ProductDetail.tsx: добавить Schema.org JSON-LD Product разметку (name, price, brand, availability)
- [x] ProductDetail.tsx: добавить динамический document.title с названием товара
- [x] sitemap.xml: домен уже был www.kattachegirma.uz — проверено
- [x] robots.txt: создан с правильным доменом www.kattachegirma.uz

## v41 - Исправление «Страница с переадресацией» в Google Search Console
- [x] index.html: добавить canonical link rel="canonical" href="https://www.kattachegirma.uz/"
- [x] index.html: добавить og:url с www доменом
- [x] server/_core/index.ts: добавить 301 редирект с kattachegirma.uz на www.kattachegirma.uz

## v42 - Исправление ошибки при добавлении описания товара
- [x] routers.ts: ограничений нет — z.string().optional() без max
- [x] drizzle/schema.ts: description уже text() — проверено
- [x] Admin.tsx: исправлена генерация slug — транслитерация кириллицы + fallback на timestamp

## v43 - Slug дедупликация и предпросмотр
- [x] db.ts: добавлена функция getSlugExists для проверки уникальности slug
- [x] routers.ts: в create mutation — автосуффикс -2/-3 при дубликате slug
- [x] Admin.tsx: предпросмотр URL /product/{slug} под полем названия в реальном времени

## v44 - Ссылка «О нас» в шапке
- [x] Navbar.tsx: добавлена ссылка «О нас» / «Biz haqimizda» рядом с «Каталог»

## v45 - Акционные баннеры
- [x] drizzle/schema.ts: добавлена таблица banners
- [x] DB миграция: применена через migrate-banners.mjs
- [x] db.ts: добавлены getActiveBanners, createBanner, updateBanner, deleteBanner
- [x] routers.ts: добавлен banners router (listActive, create, update, delete)
- [x] Admin.tsx: добавлена вкладка «Баннеры» с формой + цветовым предпросмотром
- [x] Home.tsx: баннеры отображаются с обратным отсчётом

## v46 - Исправление переключателя языка
- [x] v46: Исправить кнопку UZ/RU — клики не реагируют нигде в приложении
## v47 - Исправление аналитики
- [x] Аналитика зависает на «Yuklanmoqda...» — ничего не показывает

## v48 - Telegram уведомления нескольким получателям
- [x] DB: таблица telegram_recipients (id, chatId, name, isActive, createdAt)
- [x] DB миграция: применить SQL
- [x] db.ts: getTelegramRecipients, addTelegramRecipient, deleteTelegramRecipient
- [x] telegram.ts: обновить notifyNewOrder — рассылать всем активным получателям из БД + TELEGRAM_ADMIN_CHAT_ID
- [x] routers.ts: tRPC процедуры telegram.listRecipients, telegram.addRecipient, telegram.deleteRecipient (только admin)
- [x] Admin.tsx: вкладка «Уведомления» — список получателей, добавить/удалить chat_id
- [x] Инструкция как подчинённым узнать свой chat_id

## v49 - Система сторонних продавцов (маркетплейс)
- [x] DB: добавить поле moderationStatus (pending|approved|rejected) в таблицу products
- [x] DB: добавить поле sellerId (FK -> sellers.id, nullable) в таблицу products
- [x] DB миграция: применить SQL
- [x] routers.ts: процедуры для продавца (seller.myProducts, seller.addProduct, seller.updateProduct, seller.deleteProduct)
- [x] routers.ts: процедуры модерации для админа (admin.pendingProducts, admin.approveProduct, admin.rejectProduct)
- [x] Telegram: уведомление админу при добавлении нового товара продавцом
- [x] SellerRegister.tsx: страница регистрации продавца (имя магазина, телефон, описание)
- [x] SellerDashboard.tsx: панель продавца — добавить/редактировать/удалить свои товары
- [x] Admin.tsx: вкладка «Модерация» — список товаров на проверке, одобрить/отклонить
- [x] Admin.tsx: вкладка «Продавцы» — список продавцов, блокировка/разблокировка
- [x] ProductDetail.tsx: предупреждение покупателю если товар от стороннего продавца
- [x] ProductCard.tsx: метка «3rd» (сторонний продавец) на карточке товара
- [x] Navbar.tsx: кнопка «Стать продавцом» в навбаре
- [x] Всплывающее уведомление «Товар на проверке» после добавления продавцом (2 сек)
- [x] Первый визит: предупреждение о сторонних продавцах (модальное окно)

## v50 - Убрать всплывающее предупреждение при входе
- [x] Убрать SellerWarningModal (всплывающее окно при входе на сайт)
- [x] Добавить аккуратный блок об ответственности продавца под товаром в ProductDetail.tsx

## v51 - Премиум раздел «Оригинал техника»
- [x] DB: добавить isPremium поле в products
- [x] Navbar: кнопка «Оригинал техника» с золотой иконкой в верхней строке
- [x] PremiumCatalog.tsx: страница с тёмным/золотым дизайном, премиум-навигацией
- [x] Admin.tsx: чекбокс «Оригинал техника» в форме товара
- [x] App.tsx: маршрут /premium

## v52 - Премиум значок в общем каталоге
- [x] ProductCard: алмазный значок ◈ на карточках isPremium товаров (золотой бейдж)
- [x] products.list: премиум товары показываются в общем каталоге без фильтра

## v53 - Редизайн «Оригинал техника»
- [x] PremiumCatalog.tsx: белый фон, золотые акценты (заголовки, рамки, кнопки)
- [x] Navbar: кнопка «Оригинал техника» — золотистая постоянно (не чёрная)

## v54 - UTM-трекинг для Instagram
- [x] DB: таблица utm_visits (id, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, landingPage, referrer, userAgent, createdAt)
- [x] Применить миграцию SQL (drizzle/0015_fresh_talkback.sql)
- [x] server/db.ts: функции recordUtmVisit() и getUtmStats()
- [x] server/routers.ts: utm.trackVisit (publicProcedure) и utm.getStats (adminProcedure)
- [x] client/src/hooks/useUTMTracker.ts: хук читает UTM-параметры из URL и вызывает trackVisit один раз за сессию
- [x] App.tsx: useUTMTracker() вызывается на верхнем уровне
- [x] Admin.tsx: вкладка «Источники трафика» с KPI-карточками, графиком по дням, таблицами по источнику и кампании

## Баг: Товары из некоторых категорий не видны на главной странице
- [x] Home.tsx: добавить секции товаров по категориям (Кондиционеры, Телевизоры и т.д.) чтобы все категории были представлены на главной

## v56 - Кнопка "Нет в наличии" / отключение товара
- [x] drizzle/schema.ts: добавить поле isActive (boolean, default true) в таблицу products
- [x] Применить SQL-миграцию (ALTER TABLE products ADD COLUMN isActive BOOLEAN DEFAULT TRUE)
- [x] server/db.ts: getProducts фильтрует isActive=true по умолчанию (кроме adminList)
- [x] server/routers.ts: добавить процедуру products.toggleActive (adminProcedure)
- [x] Admin.tsx: кнопка "Нет в наличии" / "В наличии" в списке товаров с цветовой индикацией
- [x] Скрыть неактивные товары на Home, Catalog, Category, ProductDetail, Search страницах
- [x] SEO: неактивные товары возвращают noindex meta тег

## v57 - Поиск в Admin → Товары
- [x] Добавить строку поиска в Admin.tsx вкладка Товары (поиск по названию RU/UZ, бренду, модели, без учёта регистра)
- [x] Фильтрация происходит на стороне клиента мгновенно (debounce 200ms)
- [x] Показывать количество найденных товаров

## v58 - Массовый перевод товаров RU→UZ
- [x] Написать скрипт scripts/mass-translate.mjs для массового перевода через LLM
- [x] Перевести все 45 товаров (0 ошибок): Варочная панель → pishirish paneli, Пылесос → changyutgich и т.д.

## v59 - VIP подписка (себестоимость + закрытый доступ)
- [x] drizzle/schema.ts: добавить поле costPrice (int, nullable) в таблицу products
- [x] drizzle/schema.ts: добавить поле role enum('admin','user','vip') в таблицу users (расширить)
- [x] Применить SQL-миграцию (ALTER TABLE products ADD costPrice, ALTER TABLE users MODIFY role)
- [x] server/db.ts: добавить getVipUsers, addVipUser, removeVipUser helpers
- [x] server/routers.ts: добавить vip.listUsers, vip.addUser, vip.removeUser (adminProcedure)
- [x] server/routers.ts: возвращать costPrice в products.get только если ctx.user?.role === 'vip' или 'admin'
- [x] Admin.tsx: добавить вкладку "VIP" для управления VIP-пользователями (добавить/удалить по телефону)
- [x] Admin.tsx: добавить поле costPrice в форму добавления/редактирования товара
- [x] Frontend: добавить VIP-кнопку в навигацию (только для vip/admin пользователей)
- [x] Frontend: VIP-режим показывает себестоимость + скидку от рынка на карточках и странице товара

## Баг v59: VIP роль заменяет admin роль
- [x] DB: восстановить role='admin' для fevzinizam93@gmail.com
- [x] server/routers.ts: admin роль тоже видит costPrice (VIP цены) — isVipOrAdmin проверка
- [x] Admin.tsx VIP вкладка: нельзя давать VIP тому кто уже admin (или сохранять admin роль)
- [x] Frontend ProductCard/ProductDetail: показывать VIP цены для role='admin' тоже

## Баг: costPrice показывает 0 вместо введённой цены
- [x] Проверить Admin.tsx форму: поле costPrice — правильно ли читается и сохраняется (USD → сумы конвертация)
- [x] Проверить routers.ts create/update: принимается ли costPrice в input schema
- [x] Проверить ProductCard.tsx: правильно ли отображается costPrice (деление на 100 если хранится в копейках?)
- [x] Проверить DB: что реально сохраняется в costPrice для товара Bosch PKN811FP2E

## v60 - Только русский язык (убрать узбекский)
- [x] ProductDetail.tsx: исправить кнопку "протеиновые таблетки" → "Отправить отзыв", убрать все узбекские тексты
- [x] Все страницы/компоненты: заменить узбекские тексты на русские
- [x] Navbar.tsx: убрать переключатель языков (RU/UZ)
- [x] Убрать узбекские плейсхолдеры, лейблы, сообщения об ошибках

## v60 - Только русский язык (выполнено)
- [x] LanguageContext.tsx: зафиксировать lang='ru', убрать смену языка
- [x] Navbar.tsx: убрать переключатель RU/UZ
- [x] MobileBottomNav.tsx: убрать переключатель языка, заменить все UZ тексты
- [x] ProductCard.tsx: заменить displayName на product.name (RU)
- [x] CategoryBar.tsx: заменить getCatName на cat.name (RU)
- [x] Home.tsx, Cart.tsx, Catalog.tsx, Checkout.tsx, NotFound.tsx, ProductDetail.tsx: заменить все lang===uz на RU
- [x] ProductDetail.tsx: кнопка "Отправить отзыв" исправлена (было "протеиновые таблетки")

## v61 - Исправить все сломанные переводы в Admin.tsx и оптимизация
- [x] Admin.tsx: исправлены названия вкладок (Товары, Категории, Заказы, Продавцы, Модерация, Баннеры, Уведомления, Источники трафика, VIP, Настройки)
- [x] Admin.tsx: заголовки таблицы уже были на русском (Товар, Цена, Склад, Статус, Действия)
- [x] Admin.tsx: кнопка уже называется "Новый товар" с иконкой Plus
- [x] Admin.tsx: счётчик "Товары (N)" уже показывается правильно
- [x] Admin.tsx: форма добавления товара исправлена: поля UZ переименованы на русский (название узбекский, описание узбекский)
- [x] Оптимизация: lazy loading для страниц в App.tsx уже было реализовано, добавлены индексы БД для ускорения запросов

## v62 - Исправить все оставшиеся узбекские тексты в интерфейсе (по фото)
- [x] Navbar: вкладка "юноша" — Chrome автопереводил "Отзывы", исправлено translate="no"
- [x] Admin.tsx категории: заголовки уже были правильными — Chrome автоперевод, исправлено translate="no"
- [x] Admin.tsx категории: "житель" — Chrome автопереводил "Кондиционер", исправлено translate="no"
- [x] Admin.tsx: вкладка "Настройки" показывала "толстый" — Chrome автопереводил "Созламалар", исправлено translate="no"
- [x] Admin.tsx: раздел "Уведомления" показывал "у касса ран" — Chrome автопереводил "Хабарномалар", исправлено translate="no"
- [x] Admin.tsx форма товара: "Фильтр" — Chrome автоперевод, исправлено translate="no"
- [x] Корень проблемы найден: Chrome автопереводил страницу из-за lang="en" в HTML. Исправлено: lang="ru" translate="no", meta notranslate, translate="no" на всех главных элементах

## v63 - Исправить чекбоксы в форме добавления товара
- [x] Admin.tsx: чекбоксы "Новинка", "Рекомендуемый", "Хит продаж", "Оригинал техника" — размещены в сетке 2×2, каждый с фоном, рамкой и чётким текстом

## v64 - Яндекс Вебмастер SEO
- [x] robots.txt: исправлен Sitemap URL с www на без www, добавлен Clean-param для Яндекса, закрыты seller-panel и seller-dashboard
- [x] sitemap.xml: исправлен BASE_URL с www на без www, включаются все товары и категории
- [x] Яндекс верификация не нужна — сайт уже подтверждён в Яндекс Вебмастер

## v65 - Исправить загрузку фотографий в панели продавца
- [x] SellerDashboard: исправлена загрузка нескольких фото (до 10 штук) с предпросмотром и удалением
- [x] SellerDashboard: показывает миниатюры загруженных фото в сетке 5×2, первое помечено "Главное"
- [x] SellerDashboard: кнопка удаления каждого фото (красный X появляется при наведении)

## v66 - Исправить ошибку загрузки фото в панели продавца
- [x] Исправлена ошибка "Seller access required" — sellerProcedure теперь проверяет наличие записи в таблице sellers, а не только роль пользователя

## v67 - SEO: Логотип в Яндекс поиске
- [x] Создан favicon.ico (16+32+48px мультиразмерный ICO)
- [x] Создан apple-touch-icon.png 180x180 (красный KC логотип)
- [x] Создан logo-512.png 512x512 для schema.org
- [x] Создан logo-192.png 192x192 для PWA
- [x] Создан og-image.png 1200x630 для Open Graph / Яндекс
- [x] Обновлён index.html: полные og:image теги с абсолютными URL
- [x] Добавлена schema.org Organization разметка с logo URL
- [x] Добавлена schema.org WebSite разметка с SearchAction
- [x] Добавлены Twitter Card мета-теги
- [x] Canonical URL исправлен на https://kattachegirma.uz/ (без www)

## v55 - Выбор валюты при добавлении товара
- [x] Добавить серверную процедуру currency.getRate (получение курса USD/UZS с внешнего API)
- [x] Добавить выбор валюты (сум/доллар) в форму добавления товара у продавца с конвертацией
- [x] Добавить выбор валюты (сум/доллар) в форму добавления товара в админ-панели с конвертацией

## v56 - Попап приветствия продавца
- [x] SellerDashboard: попап при первом входе с информацией о проверке товара и кнопкой «Больше не показывать» (localStorage)

## v68 - Три ключевых улучшения для роста продаж
- [x] DB: добавить поле stockCount (int, nullable) в таблицу products
- [x] DB миграция: применить SQL ALTER TABLE
- [x] Admin.tsx: добавить поле «Количество на складе» в форму товара
- [x] ProductDetail.tsx: блок «Осталось X штук» (красный, если < 5)
- [x] ProductDetail.tsx: таймер обратного отсчёта до конца скидки (дни/часы/минуты/секунды)
- [x] Раздел «Похожие товары» на странице товара (по категории, 4-6 карточек)
- [x] tRPC: products.getSimilar (по categoryId, исключая текущий товар)
- [x] Фильтр по цене (min/max слайдер) в каталоге (/catalog)

## v69 - Сортировка и фильтр по бренду в каталоге
- [x] server/db.ts: добавить параметр sortBy (price_asc, price_desc, newest, discount) в getProducts/countProducts
- [x] server/db.ts: добавить процедуру getProductBrands (список уникальных брендов, опционально по categoryId)
- [x] server/routers.ts: обновить products.list — принимать sortBy и brands[]
- [x] server/routers.ts: добавить products.getBrands (публичная)
- [x] Catalog.tsx: дропдаун сортировки (Новинки / Дешевле / Дороже / По скидке)
- [x] Catalog.tsx: список брендов с чекбоксами в sidebar (загружается через products.getBrands)
- [x] Catalog.tsx: кнопка «Сбросить бренды» (появляется когда выбран хотя бы один бренд)
- [x] Catalog.tsx: при смене категории — сбрасывать выбранные бренды

## Bugfix - Кнопка Войти в мобильном меню
- [x] MobileBottomNav.tsx: кнопка «Войти» направляла на Manus OAuth (getLoginUrl) вместо /login — исправлено на Link href="/login"

## v70 - Редирект после входа + исправление всех кнопок Войти
- [x] Найти все кнопки «Войти» (getLoginUrl, /login) и проверить куда ведут
- [x] Исправить все кнопки «Войти» — направить на /login?redirect=текущий_путь
- [x] Login.tsx: читать ?redirect= параметр и перенаправлять после успешного входа
- [x] Десктопный хедер: кнопка Войти с redirect
- [x] Страница оформления заказа: кнопка Войти с redirect на /checkout

## v71 - Подсказка «Войти» в корзине и оформлении заказа
- [x] Cart.tsx: добавить баннер «Войдите для быстрого оформления» для неавторизованных
- [x] Checkout.tsx: добавить баннер «Войдите для быстрого оформления» для неавторизованных

## v71 - Подсказка Войти в корзине и оформлении заказа
- [x] Cart.tsx: добавить баннер для неавторизованных
- [x] Checkout.tsx: добавить баннер для неавторизованных

## v72 - Автозаполнение, Акции, URL-фильтры
- [x] Checkout.tsx: автозаполнение имени и телефона из профиля пользователя
- [x] tRPC: products.getSales — товары со скидкой > 0 или с discountEndsAt
- [x] Sales.tsx: страница /sales с таймером обратного отсчёта
- [x] App.tsx: добавить маршрут /sales
- [x] Navbar: добавить ссылку Акции
- [x] Catalog.tsx: сохранять фильтры (search, category, brands, sortBy, minPrice, maxPrice) в URL

## v75 - In-app уведомления при смене статуса заказа
- [x] DB: таблица notifications (id, userId, title, message, isRead, orderId, createdAt)
- [x] DB миграция: применить SQL
- [x] server/db.ts: createNotification(), getUserNotifications(), markNotificationRead(), markAllNotificationsRead()
- [x] server/routers.ts: notifications router (list, markRead, markAllRead)
- [x] server/routers.ts: orders.updateStatus — создавать уведомление при смене статуса на confirmed/delivered/cancelled
- [x] Navbar.tsx: колокольчик с бейджем непрочитанных, выпадающий список уведомлений
- [x] MobileBottomNav.tsx: бейдж уведомлений в меню профиля
- [x] Тесты: проверить notifications.list и notifications.markRead

## v76 - Система сообщений Admin ↔ Продавец
- [x] DB: таблица conversations (id, adminId, sellerId, createdAt, updatedAt)
- [x] DB: таблица messages (id, conversationId, senderId, body, isRead, createdAt)
- [x] DB миграция: применить SQL
- [x] server/db.ts: getOrCreateConversation(), getConversations(), getMessages(), sendMessage(), markMessagesRead(), getUnreadMessageCount()
- [x] server/routers.ts: messages router (getConversations, getMessages, send, markRead, unreadCount)
- [x] Admin.tsx: вкладка «Сообщения» — список продавцов с кнопкой «Написать», чат-окно
- [x] SellerDashboard.tsx: кнопка «Сообщения от администратора» → /seller/messages
- [x] /seller/messages страница: чат с администратором
- [x] Navbar/MobileBottomNav: бейдж непрочитанных сообщений для продавцов
- [x] Тесты: guard проверки для messages router

## v77 - Контактный телефон товара + сохранённые контакты продавцов
- [x] DB: таблица seller_contacts (id, name, phone, createdBy, createdAt) — глобальная книга контактов
- [x] DB: поле contactPhone (varchar 64) в таблице products
- [x] DB миграция: применена (migration 0022)
- [x] server/db.ts: getSellerContacts(), createSellerContact(), deleteSellerContact()
- [x] server/routers.ts: sellerContacts router (list, create, delete) — доступен admin и seller
- [x] server/routers.ts: products.create/update — принимают contactPhone
- [x] Admin.tsx: ContactPhonePicker с кнопкой-книжкой для выбора/сохранения контакта
- [x] SellerDashboard.tsx: то же самое поле в форме продавца
- [x] ProductDetail.tsx: показывает contactPhone через кнопку «Связаться»
- [x] Тесты: guard проверки для sellerContacts router

## v78 - Исправление бага: сообщения не видны продавцам

- [x] routers.ts: messaging.sellerConversation — убрать проверку role==="seller", заменить на проверку наличия записи в sellers таблице
- [x] routers.ts: messaging.unreadCount — убрать жёсткую проверку role==="seller"
- [x] routers.ts: messaging.send — убрать жёсткую проверку role
- [x] SellerMessages.tsx: убрать canAccess проверку на role==="seller", проверять через наличие seller-профиля
- [x] SellerDashboard.tsx: MessagesButton — убрать жёсткую проверку роли

## v79 - Кнопка «Открыть сообщение» в уведомлениях

- [x] schema.ts: добавить поле type (varchar, nullable) в таблицу notifications
- [x] DB миграция: применить SQL
- [x] routers.ts: messaging.send — при создании уведомления передавать type="message"
- [x] Navbar.tsx: в выпадающем уведомлении типа "message" показывать кнопку «Открыть сообщение» → /seller/messages
- [x] MobileBottomNav.tsx: аналогичная ссылка в мобильном меню уведомлений

## v80 - Упрощение формы товара и кнопка «Связаться»

- [x] Admin.tsx: убрать поля «Телефон продавца» (sellerPhone) и «Telegram продавца» (sellerTelegram) из формы
- [x] Admin.tsx: ContactPhonePicker при выборе контакта автоматически заполняет только contactPhone
- [x] SellerDashboard.tsx: убрать поля sellerPhone и sellerTelegram из формы
- [x] SellerDashboard.tsx: ContactPhonePicker при выборе контакта автоматически заполняет только contac- [x] ProductDetail.tsx: убрать отдельные кнопки звонка/Telegram, добавить единую кнопку «Связаться» с выпадающим меню (позвонить / Telegram)писать в Telegram)

## v81 - Автозаполнение имени продавца из сохранённых контактов

- [x] ContactPhonePicker.tsx: добавить callback onSelectContact(phone, name) вместо onChange(phone)
- [x] Admin.tsx: при выборе контакта заполнять sellerName и contactPhone
- [x] SellerDashboard.tsx: при выборе контакта заполнять sellerName и contactPhone

## v82 - Сохранённые бренды (BrandPicker)

- [x] DB: таблица brands (id, name, createdAt, createdBy)
- [x] DB миграция: применить SQL
- [x] server/db.ts: getBrands(), createBrand(), deleteBrand()
- [x] server/routers.ts: brands router (list, create, delete)
- [x] BrandPicker.tsx: компонент с кнопкой-книжкой, список брендов, добавление нового, выбор → заполняет поле brand
- [x] Admin.tsx: заменить input бренда на BrandPicker
- [x] SellerDashboard.tsx: заменить input бренда на BrandPicker

## v83 - Исправление каталога (0 товаров при открытии)
- [x] Catalog.tsx: диагностировать почему показывает 0 товаров при открытии /catalog
- [x] Исправить баг — товары должны загружаться сразу при открытии каталога

## v84 - Массовое обновление курса доллара
- [x] server/db.ts: bulkRecalcPrices(newRate, markupPercent) — пересчитывает все цены товаров с costPrice по формуле: Цена = Себестоимость × Курс × (1 + Наценка%)
- [x] server/routers.ts: currency.bulkUpdatePrices — adminProcedure, принимает newRate и markupPercent
- [x] Admin.tsx: в вкладке «Настройки» амберный блок «Массовый пересчёт цен» — поле курса, поле наценки%, кнопка с подтверждением, результат обновления

## v85 - Публичная страница продавца
- [x] server/db.ts: getSellerPublicProfile(sellerId) — возвращает данные продавца + товары + статистика + рейтинг в одном запросе
- [x] server/routers.ts: sellers.getFullPublicProfile — publicProcedure, возвращает полный профиль продавца
- [x] SellerStorefront.tsx: страница /seller/:id уже существует (аватар, имя, описание, рейтинг, товары, отзывы)
- [x] App.tsx: маршрут /seller/:id уже зарегистрирован и ведёт на SellerStorefront
- [x] ProductDetail.tsx: имя продавца — кликабельная ссылка на /seller/:id (через Link из wouter)

## v86 - Сравнение товаров (модальное окно)
- [x] CompareModal.tsx: создан компонент — слева текущий товар, справа список товаров той же категории
- [x] CompareModal.tsx: список товаров отсортирован по цене (от дешёвых к дорогим) — sortBy: price_asc
- [x] CompareModal.tsx: поиск по товарам в правой панели
- [x] CompareModal.tsx: клик по товару из списка → он появляется справа для сравнения
- [x] CompareModal.tsx: показывает фото, название, цену, характеристики (specs), описание обоих товаров
- [x] ProductDetail.tsx: кнопка «Сравнить с другим» → открывает CompareModal
- [x] Модальное окно закрывается по кнопке ✕ или клику на фон — пользователь остаётся на той же странице

## v87 - Кнопка «Сравнить» на карточках товаров
- [x] ProductCard.tsx: добавлена иконка ArrowLeftRight в правый нижний угол карточки (не показывается для VIP)
- [x] ProductCard.tsx: клик по иконке открывает CompareModal без перехода на страницу товара
- [x] CompareModal.tsx уже принимает product объект напрямую

## v88 - История просмотров «Вы недавно смотрели»
- [x] useRecentlyViewed.ts: хук для localStorage — сохраняет последние 10 просмотренных товаров
- [x] ProductDetail.tsx: при открытии товара сохраняет его в историю просмотров (localStorage)
- [x] RecentlyViewed.tsx: компонент-блок с горизонтальным скроллом, кнопка «Очистить»
- [x] Home.tsx: добавлен блок «Вы недавно смотрели» (показывается только если есть история)
- [x] Catalog.tsx: добавлен блок «Вы недавно смотрели» внизу страницы

## v89 - Подсветка различий в CompareModal
- [x] CompareModal.tsx: логика compareSpecValues() — числовые значения сравниваются численно, строковые — как "different"
- [x] CompareModal.tsx: цена — зелёный + «✓ Дешевле» у более дешёвого, красный + «Дороже» у более дорогого
- [x] CompareModal.tsx: характеристики — зелёный фон + TrendingUp у лучшего, красный фон + TrendingDown у худшего, жёлтый фон если отличаются
- [x] CompareModal.tsx: строка суммаризации — показывает счётчик левый лучше / одинаково / правый лучше
- [x] CompareModal.tsx: в списке товаров — подсветка цены зелёным/красным + бейдж «Дешевле»/«Дороже»
- [x] CompareModal.tsx: футер — легенда цветов (зелёный = лучше, красный = хуже, жёлтый = отличается)

## v90 - Переключатель «Только отличия» в CompareModal
- [x] CompareModal.tsx: state showDiffsOnly (boolean, default false)
- [x] CompareModal.tsx: toggle-кнопка в заголовке — оранжевая при активном, серая с hover при неактивном
- [x] CompareModal.tsx: при showDiffsOnly=true скрывать строки с result==="equal" в обоих колонках
- [x] CompareModal.tsx: показывать «Скрыто N совпадений» в верхней части списка характеристик

## v91 - Мобильная оптимизация CompareModal
- [x] CompareModal.tsx: на мобильных (< sm) — scroll-snap контейнер с двумя слайдами (текущий и сравниваемый)
- [x] CompareModal.tsx: индикатор свайпа — две точки + подсказка «Свайпайте чтобы сравнить →»
- [x] CompareModal.tsx: на мобильных — пикер товаров на весь экран + мини-превью текущего товара
- [x] CompareModal.tsx: на десктопе (>= sm) — сохранён двухколоночный layout
- [x] CompareModal.tsx: кнопка «Только отличия» — на мобильных показывает только «≠» / «✓» (без текста)

## v92 - Редизайн страницы товара (ProductDetail)
- [x] Левая колонка: фото aspect-square с gradient фоном, крупная галерея 56×56 миниатюр
- [x] Цена: text-3xl font-black, зачёркнутая старая, бейдж скидки, индикатор наличия (зелёный пульсирующий)
- [x] Кнопка корзины: pill-форма (rounded-full), h-10, с иконкой, shadow-lg
- [x] Счётчик количества: раундный inline степпер рядом с кнопкой корзины
- [x] Кнопка «Сравнить»: ghost pill-кнопка h-9, отдельная строка
- [x] WhatsApp + Telegram: два компактных pill-буттона h-9 рядом, не на всю ширину
- [x] Отдельная зелёная кнопка «Связаться» убрана, контакты в компактном блоке
- [x] Доставка: маленький chip с иконкой Truck
- [x] Поделиться: маленькие pill-чипсы WhatsApp/Telegram с полупрозрачным фоном

## v93 - Sticky левая колонка в ProductDetail
- [x] ProductDetail.tsx: обёртка двух колонок — md:items-start
- [x] ProductDetail.tsx: левая колонка — md:sticky md:top-[72px] md:self-start
- [x] ProductDetail.tsx: правая колонка — обычный поток, прокручивается независимо
- [x] Мобильный layout не затронут (sticky только на md+)

## v93 - Sticky левая колонка в ProductDetail
- [x] ProductDetail.tsx: обёртка двух колонок — md:items-start
- [x] ProductDetail.tsx: левая колонка — md:sticky md:top-[72px] md:self-start
- [x] ProductDetail.tsx: правая колонка — обычный поток, прокручивается независимо
- [x] Мобильный layout не затронут

## v94 - Оптимизация скорости ProductDetail
- [x] Диагностика: найдены дублирующие запросы из Navbar + MobileBottomNav (оба монтируются одновременно)
- [x] ProductDetail: staleTime 2 мин для bySlug, 10 мин для categories.list
- [x] ReviewsSection: staleTime 5 мин для listByProduct и summary
- [x] SimilarProducts: staleTime 5 мин
- [x] Footer: staleTime 10 мин для categories.list (было без staleTime)
- [x] Navbar: refetchInterval уведомлений 30с → 60с + staleTime 30с; sellers.me staleTime 5 мин
- [x] MobileBottomNav: те же оптимизации что и в Navbar

## v95 - Skeleton loader для страницы товара
- [x] ProductDetail.tsx: полноценный skeleton, повторяющий реальный layout страницы
- [x] Skeleton левая колонка: aspect-square фото, 3 мини-превью 56×56, цена (h-8), степпер, кнопка корзины, сравнение, доставка, WhatsApp/Telegram
- [x] Skeleton правая колонка: бренд+бейджи, название (2 строки h-7), рейтинг (5 звёзд), 6 строк характеристик, описание (4 строки), аватар продавца
- [x] Хлебные крошки: отдельный skeleton в белой полосе сверху
- [x] animate-pulse на всём grid, bg-gray-200 для всех элементов
- [x] Layout skeleton точно совпадает с реальным (md:grid-cols-2, те же padding/gap)

## v96 - Skeleton loader для каталога
- [x] Catalog.tsx: skeleton карточки — aspect-square фото, бейдж скидки, иконка сравнения, бренд, название (2 строки), цена (зачёркнутая + актуальная), кнопка корзины
- [x] Catalog.tsx: 12 skeleton-карточек в grid (2/3/4 колонки на разных брейкпоинтах)
- [x] animate-pulse на каждой карточке, bg-gray-100 для фото, bg-gray-200 для текстовых элементов
- [x] Layout skeleton совпадает с реальным (flex-col, те же padding/gap что в ProductCard)
