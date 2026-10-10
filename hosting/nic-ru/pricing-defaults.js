// Дефолтный прайс конструктора (тестовая фаза). Переопределяется из site_settings.pricing в админке.
window.DEFAULT_PRICING = {
  base_per_m: 25000,
  min_price: 3000,
  width: { min: 800, max: 2000, step: 10, default: 1400 },
  height: { min: 600, max: 2400, step: 10, default: 1400 },
  types: [
    { id: 'single-turn', label: 'Одностворчатое поворотное', surcharge: 0, enabled: true },
    { id: 'single-deaf', label: 'Одностворчатое глухое', surcharge: 0, enabled: true },
    { id: 'double-deaf-turn', label: 'Двустворчатое (глухое + поворотное)', surcharge: 0, enabled: true },
    { id: 'double-turn', label: 'Двустворчатое поворотное', surcharge: 0, enabled: true },
    { id: 'triple', label: 'Трёхстворчатое', surcharge: 0, enabled: true },
    { id: 'balcony', label: 'Балконный блок', surcharge: 0, enabled: true }
  ],
  profiles: [
    { id: 'rehau-delight', label: 'REHAU Delight', price: 0, enabled: true }
  ],
  glass: [
    { id: '24mm', label: '24 мм (1-камерный)', price: 0, enabled: true },
    { id: '32mm', label: '32 мм (2-камерный)', price: 0, enabled: true },
    { id: '40mm', label: '40 мм (2-камерный low-e)', price: 0, enabled: true },
    { id: '44mm', label: '44 мм (3-камерный)', price: 0, enabled: true }
  ],
  hardware: [
    { id: 'propilot', label: 'ProPilot', price: 0, enabled: true },
    { id: 'roto', label: 'Roto', price: 0, enabled: true }
  ]
};

window.DEFAULT_SCOPE_ITEMS = [
  'Демонтаж старого',
  'Монтаж окна',
  'Откосы и подоконник',
  'Вынос мусора и уборка'
];

window.DEFAULT_SECTION_COPY = {
  constructor: { title: 'Конструктор окон', subtitle: 'Подберите параметры и узнайте ориентировочную стоимость за минуту.' },
  gallery: { title: 'Примеры работ', subtitle: 'Остекление квартир, домов и балконов в Москве и области.' },
  reviews: { title: 'Отзывы клиентов', subtitle: 'Нам доверяют остекление квартир, домов и балконов в Москве и области.' },
  news: { title: 'Новости', subtitle: 'Коротко о компании, материалах и сервисе.' },
  contact: { title: 'Бесплатный замер и точный расчёт', subtitle: 'Оставьте заявку — перезвоним в течение 24 часов, ответим на вопросы и рассчитаем стоимость без обязательств.' }
};
