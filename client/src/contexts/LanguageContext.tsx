import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "ru" | "uz";

export interface Translations {
  // Navbar
  nav_home: string;
  nav_catalog: string;
  nav_about: string;
  nav_cart: string;
  nav_login: string;
  nav_admin: string;
  nav_search_placeholder: string;
  nav_search_on_site: string;
  nav_search_in_google: string;
  nav_search_in_yandex: string;
  nav_search_loading: string;
  nav_show_all_results: string;
  nav_not_found_on_site: string;
  nav_search_internet: string;
  nav_premium: string;
  nav_bestsellers: string;
  nav_become_seller: string;

  // Footer
  footer_catalog: string;
  footer_about: string;
  footer_contacts: string;
  footer_seller: string;
  footer_rights: string;
  footer_tagline: string;

  // Home
  home_big_discounts: string;
  home_lowest_prices: string;
  home_view_all: string;
  home_categories: string;
  home_popular: string;
  home_new_arrivals: string;
  home_all_products: string;
  home_bestsellers: string;
  home_bestsellers_desc: string;
  home_view: string;
  home_time_left: string;
  home_days: string;
  home_hours: string;

  // Catalog
  catalog_title: string;
  catalog_search_placeholder: string;
  catalog_all_categories: string;
  catalog_sort_default: string;
  catalog_sort_price_asc: string;
  catalog_sort_price_desc: string;
  catalog_sort_new: string;
  catalog_no_products: string;
  catalog_loading: string;
  catalog_filter_price: string;
  catalog_filter_brand: string;
  catalog_filter_apply: string;
  catalog_filter_reset: string;
  catalog_products_found: string;

  // Product card
  card_add_to_cart: string;
  card_new: string;
  card_in_cart: string;
  card_hit: string;
  card_original: string;
  card_added_to_cart: string;

  // Product detail
  detail_add_to_cart: string;
  detail_buy_now: string;
  detail_description: string;
  detail_brand: string;
  detail_category: string;
  detail_seller: string;
  detail_seller_phone: string;
  detail_seller_telegram: string;
  detail_contact_seller: string;
  detail_in_stock: string;
  detail_out_of_stock: string;
  detail_share: string;
  detail_images: string;
  detail_back: string;
  detail_not_found: string;
  detail_not_found_desc: string;
  detail_old_price: string;
  detail_new_price: string;
  detail_saving: string;
  detail_pcs: string;
  detail_delivery: string;
  detail_delivery_desc: string;
  detail_about: string;
  detail_specs: string;
  detail_buy_discount: string;
  detail_no_description: string;
  detail_reviews: string;
  detail_no_reviews: string;
  detail_be_first: string;
  detail_third_party: string;
  detail_third_party_desc: string;
  detail_added_qty: string;
  detail_buy_in_city: string;

  // Cart
  cart_title: string;
  cart_empty: string;
  cart_empty_desc: string;
  cart_go_catalog: string;
  cart_total: string;
  cart_checkout: string;
  cart_remove: string;
  cart_quantity: string;
  cart_continue: string;

  // Checkout
  checkout_title: string;
  checkout_name: string;
  checkout_phone: string;
  checkout_address: string;
  checkout_comment: string;
  checkout_submit: string;
  checkout_success: string;
  checkout_success_desc: string;
  checkout_back_home: string;
  checkout_required: string;

  // Search results
  search_title: string;
  search_found: string;
  search_not_found: string;
  search_not_found_desc: string;
  search_try_google: string;
  search_try_yandex: string;
  search_not_found_try: string;

  // About
  about_title: string;

  // Auth modal
  auth_login: string;
  auth_register: string;
  auth_email: string;
  auth_password: string;
  auth_name: string;
  auth_login_btn: string;
  auth_register_btn: string;
  auth_no_account: string;
  auth_have_account: string;
  auth_forgot_password: string;
  auth_logout: string;

  // Profile
  profile_title: string;
  profile_orders: string;
  profile_favorites: string;
  profile_no_orders: string;
  profile_no_favorites: string;
  profile_order_number: string;
  profile_order_date: string;
  profile_order_status: string;
  profile_order_total: string;

  // Admin
  admin_products: string;
  admin_categories: string;
  admin_orders: string;
  admin_sellers: string;
  admin_settings: string;
  admin_add_product: string;
  admin_edit_product: string;
  admin_delete_product: string;
  admin_product_name: string;
  admin_product_name_uz: string;
  admin_product_description: string;
  admin_product_description_uz: string;
  admin_product_price: string;
  admin_product_old_price: string;
  admin_product_brand: string;
  admin_product_category: string;
  admin_product_stock: string;
  admin_product_images: string;
  admin_save: string;
  admin_cancel: string;
  admin_confirm_delete: string;
  admin_add_category: string;
  admin_category_name: string;
  admin_category_slug: string;
  admin_category_icon: string;
  admin_order_id: string;
  admin_order_customer: string;
  admin_order_status: string;
  admin_order_total: string;
  admin_order_date: string;
  admin_settings_title: string;
  admin_settings_save: string;

  // Status labels
  status_pending: string;
  status_processing: string;
  status_shipped: string;
  status_delivered: string;
  status_cancelled: string;

  // Seller
  seller_become: string;
  seller_dashboard: string;
  seller_register_title: string;
  seller_register_subtitle: string;
  seller_store_name: string;
  seller_phone: string;
  seller_telegram: string;
  seller_telegram_optional: string;
  seller_description: string;
  seller_description_optional: string;
  seller_submit: string;
  seller_submitting: string;
  seller_pending_title: string;
  seller_pending_desc: string;
  seller_login_required: string;
  seller_login_desc: string;
  seller_login_btn: string;
  seller_required_fields: string;
  seller_submitted: string;
  seller_store_placeholder: string;
  seller_phone_placeholder: string;
  seller_desc_placeholder: string;
  seller_add_product: string;
  seller_no_products: string;
  seller_no_products_hint: string;
  seller_moderation_pending: string;
  seller_moderation_approved: string;
  seller_moderation_rejected: string;
  seller_upload_image: string;
  seller_uploading: string;
  seller_saving: string;
  seller_update: string;
  seller_send: string;
  seller_product_sent: string;
  seller_product_updated: string;
  seller_product_deleted: string;
  seller_image_error: string;
  seller_confirm_delete: string;
  seller_go_home: string;

  // Premium
  premium_title: string;
  premium_subtitle: string;
  premium_badge: string;
  premium_no_products: string;

  // NotFound
  not_found_title: string;
  not_found_desc: string;
  not_found_home: string;

  // Common
  common_loading: string;
  common_error: string;
  common_save: string;
  common_cancel: string;
  common_delete: string;
  common_edit: string;
  common_add: string;
  common_close: string;
  common_yes: string;
  common_no: string;
  common_back: string;
  common_sum: string;
  common_pieces: string;
  common_not_found: string;
  common_searching: string;
  common_not_found_query: string;
}

const ru: Translations = {
  // Navbar
  nav_home: "Главная",
  nav_catalog: "Каталог",
  nav_about: "О нас",
  nav_cart: "Корзина",
  nav_login: "Войти",
  nav_admin: "Admin",
  nav_search_placeholder: "Поиск по названию, модели, бренду...",
  nav_search_on_site: "Товары на сайте",
  nav_search_in_google: "Найти в Google",
  nav_search_in_yandex: "Найти в Яндексе",
  nav_search_loading: "Поиск...",
  nav_show_all_results: "Показать все результаты для",
  nav_not_found_on_site: "На сайте ничего не найдено по",
  nav_search_internet: "Поиск в интернете",
  nav_premium: "Premium",
  nav_bestsellers: "Хиты",
  nav_become_seller: "Стать продавцом",

  // Footer
  footer_catalog: "Каталог",
  footer_about: "О нас",
  footer_contacts: "Контакты",
  footer_seller: "Стать продавцом",
  footer_rights: "Все права защищены",
  footer_tagline: "Самые низкие цены на технику в Узбекистане",

  // Home
  home_big_discounts: "БОЛЬШИЕ СКИДКИ!",
  home_lowest_prices: "Самые низкие цены — только у нас",
  home_view_all: "Смотреть все",
  home_categories: "Категории товаров",
  home_popular: "Популярные товары",
  home_new_arrivals: "Новинки",
  home_all_products: "Все товары",
  home_bestsellers: "Хиты продаж",
  home_bestsellers_desc: "Самые популярные товары по лучшим ценам",
  home_view: "Смотреть",
  home_time_left: "Осталось:",
  home_days: "д",
  home_hours: "ч",

  // Catalog
  catalog_title: "Каталог товаров",
  catalog_search_placeholder: "Поиск товаров...",
  catalog_all_categories: "Все категории",
  catalog_sort_default: "По умолчанию",
  catalog_sort_price_asc: "Цена: по возрастанию",
  catalog_sort_price_desc: "Цена: по убыванию",
  catalog_sort_new: "Новинки",
  catalog_no_products: "Товары не найдены",
  catalog_loading: "Загрузка...",
  catalog_filter_price: "Цена",
  catalog_filter_brand: "Бренд",
  catalog_filter_apply: "Применить",
  catalog_filter_reset: "Сбросить",
  catalog_products_found: "товаров найдено",

  // Product card
  card_add_to_cart: "Успей по скидке",
  card_new: "НОВИНКА",
  card_in_cart: "В корзине",
  card_hit: "Хит",
  card_original: "Оригинал",
  card_added_to_cart: "Добавлено в корзину!",

  // Product detail
  detail_add_to_cart: "Успей по скидке",
  detail_buy_now: "Успей по скидке!",
  detail_description: "Описание",
  detail_brand: "Бренд",
  detail_category: "Категория",
  detail_seller: "Продавец",
  detail_seller_phone: "Телефон продавца",
  detail_seller_telegram: "Telegram продавца",
  detail_contact_seller: "Связаться с продавцом",
  detail_in_stock: "В наличии",
  detail_out_of_stock: "Нет в наличии",
  detail_share: "Поделиться",
  detail_images: "Фотографии",
  detail_back: "Назад",
  detail_not_found: "Товар не найден",
  detail_not_found_desc: "Этот товар не существует или был удалён.",
  detail_old_price: "Старая цена",
  detail_new_price: "Новая цена со скидкой",
  detail_saving: "Экономия",
  detail_pcs: "шт.",
  detail_delivery: "Быстрая доставка",
  detail_delivery_desc: "По всему Узбекистану",
  detail_about: "О товаре",
  detail_specs: "Технические характеристики",
  detail_buy_discount: "Успей по скидке",
  detail_no_description: "Описание пока не добавлено",
  detail_reviews: "Отзывы покупателей",
  detail_no_reviews: "Отзывов пока нет",
  detail_be_first: "Будьте первым!",
  detail_third_party: "Товар стороннего продавца",
  detail_third_party_desc: "Этот товар продаётся сторонним продавцом. Katta Chegirma не несёт ответственности за качество и подлинность.",
  detail_added_qty: "шт. добавлено в корзину!",
  detail_buy_in_city: "— купить в Ташкенте",

  // Cart
  cart_title: "Корзина",
  cart_empty: "Корзина пуста",
  cart_empty_desc: "Добавьте товары из каталога",
  cart_go_catalog: "Перейти в каталог",
  cart_total: "Итого",
  cart_checkout: "Оформить заказ",
  cart_remove: "Удалить",
  cart_quantity: "Количество",
  cart_continue: "Продолжить покупки",

  // Checkout
  checkout_title: "Оформление заказа",
  checkout_name: "Ваше имя",
  checkout_phone: "Телефон",
  checkout_address: "Адрес доставки",
  checkout_comment: "Комментарий к заказу",
  checkout_submit: "Подтвердить заказ",
  checkout_success: "Заказ оформлен!",
  checkout_success_desc: "Мы свяжемся с вами в ближайшее время",
  checkout_back_home: "На главную",
  checkout_required: "Обязательное поле",

  // Search results
  search_title: "Результаты поиска",
  search_found: "Найдено",
  search_not_found: "На сайте ничего не найдено",
  search_not_found_desc: "По запросу товары на сайте не найдены. Попробуйте поискать в интернете:",
  search_try_google: "Найти в Google",
  search_try_yandex: "Найти в Яндексе",
  search_not_found_try: "Не нашли нужный товар? Поищите в интернете:",

  // About
  about_title: "О нас",

  // Auth modal
  auth_login: "Войти",
  auth_register: "Регистрация",
  auth_email: "Email",
  auth_password: "Пароль",
  auth_name: "Ваше имя",
  auth_login_btn: "Войти",
  auth_register_btn: "Зарегистрироваться",
  auth_no_account: "Нет аккаунта?",
  auth_have_account: "Уже есть аккаунт?",
  auth_forgot_password: "Забыли пароль?",
  auth_logout: "Выйти",

  // Profile
  profile_title: "Личный кабинет",
  profile_orders: "Мои заказы",
  profile_favorites: "Избранное",
  profile_no_orders: "У вас пока нет заказов",
  profile_no_favorites: "В избранном пусто",
  profile_order_number: "Заказ №",
  profile_order_date: "Дата",
  profile_order_status: "Статус",
  profile_order_total: "Сумма",

  // Admin
  admin_products: "Товары",
  admin_categories: "Категории",
  admin_orders: "Заказы",
  admin_sellers: "Продавцы",
  admin_settings: "Настройки",
  admin_add_product: "Добавить товар",
  admin_edit_product: "Редактировать товар",
  admin_delete_product: "Удалить товар",
  admin_product_name: "Название (рус.)",
  admin_product_name_uz: "Название (узб.)",
  admin_product_description: "Описание (рус.)",
  admin_product_description_uz: "Описание (узб.)",
  admin_product_price: "Цена",
  admin_product_old_price: "Старая цена",
  admin_product_brand: "Бренд",
  admin_product_category: "Категория",
  admin_product_stock: "В наличии",
  admin_product_images: "Фотографии",
  admin_save: "Сохранить",
  admin_cancel: "Отмена",
  admin_confirm_delete: "Вы уверены, что хотите удалить?",
  admin_add_category: "Добавить категорию",
  admin_category_name: "Название категории",
  admin_category_slug: "Slug (URL)",
  admin_category_icon: "Иконка (emoji)",
  admin_order_id: "№ заказа",
  admin_order_customer: "Покупатель",
  admin_order_status: "Статус",
  admin_order_total: "Сумма",
  admin_order_date: "Дата",
  admin_settings_title: "Настройки магазина",
  admin_settings_save: "Сохранить настройки",

  // Status labels
  status_pending: "Ожидает",
  status_processing: "В обработке",
  status_shipped: "Отправлен",
  status_delivered: "Доставлен",
  status_cancelled: "Отменён",

  // Seller
  seller_become: "Стать продавцом",
  seller_dashboard: "Панель продавца",
  seller_register_title: "Станьте продавцом на Katta Chegirma",
  seller_register_subtitle: "Продавайте свои товары миллионам покупателей",
  seller_store_name: "Название магазина",
  seller_phone: "Номер телефона",
  seller_telegram: "Telegram",
  seller_telegram_optional: "Telegram (необязательно)",
  seller_description: "О магазине",
  seller_description_optional: "О магазине (необязательно)",
  seller_submit: "Подать заявку",
  seller_submitting: "Отправка...",
  seller_pending_title: "Заявка на рассмотрении",
  seller_pending_desc: "Ваша заявка принята. Рассмотрение занимает от 30 минут до 2 дней. После подтверждения откроется личный кабинет.",
  seller_login_required: "Сначала войдите в аккаунт",
  seller_login_desc: "Для регистрации продавца нужен аккаунт",
  seller_login_btn: "Войти / Зарегистрироваться",
  seller_required_fields: "Название магазина и телефон обязательны",
  seller_submitted: "Заявка отправлена! Скоро рассмотрим.",
  seller_store_placeholder: "Например: Techno Market",
  seller_phone_placeholder: "+998 90 123 45 67",
  seller_desc_placeholder: "Какие товары продаёте?",
  seller_add_product: "Добавить товар",
  seller_no_products: "Товаров пока нет",
  seller_no_products_hint: "Нажмите «Добавить товар»",
  seller_moderation_pending: "На проверке",
  seller_moderation_approved: "Одобрен",
  seller_moderation_rejected: "Отклонён",
  seller_upload_image: "Загрузить фото",
  seller_uploading: "Загрузка...",
  seller_saving: "Сохранение...",
  seller_update: "Обновить",
  seller_send: "Отправить",
  seller_product_sent: "Товар отправлен на модерацию!",
  seller_product_updated: "Товар обновлён, отправлен на модерацию",
  seller_product_deleted: "Товар удалён",
  seller_image_error: "Ошибка загрузки фото: ",
  seller_confirm_delete: "Удалить этот товар?",
  seller_go_home: "На главную",

  // Premium
  premium_title: "Premium — Оригинальная техника",
  premium_subtitle: "Только оригинальные товары от проверенных брендов",
  premium_badge: "Оригинал",
  premium_no_products: "Премиум товары скоро появятся",

  // NotFound
  not_found_title: "Страница не найдена",
  not_found_desc: "Запрошенная страница не существует",
  not_found_home: "На главную",

  // Common
  common_loading: "Загрузка...",
  common_error: "Ошибка",
  common_save: "Сохранить",
  common_cancel: "Отмена",
  common_delete: "Удалить",
  common_edit: "Редактировать",
  common_add: "Добавить",
  common_close: "Закрыть",
  common_yes: "Да",
  common_no: "Нет",
  common_back: "Назад",
  common_sum: "сум",
  common_pieces: "шт.",
  common_not_found: "Не найдено",
  common_searching: "Поиск...",
  common_not_found_query: "не найдено",
};

const uz: Translations = {
  // Navbar
  nav_home: "Bosh sahifa",
  nav_catalog: "Katalog",
  nav_about: "Biz haqimizda",
  nav_cart: "Savat",
  nav_login: "Kirish",
  nav_admin: "Admin",
  nav_search_placeholder: "Nom, model, brend bo'yicha qidirish...",
  nav_search_on_site: "Saytdagi mahsulotlar",
  nav_search_in_google: "Google'da topish",
  nav_search_in_yandex: "Yandex'da topish",
  nav_search_loading: "Qidirilmoqda...",
  nav_show_all_results: "Barcha natijalarni ko'rish",
  nav_not_found_on_site: "Saytda topilmadi",
  nav_search_internet: "Internetda qidirish",
  nav_premium: "Premium",
  nav_bestsellers: "Hitlar",
  nav_become_seller: "Sotuvchi bo'lish",

  // Footer
  footer_catalog: "Katalog",
  footer_about: "Biz haqimizda",
  footer_contacts: "Aloqa",
  footer_seller: "Sotuvchi bo'lish",
  footer_rights: "Barcha huquqlar himoyalangan",
  footer_tagline: "O'zbekistondagi eng arzon texnika narxlari",

  // Home
  home_big_discounts: "KATTA CHEGIRMALAR!",
  home_lowest_prices: "Eng past narxlar — faqat bizda",
  home_view_all: "Hammasini ko'rish",
  home_categories: "Mahsulot kategoriyalari",
  home_popular: "Mashhur mahsulotlar",
  home_new_arrivals: "Yangi mahsulotlar",
  home_all_products: "Barcha mahsulotlar",
  home_bestsellers: "Sotuvdagi hitlar",
  home_bestsellers_desc: "Eng ko'p sotilgan mahsulotlar",
  home_view: "Ko'rish",
  home_time_left: "Tugashiga:",
  home_days: "kun",
  home_hours: "soat",

  // Catalog
  catalog_title: "Mahsulotlar katalogi",
  catalog_search_placeholder: "Mahsulot qidirish...",
  catalog_all_categories: "Barcha kategoriyalar",
  catalog_sort_default: "Standart",
  catalog_sort_price_asc: "Narx: o'sish tartibida",
  catalog_sort_price_desc: "Narx: kamayish tartibida",
  catalog_sort_new: "Yangilar",
  catalog_no_products: "Mahsulotlar topilmadi",
  catalog_loading: "Yuklanmoqda...",
  catalog_filter_price: "Narx",
  catalog_filter_brand: "Brend",
  catalog_filter_apply: "Qo'llash",
  catalog_filter_reset: "Tozalash",
  catalog_products_found: "ta mahsulot topildi",

  // Product card
  card_add_to_cart: "chegirmada olish",
  card_new: "YANGI",
  card_in_cart: "Savatda",
  card_hit: "Hit",
  card_original: "Original",
  card_added_to_cart: "Savatga qo'shildi!",

  // Product detail
  detail_add_to_cart: "chegirmada olish",
  detail_buy_now: "Chegirmaga ulgurasiz!",
  detail_description: "Tavsif",
  detail_brand: "Brend",
  detail_category: "Kategoriya",
  detail_seller: "Sotuvchi",
  detail_seller_phone: "Sotuvchi telefoni",
  detail_seller_telegram: "Sotuvchi Telegram",
  detail_contact_seller: "Sotuvchi bilan bog'lanish",
  detail_in_stock: "Mavjud",
  detail_out_of_stock: "Mavjud emas",
  detail_share: "Ulashish",
  detail_images: "Rasmlar",
  detail_back: "Orqaga",
  detail_not_found: "Mahsulot topilmadi",
  detail_not_found_desc: "Bu mahsulot mavjud emas yoki o'chirilgan.",
  detail_old_price: "Eski narx",
  detail_new_price: "Chegirmali yangi narx",
  detail_saving: "Tejash",
  detail_pcs: "dona",
  detail_delivery: "Tez yetkazib berish",
  detail_delivery_desc: "Butun O'zbekiston bo'ylab",
  detail_about: "Mahsulot haqida",
  detail_specs: "Texnik xususiyatlar",
  detail_buy_discount: "chegirmada olish",
  detail_no_description: "Tavsif hali qo'shilmagan",
  detail_reviews: "Xaridorlar sharhlari",
  detail_no_reviews: "Hali sharhlar yo'q",
  detail_be_first: "Birinchi bo'lib sharh qoldiring!",
  detail_third_party: "Mustaqil sotuvchi mahsuloti",
  detail_third_party_desc: "Bu mahsulot mustaqil sotuvchi tomonidan sotiladi. Katta Chegirma sifat va haqiqiylik uchun javobgar emas.",
  detail_added_qty: "ta mahsulot savatga qo'shildi!",
  detail_buy_in_city: "— Toshkentda sotib olish",

  // Cart
  cart_title: "Savat",
  cart_empty: "Savat bo'sh",
  cart_empty_desc: "Katalogdan mahsulot qo'shing",
  cart_go_catalog: "Katalogga o'tish",
  cart_total: "Jami",
  cart_checkout: "Buyurtma berish",
  cart_remove: "O'chirish",
  cart_quantity: "Miqdor",
  cart_continue: "Xaridni davom ettirish",

  // Checkout
  checkout_title: "Buyurtmani rasmiylashtirish",
  checkout_name: "Ismingiz",
  checkout_phone: "Telefon",
  checkout_address: "Yetkazib berish manzili",
  checkout_comment: "Buyurtmaga izoh",
  checkout_submit: "Buyurtmani tasdiqlash",
  checkout_success: "Buyurtma rasmiylashtirildi!",
  checkout_success_desc: "Tez orada siz bilan bog'lanamiz",
  checkout_back_home: "Bosh sahifaga",
  checkout_required: "Majburiy maydon",

  // Search results
  search_title: "Qidiruv natijalari",
  search_found: "Topildi",
  search_not_found: "Saytda hech narsa topilmadi",
  search_not_found_desc: "So'rov bo'yicha mahsulotlar topilmadi. Internetda qidirib ko'ring:",
  search_try_google: "Google'da topish",
  search_try_yandex: "Yandex'da topish",
  search_not_found_try: "Kerakli mahsulotni topa olmadingizmi? Internetda qidiring:",

  // About
  about_title: "Biz haqimizda",

  // Auth modal
  auth_login: "Kirish",
  auth_register: "Ro'yxatdan o'tish",
  auth_email: "Email",
  auth_password: "Parol",
  auth_name: "Ismingiz",
  auth_login_btn: "Kirish",
  auth_register_btn: "Ro'yxatdan o'tish",
  auth_no_account: "Akkaunt yo'qmi?",
  auth_have_account: "Allaqachon akkauntingiz bormi?",
  auth_forgot_password: "Parolni unutdingizmi?",
  auth_logout: "Chiqish",

  // Profile
  profile_title: "Shaxsiy kabinet",
  profile_orders: "Mening buyurtmalarim",
  profile_favorites: "Sevimlilar",
  profile_no_orders: "Hali buyurtmalaringiz yo'q",
  profile_no_favorites: "Sevimlilar bo'sh",
  profile_order_number: "Buyurtma №",
  profile_order_date: "Sana",
  profile_order_status: "Holat",
  profile_order_total: "Summa",

  // Admin
  admin_products: "Mahsulotlar",
  admin_categories: "Kategoriyalar",
  admin_orders: "Buyurtmalar",
  admin_sellers: "Sotuvchilar",
  admin_settings: "Sozlamalar",
  admin_add_product: "Mahsulot qo'shish",
  admin_edit_product: "Mahsulotni tahrirlash",
  admin_delete_product: "Mahsulotni o'chirish",
  admin_product_name: "Nomi (rus.)",
  admin_product_name_uz: "Nomi (o'zb.)",
  admin_product_description: "Tavsif (rus.)",
  admin_product_description_uz: "Tavsif (o'zb.)",
  admin_product_price: "Narx",
  admin_product_old_price: "Eski narx",
  admin_product_brand: "Brend",
  admin_product_category: "Kategoriya",
  admin_product_stock: "Mavjud",
  admin_product_images: "Rasmlar",
  admin_save: "Saqlash",
  admin_cancel: "Bekor qilish",
  admin_confirm_delete: "Haqiqatan ham o'chirmoqchimisiz?",
  admin_add_category: "Kategoriya qo'shish",
  admin_category_name: "Kategoriya nomi",
  admin_category_slug: "Slug (URL)",
  admin_category_icon: "Belgi (emoji)",
  admin_order_id: "Buyurtma №",
  admin_order_customer: "Xaridor",
  admin_order_status: "Holat",
  admin_order_total: "Summa",
  admin_order_date: "Sana",
  admin_settings_title: "Do'kon sozlamalari",
  admin_settings_save: "Sozlamalarni saqlash",

  // Status labels
  status_pending: "Kutilmoqda",
  status_processing: "Jarayonda",
  status_shipped: "Yuborildi",
  status_delivered: "Yetkazildi",
  status_cancelled: "Bekor qilindi",

  // Seller
  seller_become: "Sotuvchi bo'lish",
  seller_dashboard: "Sotuvchi paneli",
  seller_register_title: "Katta Chegirmada sotuvchi bo'ling",
  seller_register_subtitle: "Mahsulotlaringizni millionlab xaridorlarga soting",
  seller_store_name: "Do'kon nomi",
  seller_phone: "Telefon raqami",
  seller_telegram: "Telegram",
  seller_telegram_optional: "Telegram (ixtiyoriy)",
  seller_description: "Do'kon haqida",
  seller_description_optional: "Do'kon haqida (ixtiyoriy)",
  seller_submit: "Ariza yuborish",
  seller_submitting: "Yuborilmoqda...",
  seller_pending_title: "Ariza ko'rib chiqilmoqda",
  seller_pending_desc: "Arizangiz qabul qilindi. 30 daqiqadan 2 kungacha ko'rib chiqiladi. Tasdiqlangandan so'ng shaxsiy panelingiz ochiladi.",
  seller_login_required: "Avval tizimga kiring",
  seller_login_desc: "Sotuvchi bo'lish uchun akkaunt kerak",
  seller_login_btn: "Kirish / Ro'yxatdan o'tish",
  seller_required_fields: "Do'kon nomi va telefon raqami majburiy",
  seller_submitted: "Ariza yuborildi! Tez orada ko'rib chiqamiz.",
  seller_store_placeholder: "Masalan: Texno Market",
  seller_phone_placeholder: "+998 90 123 45 67",
  seller_desc_placeholder: "Qanday mahsulotlar sotasiz?",
  seller_add_product: "Mahsulot qo'shish",
  seller_no_products: "Hali mahsulot yo'q",
  seller_no_products_hint: "«Mahsulot qo'shish» tugmasini bosing",
  seller_moderation_pending: "Tekshirilmoqda",
  seller_moderation_approved: "Tasdiqlangan",
  seller_moderation_rejected: "Rad etilgan",
  seller_upload_image: "Rasm yuklash",
  seller_uploading: "Yuklanmoqda...",
  seller_saving: "Saqlanmoqda...",
  seller_update: "Yangilash",
  seller_send: "Yuborish",
  seller_product_sent: "Mahsulot yuborildi! Moderatsiya 30 daqiqadan 2 kungacha.",
  seller_product_updated: "Mahsulot yangilandi, moderatsiyaga yuborildi",
  seller_product_deleted: "Mahsulot o'chirildi",
  seller_image_error: "Rasm yuklashda xato: ",
  seller_confirm_delete: "Mahsulotni o'chirishni tasdiqlaysizmi?",
  seller_go_home: "Bosh sahifaga qaytish",

  // Premium
  premium_title: "Premium — Original texnika",
  premium_subtitle: "Faqat tekshirilgan brendlardan original mahsulotlar",
  premium_badge: "Original",
  premium_no_products: "Premium mahsulotlar tez orada qo'shiladi",

  // NotFound
  not_found_title: "Sahifa topilmadi",
  not_found_desc: "So'ralgan sahifa mavjud emas",
  not_found_home: "Bosh sahifaga",

  // Common
  common_loading: "Yuklanmoqda...",
  common_error: "Xato",
  common_save: "Saqlash",
  common_cancel: "Bekor qilish",
  common_delete: "O'chirish",
  common_edit: "Tahrirlash",
  common_add: "Qo'shish",
  common_close: "Yopish",
  common_yes: "Ha",
  common_no: "Yo'q",
  common_back: "Orqaga",
  common_sum: "so'm",
  common_pieces: "dona",
  common_not_found: "Topilmadi",
  common_searching: "Qidirilmoqda...",
  common_not_found_query: "topilmadi",
};

export const translations: Record<Language, Translations> = { ru, uz };

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ru",
  setLang: () => {},
  t: ru,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("kc_lang");
    return (saved === "uz" || saved === "ru") ? saved : "ru";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("kc_lang", newLang);
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
