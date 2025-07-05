import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

// Определение типа контекста для бота
export type BotContext = Context<Update>;

// Типы аудиосообщений для разных промтов
export enum AudioMessageType {
  VOICE = "voice",
  AUDIO_FILE = "audio_file",
}

// Интерфейс для конфигурации бота
export interface BotConfig {
  botToken: string;
  geminiApiKey: string;
}

// Интерфейс для информации о файле
export interface FileInfo {
  fileId: string;
  fileUrl: string;
  fileName?: string;
  duration?: number;
  mimeType?: string;
}

// Интерфейс для результата обработки медиа
export interface MediaProcessResult {
  success: boolean;
  message: string;
  error?: string;
}

// Типы поддерживаемых аудио форматов
export type AudioFormat = "mp3" | "wav" | "m4a" | "aac" | "ogg" | "flac";

// Типы поддерживаемых изображений
export type ImageFormat = "jpg" | "jpeg" | "png" | "webp" | "heic" | "heif";
