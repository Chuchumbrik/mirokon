-- Тестовые данные Mirokon (nic.ru)
-- Пароль админа задаёт install.php из config.local.php (admin_email / admin_password).

SET NAMES utf8mb4;

INSERT INTO admins (id, email, password_hash) VALUES
  ('a0000000-0000-4000-8000-000000000001',
   'mazay.neo@mail.ru',
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
  'Заменили старые деревянные рамы на двухкамерный REHAU Delight. Монтаж за один день, откосы и подоконник под ключ.',
  NULL, 0, 1,
  JSON_ARRAY('Демонтаж старого','Монтаж окна','Откосы и подоконник','Вынос мусора и уборка'),
  'REHAU Delight', 1, 'Москва, Хорошёво', '5 лет', 48500, 'double-turn'
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
  'Одностворчатое поворотное окно с фрамугой сверху. Светлая кухня, подоконник и откосы под ключ.',
  NULL, 2, 1,
  JSON_ARRAY('Монтаж окна','Откосы и подоконник'),
  'REHAU Delight', 1, 'Химки', '5 лет', 28900, 'single-turn'
)
ON DUPLICATE KEY UPDATE title = VALUES(title);

INSERT INTO work_photos (id, work_id, url, sort, storage_path) VALUES
  ('b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', '/uploads/works/living.jpg', 0, 'works/living.jpg'),
  ('b2000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000002', '/uploads/works/balcony.jpg', 0, 'works/balcony.jpg'),
  ('b2000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000003', '/uploads/works/kitchen.jpg', 0, 'works/kitchen.jpg')
ON DUPLICATE KEY UPDATE url = VALUES(url);

UPDATE works SET image_url = '/uploads/works/living.jpg'
 WHERE id = 'b1000000-0000-4000-8000-000000000001';
UPDATE works SET image_url = '/uploads/works/balcony.jpg'
 WHERE id = 'b1000000-0000-4000-8000-000000000002';
UPDATE works SET image_url = '/uploads/works/kitchen.jpg', published = 1,
  description = 'Одностворчатое поворотное окно с фрамугой сверху. Светлая кухня, подоконник и откосы под ключ.'
 WHERE id = 'b1000000-0000-4000-8000-000000000003';

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
     JSON_OBJECT('type','Двустворчатое поворотное','profile','REHAU Delight','glass','32 мм (2-камерный)','hardware','Roto','width',1400,'height',1400,'price',42000)
   ),
   0),
  ('b5000000-0000-4000-8000-000000000002', 'Ольга', '+7 (926) 555-44-33',
   'Перезвоните после 18:00', NULL, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO site_settings (id, data) VALUES (1, JSON_OBJECT(
  'company_name', 'Mirokon',
  'phone', '79264952460',
  'phone_display', '+7 (926) 495-24-60',
  'whatsapp', '79264952460',
  'telegram', 'mirokon_bot',
  'email', 'mazay.neo@mail.ru',
  'hours', 'Пн–Вс 09:00–21:00',
  'logo_url', NULL,
  'hero', JSON_OBJECT(
    'eyebrow', '● Москва и Московская область',
    'title_before', 'Окна, которые',
    'title_em', 'служат десятилетия',
    'lead', 'Премиальные пластиковые окна и аккуратный монтаж под ключ. Точно, чисто, с гарантией.',
    'price_from', 12000,
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
  'social', JSON_OBJECT('vk', 'https://vk.com/club230835061', 'avito', ''),
  'sections', JSON_OBJECT('gallery', true, 'reviews', true, 'news', true),
  'pricing', JSON_OBJECT(
    'base_per_m', 25000,
    'min_price', 3000,
    'width', JSON_OBJECT('min', 800, 'max', 2000, 'step', 10, 'default', 1400),
    'height', JSON_OBJECT('min', 600, 'max', 2400, 'step', 10, 'default', 1400),
    'types', JSON_ARRAY(
      JSON_OBJECT('id', 'single-turn', 'label', 'Одностворчатое поворотное', 'surcharge', 0, 'enabled', true),
      JSON_OBJECT('id', 'single-deaf', 'label', 'Одностворчатое глухое', 'surcharge', 0, 'enabled', true),
      JSON_OBJECT('id', 'double-deaf-turn', 'label', 'Двустворчатое (глухое + поворотное)', 'surcharge', 0, 'enabled', true),
      JSON_OBJECT('id', 'double-turn', 'label', 'Двустворчатое поворотное', 'surcharge', 0, 'enabled', true),
      JSON_OBJECT('id', 'triple', 'label', 'Трёхстворчатое', 'surcharge', 0, 'enabled', true),
      JSON_OBJECT('id', 'balcony', 'label', 'Балконный блок', 'surcharge', 0, 'enabled', true)
    ),
    'profiles', JSON_ARRAY(
      JSON_OBJECT('id', 'rehau-delight', 'label', 'REHAU Delight', 'price', 0, 'enabled', true)
    ),
    'glass', JSON_ARRAY(
      JSON_OBJECT('id', '24mm', 'label', '24 мм (1-камерный)', 'price', 0, 'enabled', true),
      JSON_OBJECT('id', '32mm', 'label', '32 мм (2-камерный)', 'price', 0, 'enabled', true),
      JSON_OBJECT('id', '40mm', 'label', '40 мм (2-камерный low-e)', 'price', 0, 'enabled', true),
      JSON_OBJECT('id', '44mm', 'label', '44 мм (3-камерный)', 'price', 0, 'enabled', true)
    ),
    'hardware', JSON_ARRAY(
      JSON_OBJECT('id', 'propilot', 'label', 'ProPilot', 'price', 0, 'enabled', true),
      JSON_OBJECT('id', 'roto', 'label', 'Roto', 'price', 0, 'enabled', true)
    )
  ),
  'scope_items', JSON_ARRAY('Демонтаж старого','Монтаж окна','Откосы и подоконник','Вынос мусора и уборка'),
  'copy', JSON_OBJECT(
    'constructor', JSON_OBJECT('title', 'Конструктор окон', 'subtitle', 'Подберите параметры и узнайте ориентировочную стоимость за минуту.'),
    'gallery', JSON_OBJECT('title', 'Примеры работ', 'subtitle', 'Остекление квартир, домов и балконов в Москве и области.'),
    'reviews', JSON_OBJECT('title', 'Отзывы клиентов', 'subtitle', 'Нам доверяют остекление квартир, домов и балконов в Москве и области.'),
    'news', JSON_OBJECT('title', 'Новости', 'subtitle', 'Коротко о компании, материалах и сервисе.'),
    'contact', JSON_OBJECT('title', 'Бесплатный замер и точный расчёт', 'subtitle', 'Оставьте заявку — перезвоним в течение 24 часов, ответим на вопросы и рассчитаем стоимость без обязательств.')
  ),
  'privacy_html', NULL
))
ON DUPLICATE KEY UPDATE data = VALUES(data);
