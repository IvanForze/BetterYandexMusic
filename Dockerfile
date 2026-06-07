# Используем стабильную Node.js LTS на базе alpine для легковесности
FROM node:20-alpine

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Копируем файлы описания зависимостей
COPY package*.json ./

# Устанавливаем только production-зависимости
RUN npm install --production

# Копируем исходный код бэкенда и публичные статические файлы
COPY server.js ./
COPY server-tunnel.js ./
COPY public ./public

# Открываем порт, на котором работает сервер
EXPOSE 3000

# Запуск сервера
CMD ["npm", "start"]
