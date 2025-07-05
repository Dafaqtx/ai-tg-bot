import { GeminiService } from "../../src/services/geminiService";
import { ImageService } from "../../src/services/imageService";
import * as fileUtils from "../../src/utils/fileUtils";

// Мокируем сервис Gemini, чтобы не делать реальных запросов к API
jest.mock("../../src/services/geminiService");

// Мокируем утилиты для работы с файлами
jest.mock("../../src/utils/fileUtils", () => ({
  // ...jest.requireActual позволяет использовать реальные реализации, если они не переопределены
  ...jest.requireActual("../../src/utils/fileUtils"),
  createTempDir: jest.fn().mockReturnValue("/tmp/images"),
  downloadFile: jest.fn().mockResolvedValue(undefined),
  safeDeleteFile: jest.fn(),
}));

describe("Сервис изображений", () => {
  let imageService: ImageService;
  let mockGeminiService: jest.Mocked<GeminiService>;

  beforeEach(() => {
    // Создаем мок-экземпляр GeminiService
    mockGeminiService = new (GeminiService as any)("test-api-key");
    imageService = new ImageService(mockGeminiService);
  });

  it("должен обработать изображение и вернуть ответ", async () => {
    // Настраиваем моки для возвращения тестовых данных
    mockGeminiService.uploadFile.mockResolvedValue({
      uri: "test-uri",
      mimeType: "image/jpeg",
    });
    mockGeminiService.generateMediaResponse.mockResolvedValue(
      "Анализ изображения"
    );

    const fileInfo = {
      fileId: "test-file-id",
      fileUrl: "http://example.com/image.jpg",
    };

    const result = await imageService.processImageMessage(fileInfo);

    // Проверяем, что все необходимые функции были вызваны
    expect(fileUtils.createTempDir).toHaveBeenCalledWith("tg-bot-images");
    expect(fileUtils.downloadFile).toHaveBeenCalled();
    expect(mockGeminiService.uploadFile).toHaveBeenCalled();
    expect(mockGeminiService.generateMediaResponse).toHaveBeenCalled();
    expect(fileUtils.safeDeleteFile).toHaveBeenCalled();
    // Проверяем результат
    expect(result.success).toBe(true);
    expect(result.message).toContain("Анализ изображения");
  });
});
