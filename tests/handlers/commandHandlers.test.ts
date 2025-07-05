import { BotContext } from "../../src/types";
import {
  startHandler,
  helpHandler,
  unknownCommandHandler,
  styleCallbackHandler,
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

  describe("styleCallbackHandler", () => {
    it("должен обрабатывать callback для смены стиля", async () => {
      const ctx = {
        callbackQuery: {
          data: "setstyle_friendly",
        },
        from: {
          id: 123456,
          username: "testuser",
        },
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
        reply: jest.fn(),
      } as unknown as BotContext;

      await styleCallbackHandler(ctx);

      // Проверяем, что callback был обработан
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(
        expect.stringContaining("Стиль изменен на")
      );

      // Проверяем, что сообщение было обновлено
      expect(ctx.editMessageText).toHaveBeenCalled();

      // Проверяем, что отправлено подтверждение
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Стиль ответов изменен!"),
        { parse_mode: "Markdown" }
      );
    });

    it("должен отклонять неизвестные callback", async () => {
      const ctx = {
        callbackQuery: {
          data: "unknown_callback",
        },
        from: {
          id: 123456,
          username: "testuser",
        },
        answerCbQuery: jest.fn(),
      } as unknown as BotContext;

      await styleCallbackHandler(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalledWith("Неизвестная команда.");
    });
  });
});
