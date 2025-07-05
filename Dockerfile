# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и pnpm-lock.yaml для установки зависимостей
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Устанавливаем pnpm глобально
RUN npm install -g pnpm

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile --prod

# Копируем исходный код
COPY . .

# Собираем приложение
RUN pnpm run build

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Меняем владельца файлов
RUN chown -R nextjs:nodejs /app
USER nextjs

# Открываем порт (хотя для бота это не обязательно)
EXPOSE 3000

# Запускаем приложение
CMD ["pnpm", "start"]