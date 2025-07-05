/**
 * Конфигурация commitlint для проекта ai-tg-bot
 * Следует conventional commits с дополнительными правилами
 */

module.exports = {
  extends: ["@commitlint/config-conventional"],

  // Кастомные правила для проекта
  rules: {
    // Тип коммита (обязательно)
    "type-enum": [
      2,
      "always",
      [
        "feat", // новая функциональность
        "fix", // исправление багов
        "docs", // только документация
        "style", // форматирование, отсутствующие точки с запятой и т.д.
        "refactor", // рефакторинг кода без изменения функциональности
        "perf", // улучшения производительности
        "test", // добавление или исправление тестов
        "build", // изменения в системе сборки или внешних зависимостях
        "ci", // изменения в CI/CD конфигурации
        "chore", // обновление задач сборки, конфигураций и т.д.
        "revert", // отмена предыдущего коммита
      ],
    ],

    // Область изменений (опционально, но рекомендуется)
    "scope-enum": [
      2,
      "always",
      [
        "core", // основная логика бота
        "handlers", // обработчики команд и сообщений
        "services", // сервисы (gemini, audio, image, logger, settings)
        "utils", // утилиты
        "config", // конфигурация
        "types", // типы TypeScript
        "tests", // тесты
        "docs", // документация
        "deps", // зависимости
        "ci", // CI/CD
        "telegram", // специфичные для Telegram функции
        "gemini", // интеграция с Gemini API
        "audio", // обработка аудио
        "image", // обработка изображений
        "logging", // система логирования
        "styles", // пользовательские стили ответов
      ],
    ],

    // Длина заголовка (максимум 72 символа)
    "header-max-length": [2, "always", 72],

    // Заголовок не должен заканчиваться точкой
    "header-full-stop": [2, "never", "."],

    // Заголовок должен быть в нижнем регистре
    "subject-case": [2, "always", "lower-case"],

    // Тело коммита должно начинаться с пустой строки
    "body-leading-blank": [2, "always"],

    // Футер должен начинаться с пустой строки
    "footer-leading-blank": [2, "always"],

    // Максимальная длина строки в теле
    "body-max-line-length": [2, "always", 100],

    // Максимальная длина строки в футере
    "footer-max-line-length": [2, "always", 100],
  },

  // Игнорировать коммиты merge
  ignores: [(commit) => commit.includes("Merge")],

  // Настройки по умолчанию
  defaultIgnores: true,

  // Помощь для пользователей
  helpUrl:
    "https://github.com/conventional-changelog/commitlint/#what-is-commitlint",
};
