-- Этап 2: прайс конструктора, тексты секций, scope для кейсов
-- Запустить в SQL Editor, если site_settings уже создана (добавляет ключи к существующей записи).

update public.site_settings
set data = data
  || jsonb_build_object(
    'pricing', '{
      "base_per_m": 2500,
      "min_price": 3000,
      "width": {"min": 800, "max": 2000, "step": 10, "default": 1400},
      "height": {"min": 600, "max": 2400, "step": 10, "default": 1400},
      "types": [
        {"id": "single-turn", "label": "Одностворчатое поворотное", "surcharge": 0, "enabled": true},
        {"id": "single-deaf", "label": "Одностворчатое глухое", "surcharge": -1500, "enabled": true},
        {"id": "double-deaf-turn", "label": "Двустворчатое (глухое + поворотное)", "surcharge": 3500, "enabled": true},
        {"id": "double-turn", "label": "Двустворчатое поворотное", "surcharge": 5000, "enabled": true},
        {"id": "triple", "label": "Трёхстворчатое", "surcharge": 8000, "enabled": true},
        {"id": "balcony", "label": "Балконный блок", "surcharge": 12000, "enabled": true}
      ],
      "profiles": [
        {"id": "whs60", "label": "WHS 60", "price": 500, "enabled": true},
        {"id": "veka70", "label": "VEKA Softline 70", "price": 700, "enabled": true},
        {"id": "rehau-delight", "label": "REHAU Delight", "price": 800, "enabled": true},
        {"id": "salamander", "label": "Salamander", "price": 900, "enabled": true}
      ],
      "glass": [
        {"id": "24mm", "label": "24 мм (1-камерный)", "price": 200, "enabled": true},
        {"id": "32mm", "label": "32 мм (2-камерный)", "price": 350, "enabled": true},
        {"id": "40mm", "label": "40 мм (2-камерный low-e)", "price": 500, "enabled": true},
        {"id": "44mm", "label": "44 мм (3-камерный)", "price": 650, "enabled": true}
      ],
      "hardware": [
        {"id": "propilot", "label": "ProPilot", "price": 300, "enabled": true},
        {"id": "roto", "label": "Roto", "price": 450, "enabled": true}
      ]
    }'::jsonb,
    'scope_items', '["Демонтаж старого","Монтаж окна","Откосы и подоконник","Вынос мусора и уборка"]'::jsonb,
    'copy', '{
      "constructor": {"title": "Конструктор окон", "subtitle": "Подберите параметры и узнайте ориентировочную стоимость за минуту."},
      "gallery": {"title": "Примеры работ", "subtitle": "Остекление квартир, домов и балконов в Москве и области."},
      "reviews": {"title": "Отзывы клиентов", "subtitle": "Нам доверяют остекление квартир, домов и балконов в Москве и области."},
      "news": {"title": "Новости", "subtitle": "Коротко о компании, материалах и сервисе."},
      "contact": {"title": "Бесплатный замер и точный расчёт", "subtitle": "Оставьте заявку — перезвоним в течение 15 минут, ответим на вопросы и рассчитаем стоимость без обязательств."}
    }'::jsonb
  ),
  updated_at = now()
where id = 1
  and not (data ? 'pricing');
