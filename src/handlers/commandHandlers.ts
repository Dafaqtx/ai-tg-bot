import { Markup } from "telegraf";

import { logger, userSettingsService, contextService } from "../services";
import { BotContext, ResponseStyle } from "../types";
import { safeReply } from "../utils";

/**
 * Обработчик команды /start
 * Приветствует пользователя и объясняет возможности бота
 */
export const startHandler = async (ctx: BotContext): Promise<void> => {
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

Добро пожаловать в Telegram бот с интеграцией Gemini API.

Просто напишите любой текст, отправьте изображение или аудио, и я отвечу вам с помощью искусственного интеллекта.

Используйте команду /help, чтобы узнать больше о функциях бота.`;

  // Используем безопасную отправку сообщения
  await safeReply(ctx, welcomeMessage, {
    parse_mode: "Markdown",
  });
};

/**
 * Обработчик команды /help
 * Показывает подробную информацию о возможностях бота
 */
export const helpHandler = async (ctx: BotContext): Promise<void> => {
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
/style - Посмотреть текущий стиль ответов
/styles - Показать все доступные стили
/setstyle [название] - Изменить стиль ответов
/context - Информация о контексте диалога
/clearcontext - Очистить историю сообщений

🎨 **Персонализация:**
• **10 стилей ответов** - краткий, дружелюбный, подробный, экспертный, медицинский и др.
• **Удобный выбор** - кнопки в команде /styles или текстовые команды
• **Персональные настройки** - каждый пользователь может выбрать свой стиль
• **Автосохранение** - ваши настройки запоминаются

🧠 **Память диалога:**
• **Контекст сообщений** - запоминаю предыдущие сообщения для связного разговора
• **Умное управление** - автоматически очищаю старые сообщения при необходимости
• **Настройки памяти** - можно посмотреть статистику и очистить историю
• **Персональный контекст** - у каждого пользователя своя история

💬 **Обработка сообщений:**
• **Текстовые сообщения** - отвечаю с помощью ИИ в вашем стиле с учетом контекста
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

Просто отправьте сообщение и я обработаю его в вашем стиле! 🚀`;

  // Используем безопасную отправку сообщения
  await safeReply(ctx, helpMessage, {
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

  const message = `❓ Неизвестная команда: ${command}

Доступные команды:
• /start - начать работу с ботом
• /help - показать справку
• /style - посмотреть текущий стиль ответов
• /styles - посмотреть все стили и изменить настройки
• /setstyle [стиль] - изменить стиль ответов
• /context - информация о контексте диалога
• /clearcontext - очистить историю диалога

Или просто напишите любой текст, и я отвечу вам! 😊`;

  void safeReply(ctx, message, { parse_mode: "Markdown" });
};

/**
 * Обработчик команды /style
 * Показывает текущий стиль и предлагает его изменить
 */
export const styleHandler = async (ctx: BotContext): Promise<void> => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;

  if (!userId) {
    await safeReply(ctx, "Не удалось определить пользователя.");
    return;
  }

  // Логируем использование команды /style
  logger.logUserActivity(userId, username, "style_command", {
    chatType: ctx.chat?.type,
  });

  try {
    // Получаем текущие настройки пользователя
    const userSettings = userSettingsService.getUserSettings(userId, username);
    const currentStyle = userSettingsService.getStyleDescription(
      userSettings.responseStyle
    );

    const message = `🎨 **Ваш текущий стиль ответов:**

${currentStyle?.emoji} **${currentStyle?.name}**
${currentStyle?.description}

Используйте /styles чтобы посмотреть все доступные стили и изменить настройки.`;

    await safeReply(ctx, message, { parse_mode: "Markdown" });
  } catch (error) {
    logger.error("Ошибка при получении стиля пользователя", error);
    await safeReply(ctx, "Произошла ошибка при получении ваших настроек.");
  }
};

/**
 * Обработчик команды /styles
 * Показывает все доступные стили с кнопками для выбора
 */
export const stylesHandler = async (ctx: BotContext): Promise<void> => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;

  if (!userId) {
    await safeReply(ctx, "Не удалось определить пользователя.");
    return;
  }

  // Логируем использование команды /styles
  logger.logUserActivity(userId, username, "styles_command", {
    chatType: ctx.chat?.type,
  });

  try {
    // Получаем все доступные стили
    const allStyles = userSettingsService.getAllStyles();
    const userSettings = userSettingsService.getUserSettings(userId, username);

    // Создаем описание всех стилей
    let message = "🎨 **Выберите стиль ответов:**\n\n";

    allStyles.forEach((style) => {
      const isActive = style.key === userSettings.responseStyle;
      const activeMarker = isActive ? "✅ " : "";
      message += `${activeMarker}${style.emoji} **${style.name}**\n`;
      message += `${style.description}\n`;
      message += `Команда: \`/setstyle ${style.key}\`\n\n`;
    });

    message += `Ваш текущий стиль: **${userSettings.responseStyle}**\n\n`;
    message += "💡 **Как изменить:**\n";
    message += "• Нажмите на кнопку ниже\n";
    message += "• Или используйте команду из списка выше";

    // Создаем inline-кнопки для каждого стиля
    const keyboard = allStyles.map((style) => {
      const isActive = style.key === userSettings.responseStyle;
      const buttonText = isActive
        ? `✅ ${style.emoji} ${style.name}`
        : `${style.emoji} ${style.name}`;

      return [Markup.button.callback(buttonText, `setstyle_${style.key}`)];
    });

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    });
  } catch (error) {
    logger.error("Ошибка при показе стилей", error);
    await safeReply(ctx, "Произошла ошибка при загрузке стилей.");
  }
};

/**
 * Обработчик команды /setstyle [style]
 * Устанавливает новый стиль ответов
 */
export const setStyleHandler = async (ctx: BotContext): Promise<void> => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;

  if (!userId) {
    await safeReply(ctx, "Не удалось определить пользователя.");
    return;
  }

  // Получаем аргумент команды
  const messageText =
    ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const args = messageText.split(" ");

  if (args.length < 2) {
    await safeReply(
      ctx,
      "Укажите стиль ответов. Например: `/setstyle friendly`\n\nИспользуйте /styles чтобы посмотреть все доступные стили.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const newStyleKey = args[1].toLowerCase();

  // Логируем попытку смены стиля
  logger.logUserActivity(userId, username, "setstyle_command", {
    requestedStyle: newStyleKey,
    chatType: ctx.chat?.type,
  });

  try {
    // Проверяем, что стиль валидный
    if (!userSettingsService.isValidStyle(newStyleKey)) {
      await safeReply(
        ctx,
        `❌ Неизвестный стиль "${newStyleKey}". Используйте /styles чтобы посмотреть доступные стили.`
      );
      return;
    }

    // Обновляем стиль пользователя
    const updatedSettings = userSettingsService.updateUserStyle(
      userId,
      newStyleKey as ResponseStyle,
      username
    );

    const styleDescription = userSettingsService.getStyleDescription(
      updatedSettings.responseStyle
    );

    const message = `✅ **Стиль ответов изменен!**

${styleDescription?.emoji} **${styleDescription?.name}**
${styleDescription?.description}

Теперь я буду отвечать в этом стиле. Попробуйте задать мне любой вопрос!`;

    await safeReply(ctx, message, { parse_mode: "Markdown" });
  } catch (error) {
    logger.error("Ошибка при установке стиля", error);
    await safeReply(ctx, "Произошла ошибка при изменении стиля.");
  }
};

/**
 * Обработчик callback_query для inline-кнопок выбора стиля
 */
export const styleCallbackHandler = async (ctx: BotContext): Promise<void> => {
  const callbackData =
    ctx.callbackQuery && "data" in ctx.callbackQuery
      ? ctx.callbackQuery.data
      : "";
  const userId = ctx.from?.id;
  const username = ctx.from?.username;

  if (!userId) {
    await ctx.answerCbQuery("Не удалось определить пользователя.");
    return;
  }

  // Проверяем, что это callback для смены стиля
  if (!callbackData.startsWith("setstyle_")) {
    await ctx.answerCbQuery("Неизвестная команда.");
    return;
  }

  const newStyleKey = callbackData.replace("setstyle_", "");

  // Логируем попытку смены стиля через кнопку
  logger.logUserActivity(userId, username, "setstyle_callback", {
    requestedStyle: newStyleKey,
    chatType: ctx.chat?.type,
  });

  try {
    // Проверяем, что стиль валидный
    if (!userSettingsService.isValidStyle(newStyleKey)) {
      await ctx.answerCbQuery(`❌ Неизвестный стиль "${newStyleKey}"`);
      return;
    }

    // Обновляем стиль пользователя
    const updatedSettings = userSettingsService.updateUserStyle(
      userId,
      newStyleKey as ResponseStyle,
      username
    );

    const styleDescription = userSettingsService.getStyleDescription(
      updatedSettings.responseStyle
    );

    // Отвечаем на callback
    await ctx.answerCbQuery(`✅ Стиль изменен на "${styleDescription?.name}"`);

    // Обновляем сообщение с новыми кнопками
    const allStyles = userSettingsService.getAllStyles();

    let message = "🎨 **Выберите стиль ответов:**\n\n";

    allStyles.forEach((style) => {
      const isActive = style.key === updatedSettings.responseStyle;
      const activeMarker = isActive ? "✅ " : "";
      message += `${activeMarker}${style.emoji} **${style.name}**\n`;
      message += `${style.description}\n`;
      message += `Команда: \`/setstyle ${style.key}\`\n\n`;
    });

    message += `Ваш текущий стиль: **${updatedSettings.responseStyle}**\n\n`;
    message += "💡 **Как изменить:**\n";
    message += "• Нажмите на кнопку ниже\n";
    message += "• Или используйте команду из списка выше";

    // Обновляем кнопки
    const keyboard = allStyles.map((style) => {
      const isActive = style.key === updatedSettings.responseStyle;
      const buttonText = isActive
        ? `✅ ${style.emoji} ${style.name}`
        : `${style.emoji} ${style.name}`;

      return [Markup.button.callback(buttonText, `setstyle_${style.key}`)];
    });

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    });

    // Отправляем дополнительное сообщение с подтверждением
    const confirmMessage = `✅ **Стиль ответов изменен!**

${styleDescription?.emoji} **${styleDescription?.name}**
${styleDescription?.description}

Теперь я буду отвечать в этом стиле. Попробуйте задать мне любой вопрос!`;

    await safeReply(ctx, confirmMessage, { parse_mode: "Markdown" });
  } catch (error) {
    logger.error("Ошибка при установке стиля через callback", error);
    await ctx.answerCbQuery("Произошла ошибка при изменении стиля.");
  }
};

/**
 * Обработчик команды /context
 * Показывает информацию о текущем контексте пользователя
 */
export const contextHandler = async (ctx: BotContext): Promise<void> => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;

  if (!userId) {
    await safeReply(ctx, "Не удалось определить пользователя.");
    return;
  }

  // Логируем использование команды /context
  logger.logUserActivity(userId, username, "context_command", {
    chatType: ctx.chat?.type,
  });

  try {
    // Получаем настройки пользователя
    const userSettings = userSettingsService.getUserSettings(userId, username);
    const contextSettings = userSettings.contextSettings;

    // Получаем статистику контекста
    const stats = contextService.getUserContextStats(userId);

    const statusEmoji = contextSettings.enabled ? "✅" : "❌";
    const autoCleanupEmoji = contextSettings.autoCleanup ? "🔄" : "⏸️";

    const message = `🧠 **Настройки контекста диалога**

${statusEmoji} **Статус**: ${contextSettings.enabled ? "Включен" : "Выключен"}
📊 **Сообщений в памяти**: ${stats.messageCount}
🔢 **Примерно токенов**: ${stats.estimatedTokens}

⚙️ **Настройки**:
• Максимум сообщений: ${contextSettings.maxMessages}
• Максимум токенов: ${contextSettings.maxTokens}
• ${autoCleanupEmoji} Автоочистка: ${
      contextSettings.autoCleanup ? "Включена" : "Выключена"
    }

${
  stats.oldestMessage
    ? `📅 **Самое старое сообщение**: ${new Date(
        stats.oldestMessage
      ).toLocaleString("ru-RU")}`
    : ""
}

Используйте /clearcontext чтобы очистить историю диалога.`;

    await safeReply(ctx, message, { parse_mode: "Markdown" });
  } catch (error) {
    logger.error("Ошибка при получении информации о контексте", error);
    await safeReply(
      ctx,
      "Произошла ошибка при получении информации о контексте."
    );
  }
};

/**
 * Обработчик команды /clearcontext
 * Очищает контекст диалога пользователя
 */
export const clearContextHandler = async (ctx: BotContext): Promise<void> => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;

  if (!userId) {
    await safeReply(ctx, "Не удалось определить пользователя.");
    return;
  }

  // Логируем использование команды /clearcontext
  logger.logUserActivity(userId, username, "clear_context_command", {
    chatType: ctx.chat?.type,
  });

  try {
    // Очищаем контекст пользователя
    const clearedCount = contextService.clearUserContext(userId);

    const message =
      clearedCount > 0
        ? `🧹 **Контекст очищен!**

Удалено сообщений: ${clearedCount}

Теперь я не помню предыдущие сообщения. Можете начать новый диалог! 🚀`
        : `📝 **Контекст уже пуст**

У вас нет сохраненных сообщений в памяти.`;

    await safeReply(ctx, message, { parse_mode: "Markdown" });
  } catch (error) {
    logger.error("Ошибка при очистке контекста", error);
    await safeReply(ctx, "Произошла ошибка при очистке контекста.");
  }
};
