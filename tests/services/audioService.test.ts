import { AudioMessageType } from "../../src/types";
import { AudioService } from "../../src/services/audioService";
import { GeminiService } from "../../src/services/geminiService";
import * as fileUtils from "../../src/utils/fileUtils";

// Мокируем сервис Gemini
jest.mock("../../src/services/geminiService");

// Мокируем утилиты для работы с файлами
jest.mock("../../src/utils/fileUtils", () => ({
  ...jest.requireActual("../../src/utils/fileUtils"),
  createTempDir: jest.fn().mockReturnValue("/tmp/audio"),
  downloadFile: jest.fn().mockResolvedValue(undefined),
  safeDeleteFile: jest.fn(),
}));

describe("Сервис аудио", () => {
  let audioService: AudioService;
  let mockGeminiService: jest.Mocked<GeminiService>;

  beforeEach(() => {
    mockGeminiService = new (GeminiService as any)("test-api-key");
    audioService = new AudioService(mockGeminiService);
  });

  it("должен обработать голосовое сообщение и вернуть ответ", async () => {
    mockGeminiService.uploadFile.mockResolvedValue({
      uri: "test-uri",
      mimeType: "audio/ogg",
    });
    mockGeminiService.generateMediaResponse.mockResolvedValue(
      "Анализ голосового сообщения"
    );

    const fileInfo = {
      fileId: "test-file-id",
      fileUrl: "http://example.com/voice.ogg",
      duration: 30,
    };

    const result = await audioService.processAudioMessage(
      fileInfo,
      AudioMessageType.VOICE
    );

    expect(fileUtils.createTempDir).toHaveBeenCalledWith("tg-bot-audio");
    expect(fileUtils.downloadFile).toHaveBeenCalled();
    expect(mockGeminiService.uploadFile).toHaveBeenCalled();
    expect(mockGeminiService.generateMediaResponse).toHaveBeenCalled();
    expect(fileUtils.safeDeleteFile).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.message).toContain("Анализ голосового сообщения");
  });
});
