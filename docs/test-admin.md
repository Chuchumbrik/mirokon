# Тестовый админ (стенд)

Учётка только для тестового стенда `mirokon-new.vercel.app`. Перед публичным релизом — сменить пароль или удалить.

| Поле | Значение |
|------|----------|
| **E-mail** | `test-admin@mirokon-new.test` |
| **Пароль** | `MirokonTest!2026` |
| **Вход** | https://mirokon-new.vercel.app/landing.html |
| **Панель** | https://mirokon-new.vercel.app/admin.html |

---

## Автоматически (рекомендуется)

1. В `.env.local` добавьте **service_role** ключ:
   ```
   SUPABASE_SERVICE_KEY=eyJ...   # Dashboard → Settings → API → service_role
   ```
2. Запустите:
   ```bash
   npm install
   npm run create-test-admin
   ```
3. Скрипт создаст пользователя в Auth, добавит строку в `app_admins`, проверит `is_admin()` и запишет `ADMIN_EMAIL` / `ADMIN_PASSWORD` в `.env.local`.

---

## Вручную в Supabase Dashboard

1. **Authentication → Users → Add user**  
   E-mail: `test-admin@mirokon-new.test`, пароль: `MirokonTest!2026`, подтвердить e-mail.
2. Скопировать **UUID** пользователя.
3. **SQL Editor** (обязательно — без этого `is_admin()` = false):
   ```sql
   insert into public.app_admins (user_id)
   values ('<UUID-из-шага-2>')
   on conflict (user_id) do nothing;
   ```
4. Проверка:
   ```bash
   npm run verify-test-admin
   ```
   Должно быть `is_admin(): true`. Если false — скрипт выведет готовый SQL с правильным UUID.

---

## Проверка после создания

```bash
npm run admin-e2e
```

Полный UI-цикл: написать «готово» в чат — агент войдёт в Chrome и пройдёт вкладки админки.
