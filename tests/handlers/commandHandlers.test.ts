import { BotContext } from "../../src/types";
import {
  startHandler,
  helpHandler,
  unknownCommandHandler,
} from "../../src/handlers/commandHandlers";

// Создаем мок (mock) базового контекста бота для тестов
const createMockContext = () => {
  const ctx = {
    // jest.fn() создает мок-функцию, которая позволяет отслеживать вызовы
    reply: jest.fn(),
    from: {
      first_name: "TestUser",
    },
  } as unknown as BotContext;
  return ctx;
};

describe("Обработчики команд", () => {
  describe("startHandler", () => {
    it("должен отвечать приветственным сообщением", () => {
      const ctx = createMockContext();
      startHandler(ctx);
      // Проверяем, что функция reply была вызвана с ожидаемым текстом
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Привет, TestUser!"),
        { parse_mode: "Markdown" }
      );
    });
  });

  describe("helpHandler", () => {
    it("должен отвечать сообщением помощи", () => {
      const ctx = createMockContext();
      helpHandler(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Что умеет этот бот:"),
        { parse_mode: "Markdown" }
      );
    });
  });

  describe("unknownCommandHandler", () => {
    it("должен отвечать сообщением о неизвестной команде", () => {
      const ctx = createMockContext();
      unknownCommandHandler(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        "Я не понимаю эту команду. Используйте /help для получения списка доступных команд."
      );
    });
  });
});
