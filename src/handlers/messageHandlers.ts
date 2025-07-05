import { GeminiService, AudioService, ImageService } from "../services";
import { BotContext, AudioMessageType, FileInfo } from "../types";

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

      // Если это команда, игнорируем (обрабатывается отдельно)
      if (messageText.startsWith("/")) {
        return;
      }

      // Отправляем индикатор набора текста
      await ctx.sendChatAction("typing");

      // Генерируем ответ с помощью Gemini API
      const response = await this.geminiService.generateTextResponse(
        messageText
      );

      // Отправляем ответ пользователю
      void ctx.reply(response, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("Ошибка при обработке текстового сообщения:", error);
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

      // Отправляем индикатор загрузки фото
      await ctx.sendChatAction("upload_photo");

      // Получаем самое большое изображение из массива
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const fileId = photo.file_id;

      console.log("Получено изображение для анализа");

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
      void ctx.reply(result.message, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("Ошибка при обработке изображения:", error);
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

      console.log(
        `Получено ${
          isVoice ? "голосовое сообщение" : "аудиофайл"
        } длительностью ${duration || "неизвестно"} сек`
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
    } catch (error) {
      console.error("Ошибка при обработке аудиосообщения:", error);
      void ctx.reply(
        "Произошла ошибка при обработке вашего аудиосообщения. Пожалуйста, попробуйте позже."
      );
    }
  }

  /**
   * Обработчик неподдерживаемых типов сообщений
   */
  async handleUnsupportedMessage(ctx: BotContext): Promise<void> {
    void ctx.reply(
      "Я могу обрабатывать только текстовые сообщения, изображения и аудио."
    );
  }
}
