import fs from "fs";

import path from "path";

import {
  UserSettings,
  ResponseStyle,
  StyleDescription,
  ContextSettings,
} from "../types";

import { DEFAULT_CONTEXT_SETTINGS } from "./contextService";
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
 * Сохраняет настройки в JSON файл для персистентности
 */
export class UserSettingsService {
  private static instance: UserSettingsService;
  private settingsFile: string;
  private userSettings: Map<number, UserSettings> = new Map();

  constructor() {
    // Создаем путь к файлу настроек
    this.settingsFile = path.join(process.cwd(), "data", "user-settings.json");
    this.ensureDataDirectory();
    this.loadSettings();
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
   * Создает директорию data если её нет
   */
  private ensureDataDirectory(): void {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info("Создана директория для данных", { path: dataDir });
    }
  }

  /**
   * Загружает настройки из файла
   */
  private loadSettings(): void {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, "utf8");
        const settings: UserSettings[] = JSON.parse(data);

        // Преобразуем массив в Map для быстрого доступа
        this.userSettings.clear();
        settings.forEach((setting) => {
          // Миграция: добавляем настройки контекста для старых пользователей
          if (!setting.contextSettings) {
            setting.contextSettings = { ...DEFAULT_CONTEXT_SETTINGS };
          }
          this.userSettings.set(setting.userId, setting);
        });

        logger.info("Настройки пользователей загружены", {
          usersCount: settings.length,
        });
      } else {
        logger.info("Файл настроек не найден, создаем новый");
        this.saveSettings();
      }
    } catch (error) {
      logger.error("Ошибка при загрузке настроек пользователей", error);
      // В случае ошибки инициализируем пустую Map
      this.userSettings.clear();
    }
  }

  /**
   * Сохраняет настройки в файл
   */
  private saveSettings(): void {
    try {
      const settings = Array.from(this.userSettings.values());
      fs.writeFileSync(
        this.settingsFile,
        JSON.stringify(settings, null, 2),
        "utf8"
      );

      logger.debug("Настройки пользователей сохранены", {
        usersCount: settings.length,
      });
    } catch (error) {
      logger.error("Ошибка при сохранении настроек пользователей", error);
    }
  }

  /**
   * Получает настройки пользователя или создает настройки по умолчанию
   * @param userId - ID пользователя
   * @param username - имя пользователя (опционально)
   * @returns настройки пользователя
   */
  public getUserSettings(userId: number, username?: string): UserSettings {
    let settings = this.userSettings.get(userId);

    if (!settings) {
      // Создаем настройки по умолчанию для нового пользователя
      settings = {
        userId,
        username,
        responseStyle: "friendly", // По умолчанию дружелюбный стиль
        contextSettings: { ...DEFAULT_CONTEXT_SETTINGS }, // Настройки контекста по умолчанию
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.userSettings.set(userId, settings);
      this.saveSettings();

      logger.logUserActivity(userId, username, "settings_created", {
        defaultStyle: settings.responseStyle,
        contextEnabled: settings.contextSettings.enabled,
      });
    }

    return settings;
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
    const settings = this.getUserSettings(userId, username);
    const oldStyle = settings.responseStyle;

    settings.responseStyle = responseStyle;
    settings.updatedAt = new Date().toISOString();

    // Обновляем username если передан
    if (username) {
      settings.username = username;
    }

    this.userSettings.set(userId, settings);
    this.saveSettings();

    logger.logUserActivity(userId, username, "style_changed", {
      oldStyle,
      newStyle: responseStyle,
    });

    return settings;
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
   * @returns массив описаний стилей
   */
  public getAllStyles(): StyleDescription[] {
    return STYLE_DESCRIPTIONS;
  }

  /**
   * Проверяет, является ли стиль валидным
   * @param style - стиль для проверки
   * @returns true если стиль валидный
   */
  public isValidStyle(style: string): style is ResponseStyle {
    return STYLE_DESCRIPTIONS.some((desc) => desc.key === style);
  }

  /**
   * Получает статистику использования стилей
   * @returns объект со статистикой
   */
  public getStyleStats(): Record<ResponseStyle, number> {
    const stats: Record<ResponseStyle, number> = {
      detailed: 0,
      concise: 0,
      friendly: 0,
      expert: 0,
      medical: 0,
      educational: 0,
      motivational: 0,
      developer: 0,
      humorous: 0,
      calm: 0,
    };

    this.userSettings.forEach((settings) => {
      stats[settings.responseStyle]++;
    });

    return stats;
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
    const settings = this.getUserSettings(userId, username);

    // Обновляем только переданные настройки
    settings.contextSettings = {
      ...settings.contextSettings,
      ...contextSettings,
    };

    settings.updatedAt = new Date().toISOString();

    // Обновляем username если передан
    if (username) {
      settings.username = username;
    }

    this.userSettings.set(userId, settings);
    this.saveSettings();

    logger.logUserActivity(userId, username, "context_settings_changed", {
      newSettings: contextSettings,
    });

    return settings;
  }

  /**
   * Получает общее количество пользователей
   * @returns количество пользователей
   */
  public getUsersCount(): number {
    return this.userSettings.size;
  }
}

// Экспортируем singleton экземпляр
export const userSettingsService = UserSettingsService.getInstance();
