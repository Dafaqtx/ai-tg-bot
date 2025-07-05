import { BotContext } from "../types";
import { logger } from "../services";

/**
 * Обработчик команды /start
 * Приветствует пользователя и объясняет возможности бота
 */
export const startHandler = (ctx: BotContext): void => {
  const userName = ctx.from?.first_name || "пользователь";
  const userId = ctx.from?.id;
  const username = ctx.from?.username;

  // Логируем использование команды /start
  if (userId) {
    logger.logUserActivity(userId, username, "start_command", {
      firstName: ctx.from?.first_name,
      chatType: ctx.chat?.type,
    });
  }

  const welcomeMessage = `Привет, ${userName}! 👋

Добро пожаловать в наш Telegram бот с интеграцией Gemini API.

Просто напишите любой текст, отправьте изображение или аудио, и я отвечу вам с помощью искусственного интеллекта.

Используйте команду /help, чтобы узнать больше о функциях бота.`;

  // Используем void для игнорирования возвращаемого значения
  void ctx.reply(welcomeMessage, {
    parse_mode: "Markdown",
  });
};

/**
 * Обработчик команды /help
 * Показывает подробную информацию о возможностях бота
 */
export const helpHandler = (ctx: BotContext): void => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;

  // Логируем использование команды /help
  if (userId) {
    logger.logUserActivity(userId, username, "help_command", {
      chatType: ctx.chat?.type,
    });
  }

  const helpMessage = `🤖 **Что умеет этот бот:**

📝 **Команды:**
/start - Начать взаимодействие с ботом
/help - Показать список доступных команд

💬 **Обработка сообщений:**
• **Текстовые сообщения** - отвечаю с помощью ИИ
• **Изображения** - анализирую и описываю содержимое
• **Голосовые сообщения** - транскрибирую и отвечаю
• **Аудиофайлы** - анализирую содержание (речь, музыка, подкасты)

🖼️ **Особенности изображений:**
• Описание содержимого и объектов
• Анализ текста на изображениях
• Ответы на вопросы об изображении
• Поддерживаю форматы: JPG, PNG, WEBP, HEIC, HEIF

🎵 **Особенности аудио:**
• Короткие голосовые - естественный разговор
• Длинные голосовые - структурированный анализ
• Аудиофайлы - определяю тип и описываю содержание
• Поддерживаю форматы: MP3, WAV, M4A, AAC, OGG, FLAC

Просто отправьте сообщение и я обработаю его! 🚀`;

  // Используем void для игнорирования возвращаемого значения
  void ctx.reply(helpMessage, {
    parse_mode: "Markdown",
  });
};

/**
 * Обработчик неизвестных команд
 * Информирует пользователя о том, что команда не распознана
 */
export const unknownCommandHandler = (ctx: BotContext): void => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const command =
    ctx.message && "text" in ctx.message ? ctx.message.text : "unknown";

  // Логируем использование неизвестной команды
  if (userId) {
    logger.logUserActivity(userId, username, "unknown_command", {
      command,
      chatType: ctx.chat?.type,
    });
  }

  logger.warn("Получена неизвестная команда", {
    userId,
    command,
  });

  void ctx.reply(
    "Я не понимаю эту команду. Используйте /help для получения списка доступных команд."
  );
};
