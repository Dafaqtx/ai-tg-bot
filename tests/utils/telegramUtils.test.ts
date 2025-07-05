import {
  hasMarkdownIssues,
  escapeMarkdown,
  splitLongMessage,
} from "../../src/utils/telegramUtils";

describe("TelegramUtils", () => {
  describe("hasMarkdownIssues", () => {
    it("должен обнаруживать несбалансированные звездочки", () => {
      expect(hasMarkdownIssues("Это *несбалансированный текст")).toBe(true);
      expect(hasMarkdownIssues("Это *правильный* текст")).toBe(false);
    });

    it("должен обнаруживать несбалансированные подчеркивания", () => {
      expect(hasMarkdownIssues("Это _несбалансированный текст")).toBe(true);
      expect(hasMarkdownIssues("Это _правильный_ текст")).toBe(false);
    });

    it("должен обнаруживать незакрытые обратные кавычки", () => {
      expect(hasMarkdownIssues("Код `незакрытый")).toBe(true);
      expect(hasMarkdownIssues("Код `закрытый`")).toBe(false);
    });

    it("должен обнаруживать незакрытые скобки", () => {
      expect(hasMarkdownIssues("Ссылка [незакрытая")).toBe(true);
      expect(hasMarkdownIssues("Ссылка (незакрытая")).toBe(true);
      expect(hasMarkdownIssues("Ссылка [закрытая](url)")).toBe(false);
    });

    it("должен возвращать false для обычного текста", () => {
      expect(hasMarkdownIssues("Обычный текст без форматирования")).toBe(false);
      expect(hasMarkdownIssues("Текст с эмоджи 🚀 и числами 123")).toBe(false);
    });
  });

  describe("escapeMarkdown", () => {
    it("должен экранировать звездочки", () => {
      expect(escapeMarkdown("Текст с * звездочкой")).toBe(
        "Текст с \\* звездочкой"
      );
    });

    it("должен экранировать подчеркивания", () => {
      expect(escapeMarkdown("Текст с _ подчеркиванием")).toBe(
        "Текст с \\_ подчеркиванием"
      );
    });

    it("должен экранировать обратные кавычки", () => {
      expect(escapeMarkdown("Код с ` кавычкой")).toBe("Код с \\` кавычкой");
    });

    it("должен экранировать квадратные скобки", () => {
      expect(escapeMarkdown("[Текст] в скобках")).toBe("\\[Текст\\] в скобках");
    });

    it("должен экранировать круглые скобки", () => {
      expect(escapeMarkdown("(Текст) в скобках")).toBe("\\(Текст\\) в скобках");
    });

    it("должен экранировать несколько символов одновременно", () => {
      const input = "Текст с *жирным*, _курсивом_ и `кодом`";
      const expected = "Текст с \\*жирным\\*, \\_курсивом\\_ и \\`кодом\\`";
      expect(escapeMarkdown(input)).toBe(expected);
    });

    it("не должен изменять обычный текст без спецсимволов", () => {
      const text = "Обычный текст";
      expect(escapeMarkdown(text)).toBe(text);
    });

    it("должен обрабатывать текст с эмоджи", () => {
      const text = "Текст с эмоджи 🚀";
      expect(escapeMarkdown(text)).toBe(text);
    });

    it("должен обрабатывать пустую строку", () => {
      expect(escapeMarkdown("")).toBe("");
    });
  });

  describe("splitLongMessage", () => {
    it("должен возвращать одну часть для короткого сообщения", () => {
      const shortMessage = "Короткое сообщение";
      const result = splitLongMessage(shortMessage, 100);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(shortMessage);
    });

    it("должен разделять длинное сообщение на части", () => {
      const longMessage = "a".repeat(5000); // Создаем длинное сообщение
      const result = splitLongMessage(longMessage, 1000);
      expect(result.length).toBeGreaterThan(1);

      // Проверяем, что каждая часть не превышает лимит
      result.forEach((part) => {
        expect(part.length).toBeLessThanOrEqual(1000);
      });

      // Проверяем, что все части вместе дают исходное сообщение
      const combined = result.join("");
      expect(combined).toBe(longMessage);
    });

    it("должен разделять по абзацам когда возможно", () => {
      const message = "Первый абзац.\n\nВторой абзац.\n\nТретий абзац.";
      const result = splitLongMessage(message, 20);

      // Должен разделиться по двойным переносам строк
      expect(result.length).toBeGreaterThan(1);
      expect(result[0]).toContain("Первый абзац.");
    });

    it("должен разделять по предложениям когда нет абзацев", () => {
      const message =
        "Первое предложение. Второе предложение. Третье предложение.";
      const result = splitLongMessage(message, 25);

      expect(result.length).toBeGreaterThan(1);
      expect(result[0]).toContain("Первое предложение.");
    });

    it("должен разделять по пробелам в крайнем случае", () => {
      const message = "слово1 слово2 слово3 слово4 слово5 слово6";
      const result = splitLongMessage(message, 15);

      expect(result.length).toBeGreaterThan(1);
      // Не должен разрезать посередине слов
      result.forEach((part) => {
        if (part.trim().includes(" ")) {
          expect(part.trim()).not.toMatch(/^\S*$/); // Не должно быть обрезанных слов
        }
      });
    });

    it("должен обрабатывать пустую строку", () => {
      const result = splitLongMessage("", 100);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe("");
    });

    it("должен использовать значение по умолчанию для maxLength", () => {
      const shortMessage = "Тест";
      const result = splitLongMessage(shortMessage);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(shortMessage);
    });
  });
});
