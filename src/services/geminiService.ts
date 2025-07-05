import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
  Models,
} from "@google/genai";

import { promptConfig } from "../config";

/**
 * Сервис для работы с Gemini API
 */
export class GeminiService {
  private genAI: GoogleGenAI;
  private model: Models;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenAI({ apiKey });
    this.model = this.genAI.models;
  }

  /**
   * Генерирует текстовый ответ на основе промта
   * @param prompt - текст запроса пользователя
   * @returns Promise<string> - ответ от Gemini
   */
  async generateTextResponse(prompt: string): Promise<string> {
    try {
      // Объединяем базовый промт с запросом пользователя
      const fullPrompt = `${promptConfig.basePrompt}\n\nЗапрос пользователя: ${prompt}`;

      const result = await this.model.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
      });

      return result.text || "Извините, не удалось сгенерировать ответ.";
    } catch (error) {
      console.error("Ошибка при генерации текстового ответа:", error);
      return this.handleError(error);
    }
  }

  /**
   * Загружает файл в Gemini API
   * @param filePath - путь к файлу
   * @param mimeType - MIME тип файла
   * @returns Promise<{uri: string, mimeType: string}> - информация о загруженном файле
   */
  async uploadFile(
    filePath: string,
    mimeType: string
  ): Promise<{ uri: string; mimeType: string }> {
    try {
      const myfile = await this.genAI.files.upload({
        file: filePath,
        config: { mimeType },
      });

      if (!myfile.uri || !myfile.mimeType) {
        throw new Error("Не удалось загрузить файл в Gemini API");
      }

      return {
        uri: myfile.uri,
        mimeType: myfile.mimeType,
      };
    } catch (error) {
      console.error("Ошибка при загрузке файла в Gemini API:", error);
      throw error;
    }
  }

  /**
   * Генерирует ответ на основе медиафайла и промта
   * @param fileUri - URI загруженного файла
   * @param fileMimeType - MIME тип файла
   * @param prompt - промт для анализа
   * @returns Promise<string> - ответ от Gemini
   */
  async generateMediaResponse(
    fileUri: string,
    fileMimeType: string,
    prompt: string
  ): Promise<string> {
    try {
      const result = await this.model.generateContent({
        model: "gemini-2.5-flash",
        contents: createUserContent([
          createPartFromUri(fileUri, fileMimeType),
          prompt,
        ]),
      });

      const responseText = result.text;

      if (!responseText) {
        return "Извините, не удалось обработать медиафайл. Попробуйте еще раз.";
      }

      return responseText;
    } catch (error) {
      console.error("Ошибка при генерации ответа на медиафайл:", error);
      return this.handleError(error);
    }
  }

  /**
   * Обрабатывает ошибки API и возвращает понятное сообщение
   * @param error - объект ошибки
   * @returns строка с описанием ошибки
   */
  private handleError(error: unknown): string {
    if (error instanceof Error) {
      // Обработка специфических ошибок Gemini API
      if (error.message.includes("User location is not supported")) {
        return "😔 К сожалению, Gemini API недоступен в вашем регионе. Попробуйте использовать VPN.";
      } else if (error.message.includes("quota")) {
        return "⚠️ Превышена квота API. Попробуйте позже.";
      } else if (error.message.includes("file size")) {
        return "📁 Файл слишком большой. Попробуйте отправить файл меньшего размера.";
      } else if (error.message.includes("unsupported")) {
        return "🚫 Неподдерживаемый формат файла.";
      }
    }

    return "Извините, произошла ошибка при обработке вашего запроса. Попробуйте еще раз.";
  }
}
