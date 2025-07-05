import winston from "winston";

import DailyRotateFile from "winston-daily-rotate-file";

import path from "path";

/**
 * Конфигурация уровней логирования
 * error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
 */
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

/**
 * Цвета для консольного вывода
 */
const logColors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  verbose: "grey",
  debug: "white",
  silly: "rainbow",
};

/**
 * Сервис для логирования с использованием Winston
 * Поддерживает запись в файлы с ротацией и вывод в консоль
 */
export class LoggerService {
  private logger: winston.Logger;
  private static instance: LoggerService;

  constructor() {
    // Создаем директорию для логов если её нет
    const logsDir = path.join(process.cwd(), "logs");

    // Настраиваем уровни и цвета
    winston.addColors(logColors);

    // Создаем logger с транспортами
    this.logger = winston.createLogger({
      level: this.getLogLevel(),
      levels: logLevels,
      format: winston.format.combine(
        winston.format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: "ai-tg-bot" },
      transports: [
        // Транспорт для ошибок - отдельный файл
        new DailyRotateFile({
          filename: path.join(logsDir, "error-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          level: "error",
          maxSize: "20m",
          maxFiles: "14d",
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),

        // Транспорт для всех логов
        new DailyRotateFile({
          filename: path.join(logsDir, "combined-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          maxSize: "20m",
          maxFiles: "14d",
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),

        // Консольный транспорт для разработки
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.timestamp({
              format: "YYYY-MM-DD HH:mm:ss",
            }),
            winston.format.printf(
              (info) => `${info.timestamp} [${info.level}]: ${info.message}`
            )
          ),
        }),
      ],
    });

    // Обработка исключений и отклонений промисов
    this.logger.exceptions.handle(
      new DailyRotateFile({
        filename: path.join(logsDir, "exceptions-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "14d",
      })
    );

    this.logger.rejections.handle(
      new DailyRotateFile({
        filename: path.join(logsDir, "rejections-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "14d",
      })
    );
  }

  /**
   * Получает экземпляр логгера (Singleton)
   */
  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Определяет уровень логирования в зависимости от окружения
   */
  private getLogLevel(): string {
    const env = process.env.NODE_ENV || "development";

    switch (env) {
      case "production":
        return "info";
      case "development":
        return "debug";
      case "test":
        return "warn";
      default:
        return "debug";
    }
  }

  /**
   * Логирование ошибок
   */
  public error(message: string, error?: Error | unknown): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    } else if (error) {
      this.logger.error(message, { error: String(error) });
    } else {
      this.logger.error(message);
    }
  }

  /**
   * Логирование предупреждений
   */
  public warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  /**
   * Логирование информационных сообщений
   */
  public info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  /**
   * Логирование HTTP запросов
   */
  public http(message: string, meta?: Record<string, unknown>): void {
    this.logger.http(message, meta);
  }

  /**
   * Детальное логирование для отладки
   */
  public debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  /**
   * Логирование активности пользователей
   */
  public logUserActivity(
    userId: number,
    username: string | undefined,
    action: string,
    details?: Record<string, unknown>
  ): void {
    this.info(
      `Пользователь ${
        username || "неизвестен"
      } (ID: ${userId}) выполнил действие: ${action}`,
      {
        userId,
        username,
        action,
        ...details,
      }
    );
  }

  /**
   * Логирование системных событий
   */
  public logSystemEvent(
    event: string,
    details?: Record<string, unknown>
  ): void {
    this.info(`Системное событие: ${event}`, {
      event,
      ...details,
    });
  }

  /**
   * Логирование API вызовов
   */
  public logApiCall(
    service: string,
    method: string,
    duration?: number,
    success?: boolean,
    error?: Error
  ): void {
    const level = success === false ? "error" : "info";
    const message = `API вызов: ${service}.${method}`;

    const meta: Record<string, unknown> = {
      service,
      method,
      success,
    };

    if (duration !== undefined) {
      meta.duration = `${duration}ms`;
    }

    if (error) {
      meta.error = {
        message: error.message,
        stack: error.stack,
      };
    }

    this.logger.log(level, message, meta);
  }

  /**
   * Получение базового Winston logger для расширенного использования
   */
  public getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

// Экспортируем единственный экземпляр логгера
export const logger = LoggerService.getInstance();
