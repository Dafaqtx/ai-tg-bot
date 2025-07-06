import {
  GeminiService,
  AudioService,
  ImageService,
  logger,
  UserSettingsService,
  ContextService,
} from "../services";
import { BotContext, AudioMessageType, FileInfo } from "../types";
import { safeReply } from "../utils";

// Создаем экземпляры сервисов
const userSettingsService = UserSettingsService.getInstance();
const contextService = ContextService.getInstance();

/**
 * Класс для обработки различных типов сообщений
 */
export class MessageHandlers {
  private audioService: AudioService;
  private imageService: ImageService;

  constructor(private geminiService: GeminiService) {
    this.audioService = new AudioService(geminiService);
    this.imageService = new ImageService(geminiService);
  }

  /**
   * Обработчик текстовых сообщений
   * Генерирует ответ с помощью Gemini API
   */
  async handleTextMessage(ctx: BotContext): Promise<void> {
    try {
      // Проверяем, что сообщение существует и содержит текст
      if (!ctx.message || !("text" in ctx.message) || !ctx.message.text) {
        return;
      }

      const messageText = ctx.message.text;
      const userId = ctx.from?.id;
      const username = ctx.from?.username;

      // Если это команда, игнорируем (обрабатывается отдельно)
      if (messageText.startsWith("/")) {
        return;
      }

      // Логируем активность пользователя
      if (userId) {
        logger.logUserActivity(userId, username, "text_message", {
          messageLength: messageText.length,
          chatType: ctx.chat?.type,
        });
      }

      // Отправляем индикатор набора текста
      await ctx.sendChatAction("typing");

      // Получаем настройки пользователя для персонализированного ответа
      const userSettings = userId
        ? userSettingsService.getUserSettings(userId, username)
        : null;

      // Получаем контекст предыдущих сообщений
      const context =
        userId && userSettings
          ? contextService.formatContextForPrompt(
              userId,
              userSettings.contextSettings
            )
          : "";

      // Добавляем сообщение пользователя в контекст
      if (userId && userSettings?.contextSettings.enabled) {
        contextService.addUserMessage(userId, messageText, "text");
      }

      // Генерируем ответ с помощью Gemini API с учетом стиля пользователя и контекста
      const response = await this.geminiService.generateTextResponse(
        messageText,
        userSettings?.responseStyle,
        context
      );

      // Добавляем ответ бота в контекст
      if (userId && userSettings?.contextSettings.enabled) {
        contextService.addAssistantMessage(userId, response);

        // Выполняем автоочистку контекста если необходимо
        contextService.autoCleanupContext(userId, userSettings.contextSettings);
      }

      // Отправляем ответ пользователю
      await safeReply(ctx, response, {
        parse_mode: "Markdown",
      });

      logger.debug("Текстовое сообщение обработано успешно", {
        userId,
        responseLength: response.length,
      });
    } catch (error) {
      logger.error("Ошибка при обработке текстового сообщения", error);
      void ctx.reply(
        "Произошла ошибка при обработке вашего сообщения. Пожалуйста, попробуйте позже."
      );
    }
  }

  /**
   * Обработчик изображений
   * Анализирует изображение с помощью Gemini API
   */
  async handleImageMessage(ctx: BotContext): Promise<void> {
    try {
      // Проверяем, что сообщение содержит изображение
      if (!ctx.message || !("photo" in ctx.message) || !ctx.message.photo) {
        return;
      }

      const userId = ctx.from?.id;
      const username = ctx.from?.username;

      // Логируем активность пользователя
      if (userId) {
        logger.logUserActivity(userId, username, "image_message", {
          chatType: ctx.chat?.type,
        });
      }

      // Отправляем индикатор загрузки фото
      await ctx.sendChatAction("upload_photo");

      // Получаем самое большое изображение из массива
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const fileId = photo.file_id;

      logger.info("Получено изображение для анализа", {
        userId,
        fileId,
        photoSize: `${photo.width}x${photo.height}`,
      });

      // Получаем URL для скачивания файла
      const fileUrl = await ctx.telegram.getFileLink(fileId);

      // Создаем информацию о файле
      const fileInfo: FileInfo = {
        fileId,
        fileUrl: fileUrl.href,
      };

      // Обрабатываем изображение
      const result = await this.imageService.processImageMessage(fileInfo);

      // Отправляем ответ пользователю
      await safeReply(ctx, result.message, {
        parse_mode: "Markdown",
      });

      logger.debug("Изображение обработано успешно", {
        userId,
        success: result.success,
      });
    } catch (error) {
      logger.error("Ошибка при обработке изображения", error);
      void ctx.reply(
        "Произошла ошибка при обработке вашего изображения. Пожалуйста, попробуйте позже."
      );
    }
  }

  /**
   * Обработчик аудиосообщений (голосовые и аудиофайлы)
   * Транскрибирует и анализирует аудио с помощью Gemini API
   */
  async handleAudioMessage(ctx: BotContext): Promise<void> {
    try {
      // Проверяем, что сообщение содержит аудио
      if (!ctx.message || !("voice" in ctx.message || "audio" in ctx.message)) {
        return;
      }

      // Отправляем индикатор записи аудио
      await ctx.sendChatAction("record_voice");

      // Определяем тип сообщения и получаем информацию о файле
      const isVoice = "voice" in ctx.message;
      const fileInfo = isVoice ? ctx.message.voice : ctx.message.audio;
      const fileId = fileInfo.file_id;

      // Получаем дополнительную информацию для разных типов аудио
      const messageType = isVoice
        ? AudioMessageType.VOICE
        : AudioMessageType.AUDIO_FILE;
      const duration = fileInfo.duration;
      const fileName = isVoice
        ? undefined
        : "file_name" in fileInfo && typeof fileInfo.file_name === "string"
        ? fileInfo.file_name
        : undefined;

      const userId = ctx.from?.id;
      const username = ctx.from?.username;

      // Логируем активность пользователя
      if (userId) {
        logger.logUserActivity(userId, username, "audio_message", {
          messageType,
          duration,
          fileName,
          chatType: ctx.chat?.type,
        });
      }

      logger.info(
        `Получено ${
          isVoice ? "голосовое сообщение" : "аудиофайл"
        } длительностью ${duration || "неизвестно"} сек`,
        {
          userId,
          fileId,
          messageType,
          duration,
        }
      );

      // Получаем URL для скачивания файла
      const fileUrl = await ctx.telegram.getFileLink(fileId);

      // Создаем информацию о файле
      const fileInfoData: FileInfo = {
        fileId,
        fileUrl: fileUrl.href,
        fileName,
        duration,
      };

      // Обрабатываем аудиосообщение
      const result = await this.audioService.processAudioMessage(
        fileInfoData,
        messageType
      );

      // Отправляем ответ пользователю
      void ctx.reply(result.message);

      logger.debug("Аудиосообщение обработано успешно", {
        userId,
        success: result.success,
        messageType,
      });
    } catch (error) {
      logger.error("Ошибка при обработке аудиосообщения", error);
      void ctx.reply(
        "Произошла ошибка при обработке вашего аудиосообщения. Пожалуйста, попробуйте позже."
      );
    }
  }

  /**
   * Обработчик неподдерживаемых типов сообщений
   */
  async handleUnsupportedMessage(ctx: BotContext): Promise<void> {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;

    // Логируем попытку отправить неподдерживаемый тип сообщения
    if (userId) {
      logger.logUserActivity(userId, username, "unsupported_message", {
        chatType: ctx.chat?.type,
      });
    }

    logger.warn("Получено неподдерживаемое сообщение", {
      userId,
      messageType: ctx.message ? Object.keys(ctx.message)[0] : "unknown",
    });

    void ctx.reply(
      "Я могу обрабатывать только текстовые сообщения, изображения и аудио."
    );
  }
}
