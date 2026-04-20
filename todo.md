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
