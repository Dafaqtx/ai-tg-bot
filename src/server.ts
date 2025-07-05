import { createServer, IncomingMessage, ServerResponse } from "http";
import { logger } from "./services";

/**
 * Простой HTTP сервер для health check и webhook
 * Нужен для Render hosting
 */
export class HttpServer {
  private server: ReturnType<typeof createServer>;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.server = createServer(this.handleRequest.bind(this));
  }

  /**
   * Обработчик HTTP запросов
   */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url || "";
    const method = req.method || "GET";

    logger.info(`HTTP ${method} ${url}`);

    // Health check endpoint для Render
    if (url === "/health" && method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
          service: "ai-tg-bot",
        })
      );
      return;
    }

    // Webhook endpoint (если понадобится в будущем)
    if (url === "/webhook" && method === "POST") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ received: true }));
      return;
    }

    // Корневой endpoint
    if (url === "/" && method === "GET") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("AI Telegram Bot is running! 🤖");
      return;
    }

    // 404 для всех остальных запросов
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }

  /**
   * Запуск HTTP сервера
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (err?: Error) => {
        if (err) {
          logger.error("Ошибка запуска HTTP сервера", err);
          reject(err);
        } else {
          logger.info(`HTTP сервер запущен на порту ${this.port}`);
          resolve();
        }
      });
    });
  }

  /**
   * Остановка HTTP сервера
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        logger.info("HTTP сервер остановлен");
        resolve();
      });
    });
  }
}
