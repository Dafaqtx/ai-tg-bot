import {
  getMimeTypeFromExtension,
  getImageMimeType,
  formatDuration,
} from "../../src/utils/fileUtils";

describe("Утилиты для файлов", () => {
  describe("getMimeTypeFromExtension", () => {
    it("должен возвращать правильный MIME-тип для аудиофайлов", () => {
      expect(getMimeTypeFromExtension("audio.mp3")).toBe("audio/mp3");
      expect(getMimeTypeFromExtension("audio.wav")).toBe("audio/wav");
      expect(getMimeTypeFromExtension("audio.ogg")).toBe("audio/ogg");
    });
  });

  describe("getImageMimeType", () => {
    it("должен возвращать правильный MIME-тип для изображений", () => {
      expect(getImageMimeType("image.jpg")).toBe("image/jpeg");
      expect(getImageMimeType("image.png")).toBe("image/png");
      expect(getImageMimeType("image.webp")).toBe("image/webp");
    });
  });

  describe("formatDuration", () => {
    it("должен форматировать длительность в секундах", () => {
      expect(formatDuration(30)).toBe("30 сек");
    });

    it("должен форматировать длительность в минутах и секундах", () => {
      expect(formatDuration(95)).toBe("1:35 мин");
    });
  });
});
