import { GeminiService } from "../../src/services/geminiService";

// Создаем мок-функции для методов Gemini API
const mockGenerateContent = jest.fn();
const mockUploadFile = jest.fn();

// Мокируем библиотеку @google/genai
// Это позволяет нам тестировать наш сервис без реальных вызовов к API Gemini
jest.mock("@google/genai", () => {
  return {
    // Мокируем конструктор GoogleGenAI, чтобы он возвращал объект с нашими мок-функциями
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
      files: {
        upload: mockUploadFile,
      },
    })),
    // Мокируем и другие функции, которые могут быть использованы
    createUserContent: jest.fn(),
    createPartFromUri: jest.fn(),
  };
});

describe("Сервис Gemini", () => {
  let geminiService: GeminiService;

  // beforeEach выполняется перед каждым тестом в этом блоке
  beforeEach(() => {
    // Создаем новый экземпляр сервиса перед каждым тестом
    geminiService = new GeminiService("test-api-key");
    // Очищаем историю вызовов мок-функций
    mockGenerateContent.mockClear();
    mockUploadFile.mockClear();
  });

  describe("generateTextResponse", () => {
    it("должен возвращать текстовый ответ от Gemini", async () => {
      // Задаем, какое значение должна вернуть мок-функция при вызове
      mockGenerateContent.mockResolvedValue({ text: "Тестовый ответ" });
      const response = await geminiService.generateTextResponse(
        "Тестовый промпт"
      );
      // Проверяем, что ответ соответствует ожидаемому
      expect(response).toBe("Тестовый ответ");
      // Проверяем, что функция generateContent была вызвана с какими-либо аргументами
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe("uploadFile", () => {
    it("должен загружать файл и возвращать URI и MIME-тип", async () => {
      mockUploadFile.mockResolvedValue({
        uri: "test-uri",
        mimeType: "test-mime",
      });
      const result = await geminiService.uploadFile("test-path", "test-mime");
      // toEqual используется для сравнения объектов
      expect(result).toEqual({ uri: "test-uri", mimeType: "test-mime" });
      // Проверяем, что функция upload была вызвана с правильными аргументами
      expect(mockUploadFile).toHaveBeenCalledWith({
        file: "test-path",
        config: { mimeType: "test-mime" },
      });
    });
  });

  describe("generateMediaResponse", () => {
    it("должен возвращать ответ для медиафайла от Gemini", async () => {
      mockGenerateContent.mockResolvedValue({ text: "Ответ для медиа" });
      const response = await geminiService.generateMediaResponse(
        "test-uri",
        "test-mime",
        "Тестовый промпт"
      );
      expect(response).toBe("Ответ для медиа");
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.any(Object));
    });
  });
});
