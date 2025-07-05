// Импорт необходимых зависимостей
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

import { Telegraf, Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

import * as fs from "fs";

import * as path from "path";

import * as os from "os";

import * as dotenv from "dotenv";

// Загрузка переменных окружения
dotenv.config();

// Определение типа контекста
type BotContext = Context<Update>;

// Проверка наличия токена бота и API-ключа Gemini
if (!process.env.BOT_TOKEN) {
  console.error("Ошибка: BOT_TOKEN не найден в переменных окружения!");
  console.error(
    "Пожалуйста, создайте файл .env и добавьте в него BOT_TOKEN=your_bot_token_here"
  );
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error("Ошибка: GEMINI_API_KEY не найден в переменных окружения!");
  console.error(
    "Пожалуйста, добавьте GEMINI_API_KEY=your_gemini_api_key_here в файл .env"
  );
  process.exit(1);
}

// Инициализация бота с токеном из переменных окружения
const bot = new Telegraf<BotContext>(process.env.BOT_TOKEN);

// Инициализация Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = genAI.models;

// Обработчик команды /start
bot.start((ctx: BotContext) => {
  const userName = ctx.from?.first_name || "пользователь";
  // Используем void для игнорирования возвращаемого значения
  void ctx.reply(
    `Привет, ${userName}! 👋\n\nДобро пожаловать в наш Telegram бот с интеграцией Gemini API.\n\nПросто напишите любой текст, и я отвечу вам с помощью искусственного интеллекта.\n\nИспользуйте команду /help, чтобы узнать больше о функциях бота.`
  );
});

// Обработчик команды /help
bot.help((ctx: BotContext) => {
  // Используем void для игнорирования возвращаемого значения
  void ctx.reply(
    "🤖 **Что умеет этот бот:**\n\n" +
      "📝 **Команды:**\n" +
      "/start - Начать взаимодействие с ботом\n" +
      "/help - Показать список доступных команд\n\n" +
      "💬 **Обработка сообщений:**\n" +
      "• **Текстовые сообщения** - отвечаю с помощью ИИ\n" +
      "• **Голосовые сообщения** - транскрибирую и отвечаю\n" +
      "• **Аудиофайлы** - анализирую содержание (речь, музыка, подкасты)\n\n" +
      "🎵 **Особенности аудио:**\n" +
      "• Короткие голосовые - естественный разговор\n" +
      "• Длинные голосовые - структурированный анализ\n" +
      "• Аудиофайлы - определяю тип и описываю содержание\n" +
      "• Поддерживаю форматы: MP3, WAV, M4A, AAC, OGG, FLAC\n\n" +
      "Просто отправьте сообщение и я обработаю его! 🚀"
  );
});

// Функция для генерации ответа с помощью Gemini API
async function generateResponse(prompt: string): Promise<string> {
  try {
    // Базовый промт для модели
    const basePrompt =
      "Ты - умный ИИ-ассистент в чате-телеграм, отвечай коротко и лаконично, используй эмоджи если это уместно";

    // Объединяем базовый промт с запросом пользователя
    const fullPrompt = `${basePrompt}\n\nЗапрос пользователя: ${prompt}`;

    const result = await model.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });
    return result.text || "Извините, не удалось сгенерировать ответ.";
  } catch (error) {
    console.error("Ошибка при генерации ответа:", error);
    return "Извините, произошла ошибка при обработке вашего запроса.";
  }
}

// Типы аудиосообщений для разных промтов
export enum AudioMessageType {
  VOICE = "voice",
  AUDIO_FILE = "audio_file",
}

// Функция для получения промта в зависимости от типа аудио
function getAudioPrompt(
  messageType: AudioMessageType,
  duration?: number
): string {
  const basePrompt =
    "Ты - умный ИИ-ассистент в чате Telegram, который обрабатывает аудиосообщения.";

  switch (messageType) {
    case AudioMessageType.VOICE:
      if (duration && duration > 60) {
        // Длинное голосовое сообщение
        return `${basePrompt} 
        
ЗАДАЧА: Транскрибируй и проанализируй это голосовое сообщение.

ИНСТРУКЦИИ:
1. Сначала создай точную транскрипцию речи
2. Выдели основные темы и ключевые моменты
3. Если есть вопросы - дай краткие ответы
4. Если есть просьбы - укажи, что можешь помочь
5. Используй эмоджи для лучшего восприятия

ФОРМАТ ОТВЕТА:
📝 **Транскрипция:** [точный текст]
💡 **Основные моменты:** [ключевые темы]
❓ **Ответы на вопросы:** [если есть вопросы]`;
      } else {
        // Короткое голосовое сообщение
        return `${basePrompt}
        
ЗАДАЧА: Обработай это голосовое сообщение естественно и дружелюбно.

ИНСТРУКЦИИ:
1. Транскрибируй речь точно
2. Отвечай как живой собеседник
3. Если есть вопрос - дай полезный ответ
4. Если это просто сообщение - подтверди понимание
5. Используй подходящие эмоджи
6. Будь кратким и по делу

Отвечай естественно, как будто это обычный разговор! 🗣️`;
      }

    case AudioMessageType.AUDIO_FILE:
      return `${basePrompt}
      
ЗАДАЧА: Проанализируй этот аудиофайл (может быть музыка, подкаст, лекция и т.д.).

ИНСТРУКЦИИ:
1. Определи тип контента (речь/музыка/другое)
2. Если это речь - создай транскрипцию
3. Если это музыка - опиши стиль, настроение
4. Выдели основное содержание
5. Дай краткую оценку или комментарий

ФОРМАТ ОТВЕТА:
🎵 **Тип:** [тип аудио]
📄 **Содержание:** [описание/транскрипция]
💭 **Комментарий:** [твои мысли]`;

    default:
      return `${basePrompt} Транскрибируй и кратко опиши содержание этого аудио. Используй эмоджи для лучшего восприятия.`;
  }
}

// Функция для определения типа MIME на основе расширения файла
function getMimeTypeFromExtension(filename: string): string {
  const extension = filename.toLowerCase().split(".").pop();

  switch (extension) {
    case "mp3":
      return "audio/mp3";
    case "wav":
      return "audio/wav";
    case "m4a":
      return "audio/m4a";
    case "aac":
      return "audio/aac";
    case "ogg":
      return "audio/ogg";
    case "flac":
      return "audio/flac";
    default:
      return "audio/ogg"; // По умолчанию для голосовых сообщений Telegram
  }
}

// Улучшенная функция для обработки аудиосообщений с помощью Gemini API
async function processAudioMessage(
  fileUrl: string,
  fileId: string,
  messageType: AudioMessageType,
  duration?: number,
  fileName?: string
): Promise<string> {
  try {
    // Создаем временную директорию для сохранения аудиофайла
    const tempDir = path.join(os.tmpdir(), "tg-bot-audio");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Определяем расширение файла
    const fileExtension =
      messageType === AudioMessageType.VOICE
        ? "ogg"
        : fileName
        ? fileName.split(".").pop() || "mp3"
        : "mp3";

    // Путь для сохранения аудиофайла
    const filePath = path.join(tempDir, `${fileId}.${fileExtension}`);

    console.log(
      `Обработка ${
        messageType === AudioMessageType.VOICE
          ? "голосового сообщения"
          : "аудиофайла"
      }...`
    );

    // Скачиваем файл
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error(`Не удалось скачать файл: ${response.statusText}`);
    }

    const fileBuffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(fileBuffer));

    // Получаем подходящий промт
    const audioPrompt = getAudioPrompt(messageType, duration);

    // Определяем MIME тип
    const mimeType = getMimeTypeFromExtension(filePath);

    console.log(`Загружаем файл в Gemini API (${mimeType})...`);

    // Загружаем файл в Gemini API
    const myfile = await genAI.files.upload({
      file: filePath,
      config: { mimeType },
    });

    if (!myfile.uri || !myfile.mimeType) {
      throw new Error("Не удалось загрузить файл в Gemini API");
    }

    console.log("Отправляем запрос к Gemini для анализа аудио...");

    // Отправляем запрос к модели
    const result = await model.generateContent({
      model: "gemini-2.5-flash",
      contents: createUserContent([
        createPartFromUri(myfile.uri, myfile.mimeType),
        audioPrompt,
      ]),
    });

    // Удаляем временный файл
    try {
      fs.unlinkSync(filePath);
    } catch (unlinkError) {
      console.warn("Не удалось удалить временный файл:", unlinkError);
    }

    const responseText = result.text;

    if (!responseText) {
      return "Извините, не удалось обработать аудиосообщение. Попробуйте еще раз.";
    }

    // Добавляем информацию о длительности для голосовых сообщений
    if (messageType === AudioMessageType.VOICE && duration) {
      const durationText =
        duration > 60
          ? `${Math.floor(duration / 60)}:${(duration % 60)
              .toString()
              .padStart(2, "0")} мин`
          : `${duration} сек`;
      return `🎤 **Голосовое сообщение** (${durationText})\n\n${responseText}`;
    }

    return responseText;
  } catch (error) {
    console.error("Ошибка при обработке аудиосообщения:", error);

    // Более детальная обработка ошибок
    if (error instanceof Error) {
      if (error.message.includes("User location is not supported")) {
        return "😔 К сожалению, Gemini API недоступен в вашем регионе. Попробуйте использовать VPN.";
      } else if (error.message.includes("quota")) {
        return "⚠️ Превышена квота API. Попробуйте позже.";
      } else if (error.message.includes("file size")) {
        return "📁 Файл слишком большой. Попробуйте отправить более короткое аудио.";
      }
    }

    return "Извините, произошла ошибка при обработке вашего аудиосообщения. Попробуйте еще раз или отправьте более короткое сообщение.";
  }
}

// Обработчик для неизвестных команд и текстовых сообщений
bot.on("message", async (ctx: BotContext) => {
  try {
    // Проверяем, существует ли сообщение и является ли оно текстовым
    if (ctx.message && "text" in ctx.message && ctx.message.text) {
      // Отправляем индикатор набора текста
      await ctx.sendChatAction("typing");

      // Получаем текст сообщения
      const messageText = ctx.message.text;

      // Если это команда, игнорируем
      if (messageText.startsWith("/")) {
        void ctx.reply(
          "Я не понимаю эту команду. Используйте /help для получения списка доступных команд."
        );
        return;
      }

      // Генерируем ответ с помощью Gemini API
      const response = await generateResponse(messageText);

      // Отправляем ответ пользователю
      void ctx.reply(response);
    }
    // Проверяем, является ли сообщение голосовым или аудиофайлом
    else if (
      ctx.message &&
      ("voice" in ctx.message || "audio" in ctx.message)
    ) {
      // Отправляем индикатор записи аудио
      await ctx.sendChatAction("record_voice");

      // Определяем тип сообщения и получаем информацию о файле
      const isVoice = "voice" in ctx.message;
      const fileInfo = isVoice ? ctx.message.voice : ctx.message.audio;
      const fileId = fileInfo.file_id;

      // Получаем дополнительную информацию для разных типов аудио
      const messageType = isVoice
        ? AudioMessageType.VOICE
        : AudioMessageType.AUDIO_FILE;
      const duration = fileInfo.duration;
      const fileName = isVoice
        ? undefined
        : "file_name" in fileInfo && typeof fileInfo.file_name === "string"
        ? fileInfo.file_name
        : undefined;

      console.log(
        `Получено ${
          isVoice ? "голосовое сообщение" : "аудиофайл"
        } длительностью ${duration || "неизвестно"} сек`
      );

      // Получаем URL для скачивания файла
      const fileUrl = await ctx.telegram.getFileLink(fileId);

      // Обрабатываем аудиосообщение с учетом типа
      const response = await processAudioMessage(
        fileUrl.href,
        fileId,
        messageType,
        duration,
        fileName
      );

      // Отправляем ответ пользователю
      void ctx.reply(response);
    } else {
      // Если сообщение другого типа
      void ctx.reply("Я могу обрабатывать только текстовые и аудио сообщения.");
    }
  } catch (error) {
    console.error("Ошибка при обработке сообщения:", error);
    void ctx.reply(
      "Произошла ошибка при обработке вашего сообщения. Пожалуйста, попробуйте позже."
    );
  }
});

// Обработка ошибок
bot.catch((err: unknown, ctx: BotContext) => {
  console.error("Ошибка Telegraf:", err);
  // Используем void для игнорирования возвращаемого значения
  void ctx.reply(
    "Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже."
  );
});

// Функция запуска бота
const startBot = async (): Promise<void> => {
  try {
    await bot.launch();
    console.log("Бот успешно запущен! 🚀");
    console.log("Нажмите Ctrl+C для остановки");
  } catch (error) {
    console.error("Ошибка при запуске бота:", error);
    process.exit(1);
  }
};

// Запуск бота
startBot();

// Корректное завершение работы при получении сигналов остановки
process.once("SIGINT", (): void => bot.stop("SIGINT"));
process.once("SIGTERM", (): void => bot.stop("SIGTERM"));
