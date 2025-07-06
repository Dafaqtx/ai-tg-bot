import { DatabaseSync } from "node:sqlite";

import path from "path";

import fs from "fs";

import { logger } from "./loggerService";

/**
 * Сервис для работы с SQLite базой данных
 * Использует встроенный модуль node:sqlite (доступен с Node.js 22.5.0+)
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private db!: DatabaseSync;
  private dbPath: string;

  constructor() {
    // Создаем путь к файлу базы данных
    this.dbPath = path.join(process.cwd(), "data", "bot.db");
    this.ensureDataDirectory();
    this.initializeDatabase();
  }

  /**
   * Получает экземпляр сервиса (Singleton)
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Создает директорию data если её нет
   */
  private ensureDataDirectory(): void {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info("Создана директория для базы данных", { path: dataDir });
    }
  }

  /**
   * Инициализирует базу данных и создает таблицы
   */
  private initializeDatabase(): void {
    try {
      // Открываем или создаем базу данных
      this.db = new DatabaseSync(this.dbPath);

      logger.info("База данных SQLite инициализирована", {
        path: this.dbPath,
        isOpen: this.db.isOpen,
      });

      // Создаем таблицы если они не существуют
      this.createTables();
    } catch (error) {
      logger.error("Ошибка при инициализации базы данных", error);
      throw error;
    }
  }

  /**
   * Создает необходимые таблицы в базе данных
   */
  private createTables(): void {
    try {
      // Включаем поддержку внешних ключей
      this.db.exec("PRAGMA foreign_keys = ON;");

      // Таблица для настроек пользователей
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_settings (
          user_id INTEGER PRIMARY KEY,
          username TEXT,
          response_style TEXT NOT NULL DEFAULT 'friendly',
          context_enabled INTEGER NOT NULL DEFAULT 1,
          context_max_messages INTEGER NOT NULL DEFAULT 20,
          context_max_tokens INTEGER NOT NULL DEFAULT 8000,
          context_auto_cleanup INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) STRICT;
      `);

      // Таблица для контекста диалогов
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_contexts (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
          content TEXT NOT NULL,
          message_type TEXT NOT NULL DEFAULT 'text',
          token_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES user_settings(user_id) ON DELETE CASCADE
        ) STRICT;
      `);

      // Создаем индексы для оптимизации запросов
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_user_contexts_user_id 
        ON user_contexts(user_id);
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_user_contexts_created_at 
        ON user_contexts(created_at);
      `);

      // Триггер для автоматического обновления updated_at
      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_user_settings_timestamp 
        AFTER UPDATE ON user_settings
        BEGIN
          UPDATE user_settings 
          SET updated_at = CURRENT_TIMESTAMP 
          WHERE user_id = NEW.user_id;
        END;
      `);

      logger.info("Таблицы базы данных созданы успешно");
    } catch (error) {
      logger.error("Ошибка при создании таблиц", error);
      throw error;
    }
  }

  /**
   * Получает объект базы данных для выполнения запросов
   */
  public getDatabase(): DatabaseSync {
    return this.db;
  }

  /**
   * Выполняет SQL запрос без возвращения результата
   */
  public exec(sql: string): void {
    try {
      this.db.exec(sql);
    } catch (error) {
      logger.error("Ошибка выполнения SQL запроса", { sql, error });
      throw error;
    }
  }

  /**
   * Подготавливает SQL запрос для многократного использования
   */
  public prepare(sql: string) {
    try {
      return this.db.prepare(sql);
    } catch (error) {
      logger.error("Ошибка подготовки SQL запроса", { sql, error });
      throw error;
    }
  }

  /**
   * Закрывает соединение с базой данных
   */
  public close(): void {
    try {
      if (this.db.isOpen) {
        this.db.close();
        logger.info("Соединение с базой данных закрыто");
      }
    } catch (error) {
      logger.error("Ошибка при закрытии базы данных", error);
    }
  }

  /**
   * Проверяет, открыта ли база данных
   */
  public isOpen(): boolean {
    return this.db.isOpen;
  }

  /**
   * Создает резервную копию базы данных
   */
  public async backup(backupPath: string): Promise<void> {
    try {
      // Используем встроенную функцию backup
      const sqlite = await import("node:sqlite");
      sqlite.backup(this.db, backupPath);
      logger.info("Резервная копия базы данных создана", { backupPath });
    } catch (error) {
      logger.error("Ошибка создания резервной копии", { backupPath, error });
      throw error;
    }
  }
}
