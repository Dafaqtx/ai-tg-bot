import { Context } from "telegraf";

import { logger } from "../services";

// Максимальная длина сообщения в Telegram (оставляем запас)
const MAX_MESSAGE_LENGTH = 4000;

/**
 * Разделяет длинное сообщение на части, сохраняя форматирование
 * @param text - исходный текст
 * @param maxLength - максимальная длина одной части
 * @returns - массив частей сообщения
 */
export function splitLongMessage(
  text: string,
  maxLength: number = MAX_MESSAGE_LENGTH
): string[] {
  // Если сообщение короткое, возвращаем как есть
  if (text.length <= maxLength) {
    return [text];
  }

  const parts: string[] = [];
  let currentText = text;

  while (currentText.length > maxLength) {
    let splitIndex = maxLength;

    // Ищем лучшее место для разделения (по убыванию приоритета):
    // 1. Двойной перенос строки (конец абзаца)
    const paragraphEnd = currentText.lastIndexOf("\n\n", maxLength);
    if (paragraphEnd > maxLength * 0.5) {
      splitIndex = paragraphEnd + 2;
    } else {
      // 2. Одинарный перенос строки
      const lineEnd = currentText.lastIndexOf("\n", maxLength);
      if (lineEnd > maxLength * 0.5) {
        splitIndex = lineEnd + 1;
      } else {
        // 3. Конец предложения
        const sentenceEnd = Math.max(
          currentText.lastIndexOf(". ", maxLength),
          currentText.lastIndexOf("! ", maxLength),
          currentText.lastIndexOf("? ", maxLength)
        );
        if (sentenceEnd > maxLength * 0.5) {
          splitIndex = sentenceEnd + 2;
        } else {
          // 4. Пробел (избегаем разрезания слов)
          const spaceIndex = currentText.lastIndexOf(" ", maxLength);
          if (spaceIndex > maxLength * 0.5) {
            splitIndex = spaceIndex + 1;
          }
          // Если не нашли подходящего места, режем по максимальной длине
        }
      }
    }

    // Добавляем часть и обрезаем текст
    const part = currentText.substring(0, splitIndex).trim();
    if (part) {
      parts.push(part);
    }

    currentText = currentText.substring(splitIndex).trim();
  }

  // Добавляем оставшуюся часть
  if (currentText) {
    parts.push(currentText);
  }

  return parts;
}

/**
 * Безопасная отправка сообщения с поддержкой Markdown и разделения длинных сообщений
 * Если Markdown не работает, отправляет как обычный текст
 * Если сообщение слишком длинное, разделяет на части
 * @param ctx - контекст Telegram
 * @param message - текст сообщения
 * @param options - дополнительные опции
 */
export async function safeReply(
  ctx: Context,
  message: string,
  options?: { parse_mode?: "Markdown" | "HTML" }
): Promise<void> {
  try {
    // Проверяем длину сообщения
    if (message.length > MAX_MESSAGE_LENGTH) {
      // Разделяем длинное сообщение на части
      const parts = splitLongMessage(message);

      logger.info(`Сообщение разделено на ${parts.length} частей`, {
        originalLength: message.length,
        partsCount: parts.length,
        firstPartLength: parts[0]?.length,
      });

      // Отправляем каждую часть отдельно
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const partNumber =
          parts.length > 1 ? ` (${i + 1}/${parts.length})` : "";

        try {
          // Добавляем номер части только если частей больше одной
          const partMessage =
            parts.length > 1 && i === 0
              ? `${part}\n\n_Продолжение следует...${partNumber}_`
              : parts.length > 1 && i === parts.length - 1
              ? `_Продолжение${partNumber}_\n\n${part}`
              : parts.length > 1
              ? `_Продолжение${partNumber}_\n\n${part}\n\n_Продолжение следует..._`
              : part;

          await ctx.reply(partMessage, options);

          // Небольшая задержка между частями для лучшего UX
          if (i < parts.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (partError) {
          // Если не удалось отправить часть с форматированием, пробуем без него
          if (
            partError instanceof Error &&
            partError.message.includes("can't parse entities")
          ) {
            logger.warn(
              `Ошибка парсинга Markdown в части ${
                i + 1
              }, отправляем как обычный текст`
            );
            await ctx.reply(stripMarkdown(part));
          } else {
            throw partError;
          }
        }
      }
      return;
    }

    // Пытаемся отправить обычное сообщение с форматированием
    await ctx.reply(message, options);
  } catch (error) {
    // Проверяем, если это ошибка слишком длинного сообщения
    if (
      error instanceof Error &&
      error.message.includes("message is too long")
    ) {
      logger.warn("Сообщение слишком длинное, разделяем на части", {
        messageLength: message.length,
        error: error.message,
      });

      // Рекурсивно вызываем функцию с принудительным разделением
      const parts = splitLongMessage(message, MAX_MESSAGE_LENGTH - 100); // Еще больший запас
      for (const part of parts) {
        await safeReply(ctx, part, options);
      }
      return;
    }

    // Проверяем, если это ошибка парсинга сущностей
    if (
      error instanceof Error &&
      error.message.includes("can't parse entities")
    ) {
      logger.warn("Ошибка парсинга Markdown, отправляем как обычный текст", {
        originalMessage: message.substring(0, 100) + "...",
        error: error.message,
      });

      try {
        // Отправляем как обычный текст без форматирования
        await safeReply(ctx, stripMarkdown(message), undefined);
      } catch (secondError) {
        // Если и это не работает, отправляем простое сообщение об ошибке
        logger.error(
          "Не удалось отправить сообщение даже без форматирования",
          secondError
        );
        await ctx.reply(
          "Извините, произошла ошибка при отправке ответа. Попробуйте еще раз."
        );
      }
    } else {
      // Если это другая ошибка, пробрасываем её дальше
      throw error;
    }
  }
}

/**
 * Удаляет Markdown форматирование из текста
 * @param text - текст с Markdown
 * @returns - текст без форматирования
 */
function stripMarkdown(text: string): string {
  return (
    text
      // Удаляем жирный текст **text** или __text__
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")

      // Удаляем курсив *text* или _text_
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")

      // Удаляем зачеркнутый текст ~~text~~
      .replace(/~~(.*?)~~/g, "$1")

      // Удаляем моноширинный текст `text`
      .replace(/`(.*?)`/g, "$1")

      // Удаляем блоки кода ```text```
      .replace(/```[\s\S]*?```/g, "[код]")

      // Удаляем ссылки [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

      // Удаляем заголовки ### text
      .replace(/^#{1,6}\s+(.*)$/gm, "$1")

      // Удаляем escaped символы
      .replace(/\\(.)/g, "$1")
  );
}

/**
 * Проверяет, содержит ли текст потенциально проблемные символы для Markdown
 * @param text - текст для проверки
 * @returns - true если текст может вызвать проблемы
 */
export function hasMarkdownIssues(text: string): boolean {
  // Простая проверка на несбалансированные символы
  const starCount = (text.match(/\*/g) || []).length;
  const underscoreCount = (text.match(/_/g) || []).length;
  const backtickCount = (text.match(/`/g) || []).length;
  const openSquareCount = (text.match(/\[/g) || []).length;
  const closeSquareCount = (text.match(/\]/g) || []).length;
  const openParenCount = (text.match(/\(/g) || []).length;
  const closeParenCount = (text.match(/\)/g) || []).length;

  // Проверяем на нечетное количество парных символов
  if (
    starCount % 2 !== 0 ||
    underscoreCount % 2 !== 0 ||
    backtickCount % 2 !== 0
  ) {
    return true;
  }

  // Проверяем на несбалансированные скобки
  if (
    openSquareCount !== closeSquareCount ||
    openParenCount !== closeParenCount
  ) {
    return true;
  }

  return false;
}

/**
 * Экранирует специальные символы для безопасного использования в Markdown
 * @param text - исходный текст
 * @returns - экранированный текст
 */
export function escapeMarkdown(text: string): string {
  // Простой способ экранирования без сложных регулярных выражений
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/`/g, "\\`")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/~/g, "\\~")
    .replace(/>/g, "\\>")
    .replace(/#/g, "\\#")
    .replace(/\+/g, "\\+")
    .replace(/-/g, "\\-")
    .replace(/=/g, "\\=")
    .replace(/\|/g, "\\|")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\./g, "\\.")
    .replace(/!/g, "\\!");
}
