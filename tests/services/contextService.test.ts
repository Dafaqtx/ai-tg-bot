import fs from "fs";
import {
  ContextService,
  DEFAULT_CONTEXT_SETTINGS,
} from "../../src/services/contextService";

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

describe("ContextService", () => {
  let contextService: ContextService;
  let originalCwd: string;

  beforeEach(() => {
    // Сохраняем оригинальный cwd
    originalCwd = process.cwd();

    // Очищаем моки
    jest.clearAllMocks();

    // Настраиваем моки файловой системы
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue("{}");
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.mkdirSync.mockImplementation(() => "");

    // Создаем новый экземпляр сервиса
    contextService = new (ContextService as any)();
  });

  afterEach(() => {
    // Восстанавливаем оригинальный cwd
    Object.defineProperty(process, "cwd", {
      value: () => originalCwd,
    });
  });

  describe("Singleton pattern", () => {
    it("должен возвращать один и тот же экземпляр", () => {
      const instance1 = ContextService.getInstance();
      const instance2 = ContextService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("Добавление сообщений", () => {
    it("должен добавлять сообщение пользователя", () => {
      const userId = 12345;
      const message = "Привет, как дела?";

      contextService.addUserMessage(userId, message, "text");

      const context = contextService.getUserContext(
        userId,
        DEFAULT_CONTEXT_SETTINGS
      );
      expect(context).toHaveLength(1);
      expect(context[0].role).toBe("user");
      expect(context[0].content).toBe(message);
      expect(context[0].messageType).toBe("text");
    });

    it("должен добавлять ответ бота", () => {
      const userId = 12345;
      const response = "Привет! У меня все отлично!";

      contextService.addAssistantMessage(userId, response);

      const context = contextService.getUserContext(
        userId,
        DEFAULT_CONTEXT_SETTINGS
      );
      expect(context).toHaveLength(1);
      expect(context[0].role).toBe("assistant");
      expect(context[0].content).toBe(response);
      expect(context[0].messageType).toBe("text");
    });

    it("должен сохранять порядок сообщений", () => {
      const userId = 12345;

      contextService.addUserMessage(userId, "Первое сообщение", "text");
      contextService.addAssistantMessage(userId, "Первый ответ");
      contextService.addUserMessage(userId, "Второе сообщение", "text");
      contextService.addAssistantMessage(userId, "Второй ответ");

      const context = contextService.getUserContext(
        userId,
        DEFAULT_CONTEXT_SETTINGS
      );
      expect(context).toHaveLength(4);
      expect(context[0].content).toBe("Первое сообщение");
      expect(context[1].content).toBe("Первый ответ");
      expect(context[2].content).toBe("Второе сообщение");
      expect(context[3].content).toBe("Второй ответ");
    });
  });

  describe("Ограничения контекста", () => {
    it("должен ограничивать количество сообщений", () => {
      const userId = 12345;
      const settings = { ...DEFAULT_CONTEXT_SETTINGS, maxMessages: 2 };

      // Добавляем 5 сообщений
      for (let i = 1; i <= 5; i++) {
        contextService.addUserMessage(userId, `Сообщение ${i}`, "text");
      }

      const context = contextService.getUserContext(userId, settings);
      expect(context).toHaveLength(2);
      expect(context[0].content).toBe("Сообщение 4");
      expect(context[1].content).toBe("Сообщение 5");
    });

    it("должен ограничивать количество токенов", () => {
      const userId = 12345;
      const settings = { ...DEFAULT_CONTEXT_SETTINGS, maxTokens: 10 };

      // Добавляем сообщения с известным количеством токенов
      contextService.addUserMessage(userId, "Короткое", "text"); // ~1 токен
      contextService.addUserMessage(
        userId,
        "Более длинное сообщение с большим количеством слов",
        "text"
      ); // ~8 токенов
      contextService.addUserMessage(
        userId,
        "Еще одно очень длинное сообщение",
        "text"
      ); // ~6 токенов

      const context = contextService.getUserContext(userId, settings);
      // Должно вернуть только последние сообщения, помещающиеся в лимит токенов
      expect(context.length).toBeLessThanOrEqual(2);
    });

    it("должен возвращать пустой контекст если отключен", () => {
      const userId = 12345;
      const settings = { ...DEFAULT_CONTEXT_SETTINGS, enabled: false };

      contextService.addUserMessage(userId, "Тестовое сообщение", "text");

      const context = contextService.getUserContext(userId, settings);
      expect(context).toHaveLength(0);
    });
  });

  describe("Очистка контекста", () => {
    it("должен очищать контекст пользователя", () => {
      const userId = 12345;

      contextService.addUserMessage(userId, "Сообщение 1", "text");
      contextService.addUserMessage(userId, "Сообщение 2", "text");

      const clearedCount = contextService.clearUserContext(userId);
      expect(clearedCount).toBe(2);

      const context = contextService.getUserContext(
        userId,
        DEFAULT_CONTEXT_SETTINGS
      );
      expect(context).toHaveLength(0);
    });

    it("должен выполнять автоочистку при превышении лимита", () => {
      const userId = 12345;
      const settings = {
        ...DEFAULT_CONTEXT_SETTINGS,
        maxMessages: 3,
        autoCleanup: true,
      };

      // Добавляем 5 сообщений
      for (let i = 1; i <= 5; i++) {
        contextService.addUserMessage(userId, `Сообщение ${i}`, "text");
        contextService.autoCleanupContext(userId, settings);
      }

      const context = contextService.getUserContext(userId, settings);
      expect(context.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Статистика", () => {
    it("должен возвращать статистику контекста пользователя", () => {
      const userId = 12345;

      contextService.addUserMessage(userId, "Первое сообщение", "text");
      contextService.addAssistantMessage(userId, "Ответ");

      const stats = contextService.getUserContextStats(userId);
      expect(stats.messageCount).toBe(2);
      expect(stats.estimatedTokens).toBeGreaterThan(0);
      expect(stats.oldestMessage).toBeDefined();
      expect(stats.newestMessage).toBeDefined();
    });

    it("должен возвращать глобальную статистику", () => {
      contextService.addUserMessage(12345, "Сообщение пользователя 1", "text");
      contextService.addUserMessage(67890, "Сообщение пользователя 2", "text");

      const stats = contextService.getGlobalStats();
      expect(stats.totalUsers).toBe(2);
      expect(stats.totalMessages).toBe(2);
      expect(stats.averageMessagesPerUser).toBe(1);
    });
  });

  describe("Форматирование контекста", () => {
    it("должен форматировать контекст для промта", () => {
      const userId = 12345;

      contextService.addUserMessage(userId, "Привет", "text");
      contextService.addAssistantMessage(userId, "Привет! Как дела?");
      contextService.addUserMessage(userId, "Хорошо", "voice");

      const formattedContext = contextService.formatContextForPrompt(
        userId,
        DEFAULT_CONTEXT_SETTINGS
      );

      expect(formattedContext).toContain("Пользователь: Привет");
      expect(formattedContext).toContain("Ассистент: Привет! Как дела?");
      expect(formattedContext).toContain("Пользователь [voice]: Хорошо");
    });

    it("должен возвращать пустую строку для пустого контекста", () => {
      const userId = 12345;

      const formattedContext = contextService.formatContextForPrompt(
        userId,
        DEFAULT_CONTEXT_SETTINGS
      );
      expect(formattedContext).toBe("");
    });
  });

  describe("Файловые операции", () => {
    it("должен создавать директорию data если её нет", () => {
      mockFs.existsSync.mockReturnValue(false);

      new (ContextService as any)();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("data"),
        { recursive: true }
      );
    });

    it("должен загружать существующие контексты", () => {
      const mockData = JSON.stringify({
        "123": [
          {
            id: "test-id",
            role: "user",
            content: "Тестовое сообщение",
            messageType: "text",
            timestamp: "2023-01-01T00:00:00.000Z",
            tokenCount: 2,
          },
        ],
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockData);

      const service = new (ContextService as any)();
      const context = service.getUserContext(123, DEFAULT_CONTEXT_SETTINGS);

      expect(context).toHaveLength(1);
      expect(context[0].content).toBe("Тестовое сообщение");
    });

    it("должен сохранять контексты в файл", () => {
      contextService.addUserMessage(123, "Тестовое сообщение", "text");

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("user-contexts.json"),
        expect.any(String),
        "utf8"
      );
    });
  });
});
