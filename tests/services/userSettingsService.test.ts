import fs from "fs";

import { ResponseStyle } from "../../src/types";
import {
  UserSettingsService,
  STYLE_DESCRIPTIONS,
} from "../../src/services/userSettingsService";

// Мокаем файловую систему для тестов
jest.mock("fs");
const mockFs = fs as jest.Mocked<typeof fs>;

// Мокаем логгер
jest.mock("../../src/services/loggerService", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    logUserActivity: jest.fn(),
  },
}));

describe("UserSettingsService", () => {
  let userSettingsService: UserSettingsService;
  let originalCwd: string;

  beforeEach(() => {
    // Сохраняем оригинальный cwd
    originalCwd = process.cwd();

    // Очищаем моки
    jest.clearAllMocks();

    // Настраиваем моки файловой системы
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue("[]");
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.mkdirSync.mockImplementation(() => "");

    // Создаем новый экземпляр сервиса
    userSettingsService = new (UserSettingsService as any)();
  });

  afterEach(() => {
    // Восстанавливаем оригинальный cwd
    Object.defineProperty(process, "cwd", {
      value: () => originalCwd,
    });
  });

  describe("Singleton pattern", () => {
    it("должен возвращать один и тот же экземпляр", () => {
      const instance1 = UserSettingsService.getInstance();
      const instance2 = UserSettingsService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("getUserSettings", () => {
    it("должен создавать настройки по умолчанию для нового пользователя", () => {
      const userId = 12345;
      const username = "testuser";

      const settings = userSettingsService.getUserSettings(userId, username);

      expect(settings).toMatchObject({
        userId,
        username,
        responseStyle: "friendly",
      });
      expect(settings.createdAt).toBeDefined();
      expect(settings.updatedAt).toBeDefined();
    });

    it("должен возвращать существующие настройки", () => {
      const userId = 12345;
      const username = "testuser";

      // Создаем пользователя
      const settings1 = userSettingsService.getUserSettings(userId, username);

      // Получаем его снова
      const settings2 = userSettingsService.getUserSettings(userId, username);

      expect(settings1).toBe(settings2);
    });
  });

  describe("updateUserStyle", () => {
    it("должен обновлять стиль пользователя", () => {
      const userId = 12345;
      const username = "testuser";
      const newStyle: ResponseStyle = "expert";

      // Создаем пользователя
      const initialSettings = userSettingsService.getUserSettings(
        userId,
        username
      );
      expect(initialSettings.responseStyle).toBe("friendly");

      // Обновляем стиль
      const updatedSettings = userSettingsService.updateUserStyle(
        userId,
        newStyle,
        username
      );

      expect(updatedSettings.responseStyle).toBe(newStyle);
      expect(updatedSettings).toBe(initialSettings); // тот же объект, изменен
      expect(updatedSettings.updatedAt).toBeDefined();
    });

    it("должен обновлять username если передан", () => {
      const userId = 12345;
      const oldUsername = "olduser";
      const newUsername = "newuser";

      // Создаем пользователя
      userSettingsService.getUserSettings(userId, oldUsername);

      // Обновляем стиль с новым username
      const updatedSettings = userSettingsService.updateUserStyle(
        userId,
        "detailed",
        newUsername
      );

      expect(updatedSettings.username).toBe(newUsername);
    });

    it("должен работать с новыми стилями", () => {
      const userId = 67890;
      const username = "developer";

      // Тестируем новые стили
      const styles: ResponseStyle[] = [
        "educational",
        "motivational",
        "developer",
        "humorous",
        "calm",
      ];

      styles.forEach((style) => {
        const settings = userSettingsService.updateUserStyle(
          userId,
          style,
          username
        );
        expect(settings.responseStyle).toBe(style);
      });
    });
  });

  describe("Style descriptions", () => {
    it("должен возвращать описание стиля", () => {
      const description = userSettingsService.getStyleDescription("friendly");

      expect(description).toMatchObject({
        key: "friendly",
        name: "Дружелюбный",
        emoji: "😊",
      });
    });

    it("должен возвращать undefined для несуществующего стиля", () => {
      const description = userSettingsService.getStyleDescription(
        "nonexistent" as ResponseStyle
      );

      expect(description).toBeUndefined();
    });

    it("должен возвращать все доступные стили", () => {
      const styles = userSettingsService.getAllStyles();

      expect(styles).toEqual(STYLE_DESCRIPTIONS);
      expect(styles).toHaveLength(10); // Обновлено для 10 стилей
    });
  });

  describe("Style validation", () => {
    it("должен валидировать правильные стили", () => {
      // Оригинальные стили
      expect(userSettingsService.isValidStyle("friendly")).toBe(true);
      expect(userSettingsService.isValidStyle("expert")).toBe(true);
      expect(userSettingsService.isValidStyle("detailed")).toBe(true);
      expect(userSettingsService.isValidStyle("concise")).toBe(true);
      expect(userSettingsService.isValidStyle("medical")).toBe(true);

      // Новые стили
      expect(userSettingsService.isValidStyle("educational")).toBe(true);
      expect(userSettingsService.isValidStyle("motivational")).toBe(true);
      expect(userSettingsService.isValidStyle("developer")).toBe(true);
      expect(userSettingsService.isValidStyle("humorous")).toBe(true);
      expect(userSettingsService.isValidStyle("calm")).toBe(true);
    });

    it("должен отклонять неправильные стили", () => {
      expect(userSettingsService.isValidStyle("invalid")).toBe(false);
      expect(userSettingsService.isValidStyle("")).toBe(false);
      expect(userSettingsService.isValidStyle("FRIENDLY")).toBe(false);
    });
  });

  describe("Statistics", () => {
    beforeEach(() => {
      // Создаем несколько пользователей с разными стилями
      userSettingsService.updateUserStyle(1, "friendly");
      userSettingsService.updateUserStyle(2, "friendly");
      userSettingsService.updateUserStyle(3, "expert");
      userSettingsService.updateUserStyle(4, "detailed");
    });

    it("должен возвращать статистику использования стилей", () => {
      const stats = userSettingsService.getStyleStats();

      expect(stats).toMatchObject({
        friendly: 2,
        expert: 1,
        detailed: 1,
        concise: 0,
        medical: 0,
        educational: 0,
        motivational: 0,
        developer: 0,
        humorous: 0,
        calm: 0,
      });
    });

    it("должен возвращать количество пользователей", () => {
      const count = userSettingsService.getUsersCount();

      expect(count).toBe(4);
    });
  });

  describe("File operations", () => {
    it("должен создавать директорию data если её нет", () => {
      mockFs.existsSync.mockReturnValue(false);

      // Создаем новый экземпляр
      new (UserSettingsService as any)();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("data"),
        { recursive: true }
      );
    });

    it("должен загружать существующие настройки", () => {
      const mockData = JSON.stringify([
        {
          userId: 123,
          username: "testuser",
          responseStyle: "expert",
          createdAt: "2023-01-01T00:00:00.000Z",
          updatedAt: "2023-01-01T00:00:00.000Z",
        },
      ]);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockData);

      const service = new (UserSettingsService as any)();
      const settings = service.getUserSettings(123);

      expect(settings.responseStyle).toBe("expert");
      expect(settings.username).toBe("testuser");
    });

    it("должен обрабатывать ошибки загрузки файла", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("File read error");
      });

      // Не должно выбрасывать ошибку
      expect(() => {
        new (UserSettingsService as any)();
      }).not.toThrow();
    });

    it("должен сохранять настройки в файл", () => {
      userSettingsService.updateUserStyle(123, "friendly", "testuser");

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("user-settings.json"),
        expect.any(String),
        "utf8"
      );
    });
  });
});
