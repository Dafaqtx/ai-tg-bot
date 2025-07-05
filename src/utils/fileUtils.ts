import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { AudioFormat, ImageFormat } from "../types";

/**
 * Определяет MIME тип аудиофайла на основе расширения
 * @param filename - имя файла или путь к файлу
 * @returns MIME тип аудиофайла
 */
export function getMimeTypeFromExtension(filename: string): string {
  const extension = filename.toLowerCase().split(".").pop() as AudioFormat;

  const mimeTypes: Record<AudioFormat, string> = {
    mp3: "audio/mp3",
    wav: "audio/wav",
    m4a: "audio/m4a",
    aac: "audio/aac",
    ogg: "audio/ogg",
    flac: "audio/flac",
  };

  return mimeTypes[extension] || "audio/ogg"; // По умолчанию для голосовых сообщений Telegram
}

/**
 * Определяет MIME тип изображения на основе расширения
 * @param filename - имя файла или путь к файлу
 * @returns MIME тип изображения
 */
export function getImageMimeType(filename: string): string {
  const extension = filename.toLowerCase().split(".").pop() as ImageFormat;

  const mimeTypes: Record<ImageFormat, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
  };

  return mimeTypes[extension] || "image/jpeg"; // По умолчанию для изображений
}

/**
 * Создает временную директорию если она не существует
 * @param dirName - имя временной директории
 * @returns полный путь к временной директории
 */
export function createTempDir(dirName: string): string {
  const tempDir = path.join(os.tmpdir(), dirName);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  return tempDir;
}

/**
 * Безопасно удаляет временный файл
 * @param filePath - путь к файлу для удаления
 */
export function safeDeleteFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn("Не удалось удалить временный файл:", error);
  }
}

/**
 * Скачивает файл по URL и сохраняет его локально
 * @param fileUrl - URL файла для скачивания
 * @param filePath - путь для сохранения файла
 * @returns Promise<void>
 */
export async function downloadFile(
  fileUrl: string,
  filePath: string
): Promise<void> {
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Не удалось скачать файл: ${response.statusText}`);
  }

  const fileBuffer = await response.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(fileBuffer));
}

/**
 * Форматирует длительность аудио в читаемый формат
 * @param duration - длительность в секундах
 * @returns отформатированная строка времени
 */
export function formatDuration(duration: number): string {
  if (duration > 60) {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")} мин`;
  }
  return `${duration} сек`;
}
