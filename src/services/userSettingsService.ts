import {
  UserSettings,
  ResponseStyle,
  StyleDescription,
  ContextSettings,
} from "../types";

import { DEFAULT_CONTEXT_SETTINGS } from "./contextService";
import { DatabaseService } from "./databaseService";
import { logger } from "./loggerService";

/**
 * Описания доступных стилей ответов
 */
export const STYLE_DESCRIPTIONS: StyleDescription[] = [
  {
    key: "concise",
    name: "Краткий",
    description: "Короткие и лаконичные ответы с эмоджи",
    emoji: "⚡",
  },
  {
    key: "friendly",
    name: "Дружелюбный",
    description: "Теплое и понимающее общение как с другом",
    emoji: "😊",
  },
  {
    key: "detailed",
    name: "Подробный",
    description: "Развернутые информативные ответы с практическими советами",
    emoji: "📚",
  },
  {
    key: "expert",
    name: "Экспертный",
    description: "Системный анализ и структурированные ответы",
    emoji: "🧠",
  },
  {
    key: "medical",
    name: "Медицинский",
    description: "Специализированные ответы по вопросам здоровья",
    emoji: "🩺",
  },
  {
    key: "educational",
    name: "Образовательный",
    description:
      "Объяснения как для студентов с примерами и пошаговыми инструкциями",
    emoji: "🎓",
  },
  {
    key: "motivational",
    name: "Мотивирующий",
    description: "Вдохновляющие и поддерживающие ответы с призывами к действию",
    emoji: "💪",
  },
  {
    key: "developer",
    name: "Программистский",
    description: "Технические ответы с примерами кода и IT-терминологией",
    emoji: "💻",
  },
  {
    key: "humorous",
    name: "Юмористический",
    description: "Развлекательные ответы с шутками и легким тоном",
    emoji: "😄",
  },
  {
    key: "calm",
    name: "Спокойный",
    description: "Расслабляющие и успокаивающие ответы для снятия стресса",
    emoji: "🧘",
  },
];

/**
 * Сервис для управления настройками пользователей
 * Использует SQLite базу данных для хранения настроек
 */
export class UserSettingsService {
  private static instance: UserSettingsService;
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Получает экземпляр сервиса (Singleton)
   */
  public static getInstance(): UserSettingsService {
    if (!UserSettingsService.instance) {
      UserSettingsService.instance = new UserSettingsService();
    }
    return UserSettingsService.instance;
  }

  /**
   * Получает настройки пользователя или создает настройки по умолчанию
   * @param userId - ID пользователя
   * @param username - имя пользователя (опционально)
   * @returns настройки пользователя
   */
  public getUserSettings(userId: number, username?: string): UserSettings {
    try {
      // Подготавливаем запрос на получение настроек
      const selectStmt = this.db.prepare(`
        SELECT 
          user_id,
          username,
          response_style,
          context_enabled,
          context_max_messages,
          context_max_tokens,
          context_auto_cleanup,
          created_at,
          updated_at
        FROM user_settings 
        WHERE user_id = ?
      `);

      const row = selectStmt.get(userId);

      if (row) {
        // Преобразуем данные из базы в объект настроек
        const settings: UserSettings = {
          userId: row.user_id,
          username: row.username,
          responseStyle: row.response_style as ResponseStyle,
          contextSettings: {
            enabled: Boolean(row.context_enabled),
            maxMessages: row.context_max_messages,
            maxTokens: row.context_max_tokens,
            autoCleanup: Boolean(row.context_auto_cleanup),
          },
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        return settings;
      }

      // Создаем настройки по умолчанию для нового пользователя
      const defaultSettings: UserSettings = {
        userId,
        username,
        responseStyle: "friendly", // По умолчанию дружелюбный стиль
        contextSettings: { ...DEFAULT_CONTEXT_SETTINGS }, // Настройки контекста по умолчанию
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Сохраняем новые настройки в базу
      const insertStmt = this.db.prepare(`
        INSERT INTO user_settings (
          user_id, 
          username, 
          response_style,
          context_enabled,
          context_max_messages,
          context_max_tokens,
          context_auto_cleanup
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        userId,
        username,
        defaultSettings.responseStyle,
        defaultSettings.contextSettings.enabled ? 1 : 0,
        defaultSettings.contextSettings.maxMessages,
        defaultSettings.contextSettings.maxTokens,
        defaultSettings.contextSettings.autoCleanup ? 1 : 0
      );

      logger.logUserActivity(userId, username, "settings_created", {
        defaultStyle: defaultSettings.responseStyle,
        contextEnabled: defaultSettings.contextSettings.enabled,
      });

      return defaultSettings;
    } catch (error) {
      logger.error("Ошибка при получении настроек пользователя", {
        userId,
        username,
        error,
      });
      throw error;
    }
  }

  /**
   * Обновляет стиль ответов пользователя
   * @param userId - ID пользователя
   * @param responseStyle - новый стиль ответов
   * @param username - имя пользователя (опционально)
   * @returns обновленные настройки
   */
  public updateUserStyle(
    userId: number,
    responseStyle: ResponseStyle,
    username?: string
  ): UserSettings {
    try {
      // Обновляем стиль в базе данных
      const updateStmt = this.db.prepare(`
        UPDATE user_settings 
        SET response_style = ?, username = COALESCE(?, username)
        WHERE user_id = ?
      `);

      const result = updateStmt.run(responseStyle, username, userId);

      if (result.changes === 0) {
        // Пользователь не найден, создаем новые настройки
        return this.getUserSettings(userId, username);
      }

      logger.logUserActivity(userId, username, "style_updated", {
        newStyle: responseStyle,
      });

      // Возвращаем обновленные настройки
      return this.getUserSettings(userId, username);
    } catch (error) {
      logger.error("Ошибка при обновлении стиля пользователя", {
        userId,
        responseStyle,
        username,
        error,
      });
      throw error;
    }
  }

  /**
   * Получает описание стиля по ключу
   * @param styleKey - ключ стиля
   * @returns описание стиля или undefined
   */
  public getStyleDescription(
    styleKey: ResponseStyle
  ): StyleDescription | undefined {
    return STYLE_DESCRIPTIONS.find((style) => style.key === styleKey);
  }

  /**
   * Получает все доступные стили
   * @returns массив всех стилей
   */
  public getAllStyles(): StyleDescription[] {
    return STYLE_DESCRIPTIONS;
  }

  /**
   * Проверяет, является ли строка валидным стилем
   * @param style - строка для проверки
   * @returns true, если стиль валиден
   */
  public isValidStyle(style: string): style is ResponseStyle {
    return STYLE_DESCRIPTIONS.some((desc) => desc.key === style);
  }

  /**
   * Получает статистику использования стилей
   * @returns объект с количеством пользователей для каждого стиля
   */
  public getStyleStats(): Record<ResponseStyle, number> {
    try {
      const statsStmt = this.db.prepare(`
        SELECT response_style, COUNT(*) as count 
        FROM user_settings 
        GROUP BY response_style
      `);

      const rows = statsStmt.all();
      const stats: Record<ResponseStyle, number> = {} as Record<
        ResponseStyle,
        number
      >;

      // Инициализируем все стили нулями
      STYLE_DESCRIPTIONS.forEach((style) => {
        stats[style.key] = 0;
      });

      // Заполняем реальными данными
      rows.forEach((row: { response_style: string; count: number }) => {
        if (this.isValidStyle(row.response_style)) {
          stats[row.response_style as ResponseStyle] = row.count;
        }
      });

      return stats;
    } catch (error) {
      logger.error("Ошибка при получении статистики стилей", error);
      throw error;
    }
  }

  /**
   * Обновляет настройки контекста пользователя
   * @param userId - ID пользователя
   * @param contextSettings - новые настройки контекста
   * @param username - имя пользователя (опционально)
   * @returns обновленные настройки
   */
  public updateUserContextSettings(
    userId: number,
    contextSettings: Partial<ContextSettings>,
    username?: string
  ): UserSettings {
    try {
      // Получаем текущие настройки
      const currentSettings = this.getUserSettings(userId, username);

      // Объединяем с новыми настройками
      const newContextSettings = {
        ...currentSettings.contextSettings,
        ...contextSettings,
      };

      // Обновляем в базе данных
      const updateStmt = this.db.prepare(`
        UPDATE user_settings 
        SET 
          context_enabled = ?,
          context_max_messages = ?,
          context_max_tokens = ?,
          context_auto_cleanup = ?,
          username = COALESCE(?, username)
        WHERE user_id = ?
      `);

      updateStmt.run(
        newContextSettings.enabled ? 1 : 0,
        newContextSettings.maxMessages,
        newContextSettings.maxTokens,
        newContextSettings.autoCleanup ? 1 : 0,
        username,
        userId
      );

      logger.logUserActivity(userId, username, "context_settings_updated", {
        newSettings: newContextSettings,
      });

      // Возвращаем обновленные настройки
      return this.getUserSettings(userId, username);
    } catch (error) {
      logger.error("Ошибка при обновлении настроек контекста", {
        userId,
        contextSettings,
        username,
        error,
      });
      throw error;
    }
  }

  /**
   * Получает общее количество пользователей
   * @returns количество пользователей
   */
  public getUsersCount(): number {
    try {
      const countStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM user_settings
      `);

      const result = countStmt.get();
      return result.count;
    } catch (error) {
      logger.error("Ошибка при получении количества пользователей", error);
      throw error;
    }
  }
}
