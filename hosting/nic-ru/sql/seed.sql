-- Тестовые данные Mirokon (nic.ru)
-- Пароль админа: MirokonTest!2026
-- Хеш ниже сгенерирован через password_hash(..., PASSWORD_DEFAULT)

SET NAMES utf8mb4;

-- Пароль выставляет install.php: MirokonTest!2026
INSERT INTO admins (id, email, password_hash) VALUES
  ('a0000000-0000-4000-8000-000000000001',
   'test-admin@mirokon-new.test',
   'REPLACE_WITH_INSTALL')
ON DUPLICATE KEY UPDATE email = VALUES(email);

INSERT INTO categories (id, name, sort) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'Гостиная', 0),
  ('c0000000-0000-4000-8000-000000000002', 'Кухня', 1),
  ('c0000000-0000-4000-8000-000000000003', 'Балкон', 2),
  ('c0000000-0000-4000-8000-000000000004', 'Спальня', 3)
ON DUPLICATE KEY UPDATE name = VALUES(name), sort = VALUES(sort);

INSERT INTO works (
  id, title, category, description, image_url, sort, published,
  scope, system_name, duration_days, area, warranty, price_from, tpl_window_type
) VALUES
(
  'b1000000-0000-4000-8000-000000000001',
  'Остекление гостиной в ЖК «Сердце Столицы»',
  'Гостиная',
  'Заменили старые деревянные рамы на двухкамерный VEKA Softline 70. Монтаж за один день, откосы и подоконник под ключ.',
  NULL, 0, 1,
  JSON_ARRAY('Демонтаж старого','Монтаж окна','Откосы и подоконник','Вынос мусора и уборка'),
  'VEKA Softline 70', 1, 'Москва, Хорошёво', '5 лет', 48500, 'double-turn'
),
(
  'b1000000-0000-4000-8000-000000000002',
  'Тёплое остекление балкона',
  'Балкон',
  'Панорамное остекление балкона профилем REHAU Delight, тёплый пол подготовлен заказчиком.',
  NULL, 1, 1,
  JSON_ARRAY('Демонтаж старого','Монтаж окна','Откосы и подоконник'),
  'REHAU Delight', 1, 'Мытищи', '5 лет', 62000, 'balcony'
),
(
  'b1000000-0000-4000-8000-000000000003',
  'Кухня с фрамугой',
  'Кухня',
  'Одностворчатое поворотное + фрамуга. Черновик — не публикуется (для проверки админки).',
  NULL, 2, 0,
  JSON_ARRAY('Монтаж окна','Откосы и подоконник'),
  'WHS 60', 1, 'Химки', '5 лет', 28900, 'single-turn'
)
ON DUPLICATE KEY UPDATE title = VALUES(title);

INSERT INTO work_photos (id, work_id, url, sort, storage_path) VALUES
  ('b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', '/uploads/works/demo-living-1.svg', 0, 'works/demo-living-1.svg'),
  ('b2000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', '/uploads/works/demo-living-2.svg', 1, 'works/demo-living-2.svg'),
  ('b2000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000002', '/uploads/works/demo-balcony-1.svg', 0, 'works/demo-balcony-1.svg')
ON DUPLICATE KEY UPDATE url = VALUES(url);

UPDATE works SET image_url = '/uploads/works/demo-living-1.svg'
 WHERE id = 'b1000000-0000-4000-8000-000000000001';
UPDATE works SET image_url = '/uploads/works/demo-balcony-1.svg'
 WHERE id = 'b1000000-0000-4000-8000-000000000002';

INSERT INTO reviews (id, author_name, author_city, rating, text, approved) VALUES
  ('b3000000-0000-4000-8000-000000000001', 'Анна К.', 'Москва', 5,
   'Сделали всё аккуратно и в срок. Мастера убрали за собой, окна закрываются мягко. Рекомендую.', 1),
  ('b3000000-0000-4000-8000-000000000002', 'Игорь П.', 'Подольск', 5,
   'Замер бесплатный, смета совпала с фактом. На балконе стало заметно теплее.', 1),
  ('b3000000-0000-4000-8000-000000000003', 'Марина', 'Химки', 4,
   'Хорошая работа, чуть задержались с откосами на полдня — но результат отличный.', 1),
  ('b3000000-0000-4000-8000-000000000004', 'Тест Модерация', 'Москва', 3,
   'Этот отзыв ждёт модерации — не должен показываться на сайте.', 0)
ON DUPLICATE KEY UPDATE text = VALUES(text);

INSERT INTO news (id, title, preview_text, body, published) VALUES
  ('b4000000-0000-4000-8000-000000000001',
   'Гарантия 5 лет на монтаж',
   'Расширили гарантию на монтажные работы до пяти лет.',
   'Теперь на все монтажные работы действует расширенная гарантия 5 лет. В договоре фиксируем сроки и состав работ.',
   1),
  ('b4000000-0000-4000-8000-000000000002',
   'Бесплатный замер по МО',
   'Выезд замерщика по Москве и области — бесплатно.',
   'Оставьте заявку на сайте или в WhatsApp — приедем, снимем размеры и рассчитаем стоимость без обязательств.',
   1),
  ('b4000000-0000-4000-8000-000000000003',
   'Черновик новости',
   'Не публикуется.',
   'Служебная запись для проверки админки.',
   0)
ON DUPLICATE KEY UPDATE title = VALUES(title);

INSERT INTO leads (id, name, phone, message, cart_items, processed) VALUES
  ('b5000000-0000-4000-8000-000000000001', 'Сергей', '+7 (999) 111-22-33',
   'Нужен замер на следующей неделе',
   JSON_ARRAY(
     JSON_OBJECT('type','Двустворчатое поворотное','profile','VEKA Softline 70','glass','32 мм (2-камерный)','hardware','Roto','width',1400,'height',1400,'price',42000)
   ),
   0),
  ('b5000000-0000-4000-8000-000000000002', 'Ольга', '+7 (926) 555-44-33',
   'Перезвоните после 18:00', NULL, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO site_settings (id, data) VALUES (1, JSON_OBJECT(
  'company_name', 'Mirokon',
  'phone', '79991234567',
  'phone_display', '+7 (999) 123-45-67',
  'whatsapp', '79991234567',
  'telegram', 'mirokon_bot',
  'email', 'info@mirokon.example',
  'hours', 'Пн–Вс 09:00–21:00',
  'logo_url', NULL,
  'hero', JSON_OBJECT(
    'eyebrow', '● Москва и Московская область',
    'title_before', 'Окна, которые',
    'title_em', 'служат десятилетия',
    'lead', 'Премиальные пластиковые окна и аккуратный монтаж под ключ. Точно, чисто, с гарантией.',
    'price_from', 17490,
    'chips', JSON_ARRAY('Гарантия 5 лет', 'Договор', 'Монтаж за 1 день'),
    'stats', JSON_ARRAY(
      JSON_OBJECT('value', '1500+', 'label', 'окон установлено'),
      JSON_OBJECT('value', '8 лет', 'label', 'на рынке'),
      JSON_OBJECT('value', '★ 4.9', 'label', 'рейтинг клиентов')
    ),
    'profiles', JSON_ARRAY('REHAU')
  ),
  'footer', JSON_OBJECT(
    'about', 'Премиальные пластиковые окна и аккуратный монтаж под ключ в Москве и Московской области.'
  ),
  'seo', JSON_OBJECT(
    'title', 'Окна под ключ в Москве и МО — установка пластиковых окон | Mirokon',
    'description', 'Установка и замена пластиковых окон под ключ в Москве и Московской области. Премиальные профили, гарантия 5 лет, монтаж за 1 день. Бесплатный замер и точный расчёт.'
  ),
  'social', JSON_OBJECT('vk', '', 'avito', ''),
  'sections', JSON_OBJECT('gallery', true, 'reviews', true, 'news', true),
  'pricing', JSON_OBJECT(
    'base_per_m', 2500,
    'min_price', 3000,
    'width', JSON_OBJECT('min', 800, 'max', 2000, 'step', 10, 'default', 1400),
    'height', JSON_OBJECT('min', 600, 'max', 2400, 'step', 10, 'default', 1400),
    'types', JSON_ARRAY(
      JSON_OBJECT('id', 'single-turn', 'label', 'Одностворчатое поворотное', 'surcharge', 0, 'enabled', true),
      JSON_OBJECT('id', 'single-deaf', 'label', 'Одностворчатое глухое', 'surcharge', -1500, 'enabled', true),
      JSON_OBJECT('id', 'double-deaf-turn', 'label', 'Двустворчатое (глухое + поворотное)', 'surcharge', 3500, 'enabled', true),
      JSON_OBJECT('id', 'double-turn', 'label', 'Двустворчатое поворотное', 'surcharge', 5000, 'enabled', true),
      JSON_OBJECT('id', 'triple', 'label', 'Трёхстворчатое', 'surcharge', 8000, 'enabled', true),
      JSON_OBJECT('id', 'balcony', 'label', 'Балконный блок', 'surcharge', 12000, 'enabled', true)
    ),
    'profiles', JSON_ARRAY(
      JSON_OBJECT('id', 'whs60', 'label', 'WHS 60', 'price', 500, 'enabled', true),
      JSON_OBJECT('id', 'veka70', 'label', 'VEKA Softline 70', 'price', 700, 'enabled', true),
      JSON_OBJECT('id', 'rehau-delight', 'label', 'REHAU Delight', 'price', 800, 'enabled', true),
      JSON_OBJECT('id', 'salamander', 'label', 'Salamander', 'price', 900, 'enabled', true)
    ),
    'glass', JSON_ARRAY(
      JSON_OBJECT('id', '24mm', 'label', '24 мм (1-камерный)', 'price', 200, 'enabled', true),
      JSON_OBJECT('id', '32mm', 'label', '32 мм (2-камерный)', 'price', 350, 'enabled', true),
      JSON_OBJECT('id', '40mm', 'label', '40 мм (2-камерный low-e)', 'price', 500, 'enabled', true),
      JSON_OBJECT('id', '44mm', 'label', '44 мм (3-камерный)', 'price', 650, 'enabled', true)
    ),
    'hardware', JSON_ARRAY(
      JSON_OBJECT('id', 'propilot', 'label', 'ProPilot', 'price', 300, 'enabled', true),
      JSON_OBJECT('id', 'roto', 'label', 'Roto', 'price', 450, 'enabled', true)
    )
  ),
  'scope_items', JSON_ARRAY('Демонтаж старого','Монтаж окна','Откосы и подоконник','Вынос мусора и уборка'),
  'copy', JSON_OBJECT(
    'constructor', JSON_OBJECT('title', 'Конструктор окон', 'subtitle', 'Подберите параметры и узнайте ориентировочную стоимость за минуту.'),
    'gallery', JSON_OBJECT('title', 'Примеры работ', 'subtitle', 'Остекление квартир, домов и балконов в Москве и области.'),
    'reviews', JSON_OBJECT('title', 'Отзывы клиентов', 'subtitle', 'Нам доверяют остекление квартир, домов и балконов в Москве и области.'),
    'news', JSON_OBJECT('title', 'Новости', 'subtitle', 'Коротко о компании, материалах и сервисе.'),
    'contact', JSON_OBJECT('title', 'Бесплатный замер и точный расчёт', 'subtitle', 'Оставьте заявку — перезвоним в течение 15 минут, ответим на вопросы и рассчитаем стоимость без обязательств.')
  ),
  'privacy_html', NULL
))
ON DUPLICATE KEY UPDATE data = VALUES(data);
