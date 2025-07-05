import { Context } from "telegraf";

import { logger } from "../services";

/**
 * Безопасная отправка сообщения с поддержкой Markdown
 * Если Markdown не работает, отправляет как обычный текст
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
    // Пытаемся отправить с форматированием
    await ctx.reply(message, options);
  } catch (error) {
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
        await ctx.reply(stripMarkdown(message));
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
