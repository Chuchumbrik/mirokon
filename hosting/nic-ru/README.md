# Mirokon — пакет для виртуального хостинга nic.ru

Полный порт сайта на **PHP 8 + MySQL/MariaDB**: публичная витрина, конструктор, заявки, отзывы, админка, загрузки файлов, Telegram-уведомления.

Исходный стек (Vercel + Supabase) в корне репозитория не трогаем — этот каталог самодостаточен для выкладки на shared-хостинг.

## Состав

| Путь | Назначение |
|------|------------|
| `index.html`, `app.js`, `styles.css` | Публичный сайт |
| `landing.html`, `admin.html`, `admin.js` | Админка |
| `mirokon-db.js` | Клиент вместо Supabase |
| `api/*.php` | REST API |
| `includes/` | Ядро (БД, сессии, Telegram) |
| `sql/schema.sql`, `sql/seed.sql` | Схема и тестовые данные |
| `uploads/` | Фото работ / новости / логотип |
| `install.php` | Установщик (удалить после запуска) |
| `config.example.php` → `config.local.php` | Секреты MySQL / Telegram |

## Требования nic.ru

- PHP 8.0+ (рекомендуется 8.2/8.3) с расширениями: `pdo_mysql`, `json`, `mbstring`, `curl`
- MySQL 5.7+ / MariaDB 10.3+ (нужен тип `JSON`)
- `mod_rewrite` желателен (для защиты `includes/` и `sql/`)

## Установка

1. Загрузите **содержимое** этой папки в корень сайта (`public_html` / `www`).
2. В панели nic.ru создайте БД MySQL и пользователя.
3. Скопируйте `config.example.php` → `config.local.php`, заполните:

```php
'db' => [
  'host' => 'localhost', // или хост из панели
  'name' => 'uXXXX_mirokon',
  'user' => 'uXXXX_mirokon',
  'pass' => '…',
],
'site_url' => 'https://ваш-домен.ru',
```

4. Откройте `https://ваш-домен.ru/install.php` (или `php install.php` по SSH).
5. **Удалите `install.php`.**
6. Права на запись: `uploads/` (и подпапки) — 755/775.

### Админ

Вход: `/landing.html`. Логин и пароль — `admin_email` и `admin_password` из `config.local.php`. `install.php` создаёт эту учётку и на странице показывает только почту.

## Telegram (опционально)

В `config.local.php`:

```php
'tg_bot_token' => '123:ABC…',
'tg_chat_id' => '649175786',
'tg_webhook_secret' => 'случайная-строка',
```

Вебхук:

```text
https://api.telegram.org/bot<TOKEN>/setWebhook
  ?url=https://ваш-домен.ru/api/tg.php
  &secret_token=<tg_webhook_secret>
```

Без Telegram заявки и отзывы всё равно сохраняются в БД.

## API

| Метод | Путь | Кто |
|-------|------|-----|
| POST | `/api/lead.php` | публично |
| POST | `/api/review.php` | публично |
| POST | `/api/moderate.php` | админ (сессия) |
| POST | `/api/tg.php` | Telegram webhook |
| POST | `/api/db.php` | чтение публично / запись админ |
| POST/DELETE | `/api/upload.php` | админ |
| GET/POST | `/api/auth.php?action=…` | login / logout / session |

## SEO после переноса

В `index.html`, `robots.txt`, `sitemap.xml` замените `https://mirokon-new.vercel.app` на ваш домен.

## Локальная проверка

```bash
# MySQL
mysql -u root -e "CREATE DATABASE mirokon CHARACTER SET utf8mb4; CREATE USER 'mirokon'@'localhost' IDENTIFIED BY 'mirokon'; GRANT ALL ON mirokon.* TO 'mirokon'@'localhost';"

# config.local.php → host localhost, user/pass mirokon
php install.php
php -S 127.0.0.1:8080 -t .
# открыть http://127.0.0.1:8080/
```
