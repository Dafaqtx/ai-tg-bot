import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";

import { getBotConfig } from "./config";
import {
  startHandler,
  helpHandler,
  unknownCommandHandler,
  styleHandler,
  stylesHandler,
  setStyleHandler,
  styleCallbackHandler,
  contextHandler,
  clearContextHandler,
  MessageHandlers,
} from "./handlers";
import { GeminiService, logger } from "./services";
import { BotContext } from "./types";
import { HttpServer } from "./server";

/**
 * Основной класс Telegram бота
 */
class TelegramBot {
  private bot: Telegraf<BotContext>;
  private geminiService: GeminiService;
  private messageHandlers: MessageHandlers;
  private httpServer: HttpServer;

  constructor() {
    // Получаем конфигурацию
    const config = getBotConfig();

    // Инициализируем бота
    this.bot = new Telegraf<BotContext>(config.botToken);

    // Инициализируем сервисы
    this.geminiService = new GeminiService(config.geminiApiKey);
    this.messageHandlers = new MessageHandlers(this.geminiService);

    // Инициализируем HTTP сервер для health check
    const port = Number(process.env.PORT) || 3000;
    this.httpServer = new HttpServer(port);

    // Настраиваем обработчики
    this.setupHandlers();
  }

  /**
   * Обертка для безопасного выполнения обработчиков с единой обработкой ошибок
   * Это позволяет избежать дублирования кода try/catch в каждом обработчике
   */
  private withErrorHandling(
    handler: (ctx: BotContext) => Promise<void>
  ): (ctx: BotContext) => Promise<void> {
    return async (ctx: BotContext): Promise<void> => {
      try {
        await handler(ctx);
      } catch (error) {
        logger.error("Ошибка при обработке сообщения", error);
        void ctx.reply(
          "Произошла ошибка при обработке вашего сообщения. Пожалуйста, попробуйте позже."
        );
      }
    };
  }

  /**
   * Настройка всех обработчиков бота
   * Используем современные filter utils вместо устаревших методов
   */
  private setupHandlers(): void {
    // Обработчики команд
    this.bot.start(startHandler);
    this.bot.help(helpHandler);
    this.bot.command("style", styleHandler);
    this.bot.command("styles", stylesHandler);
    this.bot.command("setstyle", setStyleHandler);
    this.bot.command("context", contextHandler);
    this.bot.command("clearcontext", clearContextHandler);

    // Обработчик callback_query для inline-кнопок
    this.bot.on("callback_query", styleCallbackHandler);

    // Обработчик текстовых сообщений (исключая команды)
    this.bot.on(
      message("text"),
      this.withErrorHandling(async (ctx: BotContext) => {
        // Проверяем, что это не команда
        if (ctx.message && "text" in ctx.message && ctx.message.text) {
          if (ctx.message.text.startsWith("/")) {
            unknownCommandHandler(ctx);
            return;
          }
          await this.messageHandlers.handleTextMessage(ctx);
        }
      })
    );

    // Обработчик изображений - используем message("photo") вместо bot.on("photo")
    this.bot.on(
      message("photo"),
      this.withErrorHandling(async (ctx: BotContext) => {
        await this.messageHandlers.handleImageMessage(ctx);
      })
    );

    // Обработчик голосовых сообщений - используем message("voice")
    this.bot.on(
      message("voice"),
      this.withErrorHandling(async (ctx: BotContext) => {
        await this.messageHandlers.handleAudioMessage(ctx);
      })
    );

    // Обработчик аудиофайлов - используем message("audio")
    this.bot.on(
      message("audio"),
      this.withErrorHandling(async (ctx: BotContext) => {
        await this.messageHandlers.handleAudioMessage(ctx);
      })
    );

    // Обработчик неподдерживаемых типов сообщений
    // Этот обработчик сработает только если сообщение не попало в предыдущие
    this.bot.on(
      "message",
      this.withErrorHandling(async (ctx: BotContext) => {
        await this.messageHandlers.handleUnsupportedMessage(ctx);
      })
    );

    // Обработка глобальных ошибок Telegraf
    this.bot.catch((err: unknown, ctx: BotContext) => {
      logger.error("Ошибка Telegraf", err);
      void ctx.reply(
        "Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже."
      );
    });
  }

  /**
   * Запуск бота
   */
  async start(): Promise<void> {
    try {
      // Запускаем HTTP сервер для health check
      await this.httpServer.start();

      logger.info("Бот успешно запущен! 🚀");
      logger.info("Нажмите Ctrl+C для остановки");
      logger.logSystemEvent("bot_started");
      await this.bot.launch();
    } catch (error) {
      logger.error("Ошибка при запуске бота", error);
      process.exit(1);
    }
  }

  /**
   * Остановка бота
   */
  async stop(reason?: string): Promise<void> {
    logger.info(`Остановка бота. Причина: ${reason || "не указана"}`);
    logger.logSystemEvent("bot_stopped", { reason });

    // Останавливаем HTTP сервер
    await this.httpServer.stop();

    // Останавливаем бота
    this.bot.stop(reason);
  }
}

// Создаем и запускаем бота
const telegramBot = new TelegramBot();

// Запуск бота
telegramBot.start();

// Корректное завершение работы при получении сигналов остановки
process.once("SIGINT", (): void => {
  void telegramBot.stop("SIGINT");
});
process.once("SIGTERM", (): void => {
  void telegramBot.stop("SIGTERM");
});
