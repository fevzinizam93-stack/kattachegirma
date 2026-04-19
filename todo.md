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

- [ ] Veritabanı: users tablosuna passwordHash alanı ekle
- [ ] Veritabanı: favorites tablosu (userId, productId)
- [ ] Backend: email+şifre ile kayıt (register) endpoint'i
- [ ] Backend: email+şifre ile giriş (login) endpoint'i - JWT cookie
- [ ] Backend: Admin giriş endpoint'i (email+şifre, role=admin kontrolü)
- [ ] Backend: favoriler ekle/kaldır/listele
- [ ] Backend: kullanıcı sipariş geçmişi
- [ ] Frontend: Navbar'a "Войти" butonu ekle
- [ ] Frontend: Giriş/Kayıt modal sayfası
- [ ] Frontend: Kullanıcı profil sayfası (sipariş geçmişi, favoriler)
- [ ] Frontend: Ürün kartlarına favori (kalp) butonu ekle
- [ ] Frontend: Admin paneli - katalog yönetimi
- [ ] Frontend: Admin paneli - adres yönetimi
- [ ] Admin kullanıcısını DB'ye ekle (kullanıcı bilgileri gelince)
