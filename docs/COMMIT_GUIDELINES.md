# Руководство по коммитам (Commit Guidelines)

Этот проект использует [Conventional Commits](https://www.conventionalcommits.org/) с дополнительными правилами для обеспечения консистентности и читаемости истории изменений.

## Структура коммита

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Обязательные элементы

- **type** - тип изменения (обязательно)
- **subject** - краткое описание изменения (обязательно)

### Опциональные элементы

- **scope** - область изменения (рекомендуется)
- **body** - подробное описание изменения
- **footer** - дополнительная информация (breaking changes, ссылки на issues)

## Типы коммитов (type)

| Тип | Описание | Пример |
|-----|----------|--------|
| `feat` | Новая функциональность | `feat(handlers): add voice message processing` |
| `fix` | Исправление багов | `fix(gemini): handle api timeout errors` |
| `docs` | Только документация | `docs(readme): update installation guide` |
| `style` | Форматирование кода | `style(handlers): fix code formatting` |
| `refactor` | Рефакторинг без изменения функциональности | `refactor(services): extract common logger logic` |
| `perf` | Улучшения производительности | `perf(context): optimize message retrieval` |
| `test` | Добавление или исправление тестов | `test(utils): add telegram utils tests` |
| `build` | Изменения в системе сборки | `build(deps): update typescript to 5.0` |
| `ci` | Изменения в CI/CD | `ci(github): add automated testing workflow` |
| `chore` | Обновление конфигураций | `chore(lint): update eslint rules` |
| `revert` | Отмена предыдущего коммита | `revert: "feat(core): add context system"` |

## Области изменений (scope)

| Область | Описание | Примеры файлов |
|---------|----------|----------------|
| `core` | Основная логика бота | `src/index.ts`, `src/server.ts` |
| `handlers` | Обработчики команд и сообщений | `src/handlers/*` |
| `services` | Сервисы | `src/services/*` |
| `utils` | Утилиты | `src/utils/*` |
| `config` | Конфигурация | `src/config/*` |
| `types` | Типы TypeScript | `src/types/*` |
| `tests` | Тесты | `tests/*` |
| `docs` | Документация | `docs/*`, `README.md` |
| `deps` | Зависимости | `package.json`, `pnpm-lock.yaml` |
| `ci` | CI/CD | `.github/*`, `render.yaml` |
| `telegram` | Специфичные для Telegram функции | Telegram API интеграция |
| `gemini` | Интеграция с Gemini API | `src/services/geminiService.ts` |
| `audio` | Обработка аудио | `src/services/audioService.ts` |
| `image` | Обработка изображений | `src/services/imageService.ts` |
| `logging` | Система логирования | `src/services/loggerService.ts` |
| `styles` | Пользовательские стили ответов | Настройки стилей ответов |

## Правила для заголовка

- **Длина**: максимум 72 символа
- **Регистр**: нижний регистр (lowercase)
- **Язык**: только английский
- **Минимальная длина**: 10 символов
- **Максимальная длина subject**: 50 символов
- **Окончание**: без точки в конце

## Правила для тела коммита

- Тело должно начинаться с пустой строки после заголовка
- Максимальная длина строки: 100 символов
- Используйте тело для объяснения "что" и "почему", а не "как"

## Правила для футера

- Футер должен начинаться с пустой строки
- Максимальная длина строки: 100 символов
- Используйте для breaking changes и ссылок на issues

## Примеры хороших коммитов

### Простой коммит
```
feat(handlers): add voice message support

Add ability to process voice messages through Gemini API.
Voice messages are converted to text and processed as regular text.
```

### Коммит с breaking change
```
feat(core)!: migrate from json to sqlite database

BREAKING CHANGE: User data storage format changed from JSON files to SQLite.
Existing JSON data will be migrated automatically on first run.

- Add DatabaseService for SQLite operations
- Migrate UserSettingsService to use SQLite
- Migrate ContextService to use SQLite
- Add migration script for existing data
```

### Коммит исправления
```
fix(gemini): handle rate limit errors gracefully

Add retry logic with exponential backoff for Gemini API rate limits.
Display user-friendly error messages when rate limits are exceeded.
```

### Рефакторинг
```
refactor(services): extract common database patterns

- Extract common CRUD operations to base service
- Reduce code duplication across services
- Improve type safety for database operations
```

## Примеры плохих коммитов

❌ `update files` - слишком общее описание
❌ `Fix bug` - не указано что именно исправлено  
❌ `Добавил новую функцию` - используется русский язык
❌ `feat: ADD NEW FEATURE` - неправильный регистр
❌ `fix(core): fix.` - заканчивается точкой
❌ `docs` - слишком короткое описание

## Настройка

Проект использует `@commitlint/config-conventional` с дополнительными правилами в файле `commitlint.config.js`.

Для автоматической проверки коммитов установлен pre-commit hook через husky.

## Инструменты

- **commitlint** - проверка соответствия правилам
- **husky** - git hooks для автоматической проверки
- **conventional-changelog** - автоматическая генерация changelog

## Полезные команды

```bash
# Проверить последний коммит
npx commitlint --from HEAD~1 --to HEAD --verbose

# Проверить коммит из файла
npx commitlint --edit

# Проверить все коммиты в ветке
npx commitlint --from main --to HEAD --verbose
```

## Ресурсы

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Commitlint Documentation](https://commitlint.js.org/)
- [Semantic Versioning](https://semver.org/)
