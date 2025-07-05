import * as path from "path";
import { AudioMessageType, FileInfo, MediaProcessResult } from "../types";
import { promptConfig, TEMP_DIRS } from "../config";
import { GeminiService } from "./geminiService";
import {
  createTempDir,
  downloadFile,
  getMimeTypeFromExtension,
  safeDeleteFile,
  formatDuration,
} from "../utils";

/**
 * Сервис для обработки аудиосообщений
 */
export class AudioService {
  constructor(private geminiService: GeminiService) {}

  /**
   * Обрабатывает аудиосообщение (голосовое или аудиофайл)
   * @param fileInfo - информация о файле
   * @param messageType - тип аудиосообщения
   * @returns Promise<MediaProcessResult> - результат обработки
   */
  async processAudioMessage(
    fileInfo: FileInfo,
    messageType: AudioMessageType
  ): Promise<MediaProcessResult> {
    let filePath: string | null = null;

    try {
      // Создаем временную директорию
      const tempDir = createTempDir(TEMP_DIRS.AUDIO);

      // Определяем расширение файла
      const fileExtension = this.getFileExtension(
        messageType,
        fileInfo.fileName
      );

      // Путь для сохранения аудиофайла
      filePath = path.join(tempDir, `${fileInfo.fileId}.${fileExtension}`);

      console.log(
        `Обработка ${
          messageType === AudioMessageType.VOICE
            ? "голосового сообщения"
            : "аудиофайла"
        }...`
      );

      // Скачиваем файл
      await downloadFile(fileInfo.fileUrl, filePath);

      // Получаем подходящий промт
      const audioPrompt = this.getAudioPrompt(messageType, fileInfo.duration);

      // Определяем MIME тип
      const mimeType = getMimeTypeFromExtension(filePath);

      console.log(`Загружаем файл в Gemini API (${mimeType})...`);

      // Загружаем файл в Gemini API
      const uploadedFile = await this.geminiService.uploadFile(
        filePath,
        mimeType
      );

      console.log("Отправляем запрос к Gemini для анализа аудио...");

      // Получаем ответ от Gemini
      const responseText = await this.geminiService.generateMediaResponse(
        uploadedFile.uri,
        uploadedFile.mimeType,
        audioPrompt
      );

      // Форматируем финальный ответ
      const finalResponse = this.formatResponse(
        messageType,
        responseText,
        fileInfo.duration
      );

      return {
        success: true,
        message: finalResponse,
      };
    } catch (error) {
      console.error("Ошибка при обработке аудиосообщения:", error);

      return {
        success: false,
        message: this.getErrorMessage(error),
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      };
    } finally {
      // Удаляем временный файл
      if (filePath) {
        safeDeleteFile(filePath);
      }
    }
  }

  /**
   * Определяет расширение файла в зависимости от типа сообщения
   * @param messageType - тип аудиосообщения
   * @param fileName - имя файла (если есть)
   * @returns расширение файла
   */
  private getFileExtension(
    messageType: AudioMessageType,
    fileName?: string
  ): string {
    if (messageType === AudioMessageType.VOICE) {
      return "ogg";
    }

    if (fileName) {
      return fileName.split(".").pop() || "mp3";
    }

    return "mp3";
  }

  /**
   * Получает промт для анализа аудио в зависимости от типа и длительности
   * @param messageType - тип аудиосообщения
   * @param duration - длительность в секундах
   * @returns промт для анализа
   */
  private getAudioPrompt(
    messageType: AudioMessageType,
    duration?: number
  ): string {
    const basePrompt =
      "Ты - умный ИИ-ассистент в чате Telegram, который обрабатывает аудиосообщения.";

    switch (messageType) {
      case AudioMessageType.VOICE:
        if (duration && duration > 60) {
          // Длинное голосовое сообщение - структурированный анализ
          return `${basePrompt} 
        
ЗАДАЧА: Транскрибируй и проанализируй это голосовое сообщение.

ИНСТРУКЦИИ:
1. Сначала создай точную транскрипцию речи
2. Выдели основные темы и ключевые моменты
3. Если есть вопросы - дай краткие ответы
4. Если есть просьбы - укажи, что можешь помочь
5. Используй эмоджи для лучшего восприятия

ФОРМАТ ОТВЕТА:
📝 **Транскрипция:** [точный текст]
💡 **Основные моменты:** [ключевые темы]
❓ **Ответы на вопросы:** [если есть вопросы]`;
        } else {
          // Короткое голосовое сообщение - естественный диалог
          return promptConfig.voicePrompt;
        }

      case AudioMessageType.AUDIO_FILE:
        return promptConfig.audioFilePrompt;

      default:
        return `${basePrompt} Транскрибируй и кратко опиши содержание этого аудио. Используй эмоджи для лучшего восприятия.`;
    }
  }

  /**
   * Форматирует финальный ответ в зависимости от типа сообщения
   * @param messageType - тип аудиосообщения
   * @param responseText - ответ от Gemini
   * @param duration - длительность аудио
   * @returns отформатированный ответ
   */
  private formatResponse(
    messageType: AudioMessageType,
    responseText: string,
    duration?: number
  ): string {
    // Добавляем информацию о длительности для голосовых сообщений
    if (messageType === AudioMessageType.VOICE && duration) {
      const durationText = formatDuration(duration);
      return `🎤 **Голосовое сообщение** (${durationText})\n\n${responseText}`;
    }

    return responseText;
  }

  /**
   * Возвращает понятное сообщение об ошибке
   * @param error - объект ошибки
   * @returns сообщение об ошибке
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes("User location is not supported")) {
        return "😔 К сожалению, Gemini API недоступен в вашем регионе. Попробуйте использовать VPN.";
      } else if (error.message.includes("quota")) {
        return "⚠️ Превышена квота API. Попробуйте позже.";
      } else if (error.message.includes("file size")) {
        return "📁 Файл слишком большой. Попробуйте отправить более короткое аудио.";
      }
    }

    return "Извините, произошла ошибка при обработке вашего аудиосообщения. Попробуйте еще раз или отправьте более короткое сообщение.";
  }
}
