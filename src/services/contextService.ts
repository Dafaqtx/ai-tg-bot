import { v4 as uuidv4 } from "uuid";

import { ContextMessage, MessageType, ContextSettings } from "../types";

import { logger } from "./loggerService";
import { DatabaseService } from "./databaseService";

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
 * Использует SQLite базу данных для хранения истории сообщений
 */
export class ContextService {
  private static instance: ContextService;
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
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
    try {
      const insertStmt = this.db.prepare(`
        INSERT INTO user_contexts (
          id, 
          user_id, 
          role, 
          content, 
          message_type, 
          token_count,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        message.id,
        userId,
        message.role,
        message.content,
        message.messageType,
        message.tokenCount,
        message.timestamp
      );

      logger.debug("Сообщение добавлено в контекст", {
        userId,
        role: message.role,
        messageType: message.messageType,
        contentLength: message.content.length,
        tokenCount: message.tokenCount,
      });
    } catch (error) {
      logger.error("Ошибка при добавлении сообщения в контекст", {
        userId,
        message,
        error,
      });
      throw error;
    }
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

    try {
      // Получаем последние сообщения пользователя
      const selectStmt = this.db.prepare(`
        SELECT 
          id, 
          role, 
          content, 
          message_type, 
          token_count, 
          created_at
        FROM user_contexts 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);

      const rows = selectStmt.all(userId, contextSettings.maxMessages);

      // Преобразуем данные из базы в объекты сообщений
      let messages: ContextMessage[] = rows.map((row: any) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        messageType: row.message_type,
        tokenCount: row.token_count,
        timestamp: row.created_at,
      }));

      // Возвращаем в правильном порядке (от старых к новым)
      messages = messages.reverse();

      // Проверяем ограничение по токенам
      if (contextSettings.maxTokens > 0) {
        let totalTokens = 0;
        const tokenLimitedMessages: ContextMessage[] = [];

        // Идем с конца, чтобы сохранить самые свежие сообщения
        for (let i = messages.length - 1; i >= 0; i--) {
          const message = messages[i];
          const messageTokens =
            message.tokenCount || this.estimateTokens(message.content);
          if (totalTokens + messageTokens <= contextSettings.maxTokens) {
            totalTokens += messageTokens;
            tokenLimitedMessages.unshift(message);
          } else {
            break;
          }
        }

        messages = tokenLimitedMessages;
      }

      return messages;
    } catch (error) {
      logger.error("Ошибка при получении контекста пользователя", {
        userId,
        contextSettings,
        error,
      });
      return [];
    }
  }

  /**
   * Очищает контекст пользователя
   * @param userId - ID пользователя
   * @returns количество удаленных сообщений
   */
  public clearUserContext(userId: number): number {
    try {
      const deleteStmt = this.db.prepare(`
        DELETE FROM user_contexts WHERE user_id = ?
      `);

      const result = deleteStmt.run(userId);
      const deletedCount = result.changes;

      logger.logUserActivity(userId, undefined, "context_cleared", {
        deletedMessages: deletedCount,
      });

      return deletedCount;
    } catch (error) {
      logger.error("Ошибка при очистке контекста пользователя", {
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Автоматическая очистка контекста при превышении лимитов
   */
  public autoCleanupContext(
    userId: number,
    contextSettings: ContextSettings
  ): void {
    if (!contextSettings.autoCleanup) {
      return;
    }

    try {
      // Удаляем старые сообщения, превышающие лимит по количеству
      const deleteOldStmt = this.db.prepare(`
        DELETE FROM user_contexts 
        WHERE user_id = ? 
        AND id NOT IN (
          SELECT id FROM user_contexts 
          WHERE user_id = ? 
          ORDER BY created_at DESC 
          LIMIT ?
        )
      `);

      const deletedByCount = deleteOldStmt.run(
        userId,
        userId,
        contextSettings.maxMessages
      ).changes;

      if (deletedByCount > 0) {
        logger.debug("Автоочистка контекста по количеству сообщений", {
          userId,
          deletedMessages: deletedByCount,
          maxMessages: contextSettings.maxMessages,
        });
      }
    } catch (error) {
      logger.error("Ошибка при автоочистке контекста", {
        userId,
        contextSettings,
        error,
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
    try {
      const statsStmt = this.db.prepare(`
        SELECT 
          COUNT(*) as message_count,
          SUM(token_count) as total_tokens,
          MIN(created_at) as oldest_message,
          MAX(created_at) as newest_message
        FROM user_contexts 
        WHERE user_id = ?
      `);

      const result = statsStmt.get(userId);

      return {
        messageCount: result.message_count || 0,
        estimatedTokens: result.total_tokens || 0,
        oldestMessage: result.oldest_message,
        newestMessage: result.newest_message,
      };
    } catch (error) {
      logger.error("Ошибка при получении статистики контекста", {
        userId,
        error,
      });
      return {
        messageCount: 0,
        estimatedTokens: 0,
      };
    }
  }

  /**
   * Форматирует контекст для использования в промте
   */
  public formatContextForPrompt(
    userId: number,
    contextSettings: ContextSettings
  ): string {
    const messages = this.getUserContext(userId, contextSettings);

    if (messages.length === 0) {
      return "";
    }

    const formattedMessages = messages.map((message) => {
      const role = message.role === "user" ? "Пользователь" : "Ассистент";
      return `${role}: ${message.content}`;
    });

    return `\n\nПредыдущие сообщения:\n${formattedMessages.join("\n")}\n`;
  }

  /**
   * Получает глобальную статистику контекстов
   */
  public getGlobalStats(): {
    totalUsers: number;
    totalMessages: number;
    averageMessagesPerUser: number;
  } {
    try {
      const statsStmt = this.db.prepare(`
        SELECT 
          COUNT(DISTINCT user_id) as total_users,
          COUNT(*) as total_messages,
          CAST(COUNT(*) AS FLOAT) / COUNT(DISTINCT user_id) as avg_messages_per_user
        FROM user_contexts
      `);

      const result = statsStmt.get();

      return {
        totalUsers: result.total_users || 0,
        totalMessages: result.total_messages || 0,
        averageMessagesPerUser: Math.round(result.avg_messages_per_user || 0),
      };
    } catch (error) {
      logger.error("Ошибка при получении глобальной статистики", error);
      return {
        totalUsers: 0,
        totalMessages: 0,
        averageMessagesPerUser: 0,
      };
    }
  }
}
