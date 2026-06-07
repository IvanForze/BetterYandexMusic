const installBtn = document.getElementById('installBtn');
const terminal = document.getElementById('terminal');

function logToTerminal(msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  terminal.appendChild(line);
  terminal.parentElement.scrollTop = terminal.parentElement.scrollHeight;
}

const uninstallBtn = document.getElementById('uninstallBtn');
const githubLink = document.getElementById('githubLink');

// EULA Logic
const eulaView = document.getElementById('eulaView');
const installView = document.getElementById('installView');
const eulaCheckbox = document.getElementById('eulaCheckbox');
const eulaNextBtn = document.getElementById('eulaNextBtn');

eulaCheckbox.addEventListener('change', (e) => {
  eulaNextBtn.disabled = !e.target.checked;
});

eulaNextBtn.addEventListener('click', () => {
  eulaView.classList.remove('view-active');
  eulaView.classList.add('view-hidden');
  installView.classList.remove('view-hidden');
  installView.classList.add('view-active');
});

window.api.onLog((msg) => {
  logToTerminal(`> ${msg}`);
});

githubLink.addEventListener('click', () => {
  window.api.openUrl('https://github.com/IvanForze/BetterYandexMusic');
});

function setButtonsState(disabled) {
  installBtn.disabled = disabled;
  uninstallBtn.disabled = disabled;
}

function resetButtons() {
  installBtn.textContent = 'Установить';
  installBtn.style.backgroundColor = '';
  installBtn.style.color = '';
  installBtn.style.boxShadow = '';
  
  uninstallBtn.textContent = 'Удалить мод';
  uninstallBtn.style.color = '';
  uninstallBtn.style.borderColor = '';
}

installBtn.addEventListener('click', async () => {
  resetButtons();
  setButtonsState(true);
  installBtn.textContent = 'Установка...';
  terminal.innerHTML = '';
  
  logToTerminal('> Запуск установки...');
  
  const result = await window.api.installMod();
  
  if (result.success) {
    installBtn.textContent = 'Готово!';
    installBtn.style.backgroundColor = '#4caf50'; // Зеленый цвет
    installBtn.style.color = '#ffffff'; // Белый текст
    installBtn.style.boxShadow = '0 4px 14px rgba(76, 175, 80, 0.4)'; // Зеленое свечение
  } else {
    installBtn.textContent = 'Ошибка';
    installBtn.style.backgroundColor = '#f44336';
    installBtn.style.boxShadow = '0 4px 14px rgba(244, 67, 54, 0.4)'; // Красное свечение
    logToTerminal(`> [КРИТИЧЕСКАЯ ОШИБКА]: ${result.error}`);
  }
  setButtonsState(false);
});

uninstallBtn.addEventListener('click', async () => {
  resetButtons();
  setButtonsState(true);
  uninstallBtn.textContent = 'Удаление...';
  terminal.innerHTML = '';
  
  logToTerminal('> Запуск удаления...');
  
  const result = await window.api.uninstallMod();
  
  if (result.success) {
    uninstallBtn.textContent = 'Удалено!';
    uninstallBtn.style.color = '#4caf50';
    uninstallBtn.style.borderColor = '#4caf50';
  } else {
    uninstallBtn.textContent = 'Ошибка';
    uninstallBtn.style.color = '#f44336';
    uninstallBtn.style.borderColor = '#f44336';
    logToTerminal(`> [КРИТИЧЕСКАЯ ОШИБКА]: ${result.error}`);
  }
  setButtonsState(false);
});
