/**
 * script_upload.js — логика страницы загрузки CSV (upload.html)
 * Зависит от: d3.v5, js/game_core.js
 */

function uploadData() {
  const input = document.getElementById('file-input');
  input.value = '';
  input.click();
}

document.getElementById('file-input').addEventListener('change', async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log('Выбран файл:', file.name);

  try {
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      const data = { name: file.name, heroes: parseCSV(text) };
      console.log('CSV данные:', data);
      startGameWithData(data);
    }
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    alert('Ошибка загрузки: ' + error.message);
  }
});

function parseCSV(csvText) {
  const lines   = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const heroes  = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = [];
    let inQuotes = false;
    let currentValue = '';

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^"|"$/g, ''));

    const hero = {};
    headers.forEach((header, idx) => {
      if (header === 'hero' || header === 'name') {
        hero.hero = values[idx];
      } else if (header === 'url' || header === 'image') {
        hero.url = values[idx];
      } else {
        hero[header] = values[idx];
      }
    });

    if (hero.hero && hero.url) heroes.push(hero);
  }

  return heroes;
}

function startGameWithData(results) {
  const data = results['heroes'];
  const name = results['name'];

  d3.selectAll('.item').remove();
  d3.select('.item__hero').remove();

  // Рендер поля (общий модуль); без кнопки «Поделиться» — href = null
  renderGame(data, name, null, function () {
    startGameWithData(results);
  });
}
