const { spawn } = require('child_process');
const PORT = process.env.PORT || 3000;

console.log('⏳ Запускаем локальный сервер...');

// Запускаем основной сервер как дочерний процесс
const serverProcess = spawn('node', ['server.js'], {
  stdio: 'inherit',
  shell: true
});

serverProcess.on('error', (err) => {
  console.error('❌ Ошибка при запуске сервера:', err);
});

// Немного ждем, чтобы сервер успел запуститься перед созданием туннеля
setTimeout(() => {
  console.log(`⏳ Создаем защищенный туннель Cloudflare на порту ${PORT}...`);
  
  // Запускаем cloudflared (используем npx, который вызовет локально установленный пакет)
  const tunnelProcess = spawn('npx', ['cloudflared', 'tunnel', '--url', `http://localhost:${PORT}`], {
    shell: true
  });

  let urlFound = false;

  tunnelProcess.stderr.on('data', (data) => {
    const output = data.toString();
    // Ищем URL в логах cloudflared
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !urlFound) {
      urlFound = true;
      console.log('\n======================================================');
      console.log('🚀 ТУННЕЛЬ УСПЕШНО СОЗДАН!');
      console.log(`🌐 ВАШ HTTPS АДРЕС: ${match[0]}`);
      console.log('👉 Скопируйте этот адрес и вставьте в расширение!');
      console.log('======================================================\n');
    }
  });

  tunnelProcess.on('close', (code) => {
    console.log(`❌ Туннель закрыт (код: ${code}).`);
  });

  tunnelProcess.on('error', (err) => {
    console.error('❌ Ошибка при создании туннеля:', err);
  });

}, 2000);
