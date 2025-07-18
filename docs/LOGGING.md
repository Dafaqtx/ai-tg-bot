# Логирование в AI Telegram Bot

## Обзор

Проект использует систему логирования на базе Winston для записи всех важных событий, ошибок и активности пользователей.

## Особенности

- **Ротация логов**: Автоматическая ротация файлов логов по дням
- **Уровни логирования**: Поддержка различных уровней (error, warn, info, debug)
- **Структурированные логи**: JSON формат для удобного анализа
- **Консольный вывод**: Цветной вывод в консоль для разработки
- **Обработка исключений**: Автоматическое логирование необработанных ошибок

## Структура файлов логов

```
logs/
├── combined-2025-07-05.log      # Все логи
├── error-2025-07-05.log         # Только ошибки
├── exceptions-2025-07-05.log    # Необработанные исключения
└── rejections-2025-07-05.log    # Отклоненные промисы
```

## Уровни логирования

| Уровень | Описание       | Использование                       |
| ------- | -------------- | ----------------------------------- |
| `error` | Ошибки         | Критические ошибки, исключения      |
| `warn`  | Предупреждения | Потенциальные проблемы              |
| `info`  | Информация     | Общая информация о работе           |
| `debug` | Отладка        | Детальная информация для разработки |

## Использование

### Базовое логирование

```typescript
import { logger } from "../services";

// Информационное сообщение
logger.info("Бот запущен успешно");

// Предупреждение
logger.warn("Получен неизвестный тип файла");

// Ошибка
logger.error("Ошибка при обработке запроса", error);

// Отладка
logger.debug("Обработка сообщения", { userId: 123, messageType: "text" });
```

### Специальные методы

```typescript
// Логирование активности пользователя
logger.logUserActivity(userId, username, "text_message", {
  messageLength: 100,
});

// Логирование системных событий
logger.logSystemEvent("bot_started", { version: "1.0.0" });

// Логирование API вызовов
logger.logApiCall(
  "Gemini",
  "generateResponse",
  1500, // длительность в мс
  true, // успешность
  error // ошибка (опционально)
);
```

## Конфигурация

### Уровни по окружению

- **production**: `info` и выше
- **development**: `debug` и выше
- **test**: `warn` и выше

### Настройка ротации

- **Максимальный размер файла**: 20MB
- **Время хранения**: 14 дней
- **Формат даты**: YYYY-MM-DD

## Мониторинг

### Важные события для мониторинга

1. **Запуск/остановка бота**

   ```json
   {
     "level": "info",
     "message": "Системное событие: bot_started",
     "timestamp": "2025-07-05 16:35:18"
   }
   ```

2. **Ошибки API**

   ```json
   {
     "level": "error",
     "message": "API вызов: Gemini.generateResponse",
     "service": "Gemini",
     "success": false
   }
   ```

3. **Активность пользователей**

   ```json
   {
     "level": "info",
     "message": "Пользователь testuser выполнил действие: text_message",
     "userId": 123
   }
   ```

4. **Ошибки парсинга Markdown**
   ```json
   {
     "level": "warn",
     "message": "Ошибка парсинга Markdown, отправляем как обычный текст",
     "originalMessage": "Текст с неправильным *форматированием...",
     "error": "can't parse entities: Can't find end of the entity..."
   }
   ```

## Рекомендации

### Для разработки

- Используйте `debug` для детальной отладки
- Не логируйте чувствительные данные (токены, пароли)
- Добавляйте контекст к сообщениям

### Для продакшна

- Мониторьте размер логов
- Настройте алерты на критические ошибки
- Регулярно анализируйте логи активности

## Примеры анализа логов

### Поиск ошибок за день

```bash
grep "level\":\"error\"" logs/combined-2025-07-05.log
```

### Анализ активности пользователей

```bash
grep "logUserActivity" logs/combined-2025-07-05.log | jq '.userId' | sort | uniq -c
```

### Мониторинг производительности API

```bash
grep "API вызов" logs/combined-2025-07-05.log | jq '.duration'
```
