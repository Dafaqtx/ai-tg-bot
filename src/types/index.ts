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

/**
 * Доступные стили ответов бота
 */
export type ResponseStyle =
  | "detailed" // Подробный - развернутые информативные ответы
  | "concise" // Краткий - короткие и лаконичные ответы
  | "friendly" // Дружелюбный - теплое и понимающее общение
  | "expert" // Экспертный - системный анализ и профессиональные ответы
  | "medical" // Медицинский - специализированные ответы по здоровью
  | "educational" // Образовательный - объяснения как для студентов
  | "motivational" // Мотивирующий - вдохновляющие и поддерживающие ответы
  | "developer" // Программистский - технические ответы для разработчиков
  | "humorous" // Юмористический - развлекательные ответы с юмором
  | "calm"; // Спокойный - расслабляющие и успокаивающие ответы

/**
 * Настройки пользователя
 */
export interface UserSettings {
  userId: number;
  username?: string;
  responseStyle: ResponseStyle;
  createdAt: string;
  updatedAt: string;
}

/**
 * Описание стиля ответа для пользователя
 */
export interface StyleDescription {
  key: ResponseStyle;
  name: string;
  description: string;
  emoji: string;
}
