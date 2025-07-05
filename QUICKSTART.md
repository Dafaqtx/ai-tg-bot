# 🚀 Быстрый старт

## Установка и запуск за 3 шага

### 1. Установка зависимостей

```bash
pnpm install
```

### 2. Настройка переменных окружения

```bash
# Создайте файл .env на основе .env.example
cp .env.example .env

# Отредактируйте .env, добавив:
# BOT_TOKEN=your_bot_token_here          # от @BotFather
# GEMINI_API_KEY=your_gemini_api_key_here # с https://ai.google.dev/
```

### 3. Запуск

```bash
# Для разработки
pnpm dev

# Для продакшена
pnpm build && pnpm start
```

## 🎵 Тестирование аудио функций

1. **Короткие голосовые** (до 60 сек) → естественный диалог
2. **Длинные голосовые** (более 60 сек) → структурированный анализ
3. **Аудиофайлы** (MP3, WAV, M4A и др.) → анализ содержания

## 📞 Получение токенов

- **Telegram Bot Token**: [@BotFather](https://t.me/BotFather) → `/newbot`
- **Gemini API Key**: [Google AI Studio](https://ai.google.dev/) → API Keys

---

_Подробная документация в [README.md](README.md)_
