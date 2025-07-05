import fs from "fs";

import path from "path";

import { v4 as uuidv4 } from "uuid";

import { ContextMessage, MessageType, ContextSettings } from "../types";

import { logger } from "./loggerService";

/**
 * Настройки контекста по умолчанию
 */
export const DEFAULT_CONTEXT_SETTINGS: ContextSettings = {
  maxMessages: 20, // Максимум 20 сообщений в контексте
  maxTokens: 8000, // Максимум ~8000 токенов (примерно)
  enabled: true, // Контекст включен по умолчанию
  autoCleanup: true, // Автоматическая очистка включена
};

/**
 * Сервис для управления контекстом диалогов
 * Сохраняет историю сообщений для каждого пользователя
 */
export class ContextService {
  private static instance: ContextService;
  private contextFile: string;
  private userContexts: Map<number, ContextMessage[]> = new Map();

  constructor() {
    // Создаем путь к файлу контекстов
    this.contextFile = path.join(process.cwd(), "data", "user-contexts.json");
    this.ensureDataDirectory();
    this.loadContexts();
  }

  /**
   * Получает экземпляр сервиса (Singleton)
   */
  public static getInstance(): ContextService {
    if (!ContextService.instance) {
      ContextService.instance = new ContextService();
    }
    return ContextService.instance;
  }

  /**
   * Создает директорию data если её нет
   */
  private ensureDataDirectory(): void {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info("Создана директория для данных контекста", { path: dataDir });
    }
  }

  /**
   * Загружает контексты из файла
   */
  private loadContexts(): void {
    try {
      if (fs.existsSync(this.contextFile)) {
        const data = fs.readFileSync(this.contextFile, "utf8");
        const contexts: Record<string, ContextMessage[]> = JSON.parse(data);

        // Преобразуем объект в Map для быстрого доступа
        this.userContexts.clear();
        Object.entries(contexts).forEach(([userId, messages]) => {
          this.userContexts.set(parseInt(userId), messages);
        });

        logger.info("Контексты пользователей загружены", {
          usersCount: Object.keys(contexts).length,
        });
      } else {
        logger.info("Файл контекстов не найден, создаем новый");
        this.saveContexts();
      }
    } catch (error) {
      logger.error("Ошибка при загрузке контекстов пользователей", error);
      // В случае ошибки инициализируем пустую Map
      this.userContexts.clear();
    }
  }

  /**
   * Сохраняет контексты в файл
   */
  private saveContexts(): void {
    try {
      // Преобразуем Map в объект для сохранения
      const contexts: Record<string, ContextMessage[]> = {};
      this.userContexts.forEach((messages, userId) => {
        contexts[userId.toString()] = messages;
      });

      fs.writeFileSync(
        this.contextFile,
        JSON.stringify(contexts, null, 2),
        "utf8"
      );

      logger.debug("Контексты пользователей сохранены", {
        usersCount: Object.keys(contexts).length,
      });
    } catch (error) {
      logger.error("Ошибка при сохранении контекстов пользователей", error);
    }
  }

  /**
   * Примерная оценка количества токенов в тексте
   * Упрощенная формула: ~0.75 токена на слово для русского языка
   */
  private estimateTokens(text: string): number {
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 0.75);
  }

  /**
   * Добавляет сообщение пользователя в контекст
   */
  public addUserMessage(
    userId: number,
    content: string,
    messageType: MessageType = "text"
  ): void {
    const message: ContextMessage = {
      id: uuidv4(),
      role: "user",
      content,
      messageType,
      timestamp: new Date().toISOString(),
      tokenCount: this.estimateTokens(content),
    };

    this.addMessage(userId, message);
  }

  /**
   * Добавляет ответ бота в контекст
   */
  public addAssistantMessage(userId: number, content: string): void {
    const message: ContextMessage = {
      id: uuidv4(),
      role: "assistant",
      content,
      messageType: "text",
      timestamp: new Date().toISOString(),
      tokenCount: this.estimateTokens(content),
    };

    this.addMessage(userId, message);
  }

  /**
   * Добавляет сообщение в контекст пользователя
   */
  private addMessage(userId: number, message: ContextMessage): void {
    const messages = this.userContexts.get(userId) || [];
    messages.push(message);

    // Сохраняем обновленный контекст
    this.userContexts.set(userId, messages);
    this.saveContexts();

    logger.debug("Сообщение добавлено в контекст", {
      userId,
      role: message.role,
      messageType: message.messageType,
      contentLength: message.content.length,
      tokenCount: message.tokenCount,
    });
  }

  /**
   * Получает контекст пользователя с учетом настроек
   */
  public getUserContext(
    userId: number,
    contextSettings: ContextSettings
  ): ContextMessage[] {
    if (!contextSettings.enabled) {
      return [];
    }

    const messages = this.userContexts.get(userId) || [];

    // Применяем ограничения
    let filteredMessages = messages.slice(-contextSettings.maxMessages);

    // Проверяем ограничение по токенам
    if (contextSettings.maxTokens > 0) {
      let totalTokens = 0;
      const tokenLimitedMessages: ContextMessage[] = [];

      // Идем с конца, чтобы сохранить самые свежие сообщения
      for (let i = filteredMessages.length - 1; i >= 0; i--) {
        const message = filteredMessages[i];
        const messageTokens =
          message.tokenCount || this.estimateTokens(message.content);

        if (totalTokens + messageTokens <= contextSettings.maxTokens) {
          totalTokens += messageTokens;
          tokenLimitedMessages.unshift(message);
        } else {
          break;
        }
      }

      filteredMessages = tokenLimitedMessages;
    }

    return filteredMessages;
  }

  /**
   * Очищает контекст пользователя
   */
  public clearUserContext(userId: number): number {
    const messages = this.userContexts.get(userId) || [];
    const clearedCount = messages.length;

    this.userContexts.set(userId, []);
    this.saveContexts();

    logger.logUserActivity(userId, undefined, "context_cleared", {
      clearedMessages: clearedCount,
    });

    return clearedCount;
  }

  /**
   * Автоматически очищает старые сообщения согласно настройкам
   */
  public autoCleanupContext(
    userId: number,
    contextSettings: ContextSettings
  ): void {
    if (!contextSettings.autoCleanup) {
      return;
    }

    const messages = this.userContexts.get(userId) || [];
    const originalCount = messages.length;

    if (messages.length > contextSettings.maxMessages) {
      // Оставляем только последние сообщения
      const cleanedMessages = messages.slice(-contextSettings.maxMessages);
      this.userContexts.set(userId, cleanedMessages);
      this.saveContexts();

      const removedCount = originalCount - cleanedMessages.length;
      logger.debug("Автоматическая очистка контекста", {
        userId,
        originalCount,
        removedCount,
        remainingCount: cleanedMessages.length,
      });
    }
  }

  /**
   * Получает статистику контекста пользователя
   */
  public getUserContextStats(userId: number): {
    messageCount: number;
    estimatedTokens: number;
    oldestMessage?: string;
    newestMessage?: string;
  } {
    const messages = this.userContexts.get(userId) || [];

    const estimatedTokens = messages.reduce((total, message) => {
      return (
        total + (message.tokenCount || this.estimateTokens(message.content))
      );
    }, 0);

    return {
      messageCount: messages.length,
      estimatedTokens,
      oldestMessage: messages.length > 0 ? messages[0].timestamp : undefined,
      newestMessage:
        messages.length > 0
          ? messages[messages.length - 1].timestamp
          : undefined,
    };
  }

  /**
   * Форматирует контекст для отправки в Gemini API
   */
  public formatContextForPrompt(
    userId: number,
    contextSettings: ContextSettings
  ): string {
    const messages = this.getUserContext(userId, contextSettings);

    if (messages.length === 0) {
      return "";
    }

    const contextLines = messages.map((message) => {
      const role = message.role === "user" ? "Пользователь" : "Ассистент";
      const typeInfo =
        message.messageType !== "text" ? ` [${message.messageType}]` : "";
      return `${role}${typeInfo}: ${message.content}`;
    });

    return `\n\nКонтекст предыдущих сообщений:\n${contextLines.join("\n")}\n`;
  }

  /**
   * Получает общую статистику всех контекстов
   */
  public getGlobalStats(): {
    totalUsers: number;
    totalMessages: number;
    averageMessagesPerUser: number;
  } {
    const totalUsers = this.userContexts.size;
    const totalMessages = Array.from(this.userContexts.values()).reduce(
      (sum, messages) => sum + messages.length,
      0
    );

    const averageMessagesPerUser =
      totalUsers > 0 ? totalMessages / totalUsers : 0;

    return {
      totalUsers,
      totalMessages,
      averageMessagesPerUser: Math.round(averageMessagesPerUser * 100) / 100,
    };
  }
}

// Экспортируем singleton экземпляр
export const contextService = ContextService.getInstance();
