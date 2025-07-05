import * as path from "path";

import { promptConfig, TEMP_DIRS } from "../config";
import { FileInfo, MediaProcessResult } from "../types";
import {
  createTempDir,
  downloadFile,
  getImageMimeType,
  safeDeleteFile,
} from "../utils";

import { GeminiService } from "./geminiService";

/**
 * Сервис для обработки изображений
 */
export class ImageService {
  constructor(private geminiService: GeminiService) {}

  /**
   * Обрабатывает изображение и возвращает его анализ
   * @param fileInfo - информация о файле изображения
   * @returns Promise<MediaProcessResult> - результат обработки
   */
  async processImageMessage(fileInfo: FileInfo): Promise<MediaProcessResult> {
    let filePath: string | null = null;

    try {
      // Создаем временную директорию
      const tempDir = createTempDir(TEMP_DIRS.IMAGES);

      // Определяем расширение файла
      const fileExtension = fileInfo.fileName
        ? fileInfo.fileName.split(".").pop() || "jpg"
        : "jpg";

      // Путь для сохранения изображения
      filePath = path.join(tempDir, `${fileInfo.fileId}.${fileExtension}`);

      console.log("Обработка изображения...");

      // Скачиваем файл
      await downloadFile(fileInfo.fileUrl, filePath);

      // Определяем MIME тип изображения
      const mimeType = getImageMimeType(filePath);

      console.log(`Загружаем изображение в Gemini API (${mimeType})...`);

      // Загружаем файл в Gemini API
      const uploadedFile = await this.geminiService.uploadFile(
        filePath,
        mimeType
      );

      console.log("Отправляем запрос к Gemini для анализа изображения...");

      // Получаем ответ от Gemini
      const responseText = await this.geminiService.generateMediaResponse(
        uploadedFile.uri,
        uploadedFile.mimeType,
        promptConfig.imagePrompt
      );

      // Форматируем финальный ответ
      const finalResponse = `📸 **Анализ изображения**\n\n${responseText}`;

      return {
        success: true,
        message: finalResponse,
      };
    } catch (error) {
      console.error("Ошибка при обработке изображения:", error);

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
        return "📁 Изображение слишком большое. Попробуйте отправить изображение меньшего размера.";
      } else if (error.message.includes("unsupported")) {
        return "🚫 Неподдерживаемый формат изображения. Используйте JPG, PNG, WEBP, HEIC или HEIF.";
      }
    }

    return "Извините, произошла ошибка при обработке вашего изображения. Попробуйте еще раз или отправьте другое изображение.";
  }
}
