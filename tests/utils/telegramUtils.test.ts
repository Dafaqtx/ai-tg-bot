import {
  hasMarkdownIssues,
  escapeMarkdown,
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
});
