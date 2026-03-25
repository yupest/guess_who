// ── State ──────────────────────────────────────────────────────────────────
const MAX = 48;
let heroes = []; // [{hero, url}]
let pendingSlotIndex = null; // индекс слота, который ждёт файл

// ── ImgBB key persistence ──────────────────────────────────────────────────
(function initKey(){
  const saved = localStorage.getItem('ImgBB_client_id');
  if(saved) document.getElementById('ImgBB-key').value = saved;
})();
function saveKey(){
  localStorage.setItem('ImgBB_client_id', document.getElementById('ImgBB-key').value.trim());
}

// ── Title display ──────────────────────────────────────────────────────────
function updateTitle(){
  const v = document.getElementById('world-name').value.trim();
  document.getElementById('world-title-display').textContent = v ? ' (' + v + ')' : '';
}

// ── Render ─────────────────────────────────────────────────────────────────
function render(){
  const grid = document.getElementById('heroes-grid');

  // Убрать все карточки, оставить add-card
  Array.from(grid.querySelectorAll('.hero-card')).forEach(c => c.remove());

  heroes.forEach((h, i) => {
    const card = document.createElement('div');
    card.className = 'hero-card filled';

    // Картинка
    const imgDiv = document.createElement('div');
    imgDiv.className = 'card-img';
    if(h.url){
      imgDiv.style.backgroundImage = 'url(' + h.url + ')';
    } else {
      imgDiv.innerHTML = '<span class="upload-icon"><i class="fa fa-image"></i></span>';
    }
    card.appendChild(imgDiv);

    // Имя
    const nameDiv = document.createElement('div');
    nameDiv.className = 'card-name';
    const nameInput = document.createElement('input');
    nameInput.className = 'card-name-input';
    nameInput.type = 'text';
    nameInput.placeholder = 'Имя персонажа';
    nameInput.value = h.hero;
    nameInput.maxLength = 30;
    nameInput.addEventListener('input', () => { heroes[i].hero = nameInput.value; checkReady(); });
    nameDiv.appendChild(nameInput);
    card.appendChild(nameDiv);

    // Кнопка удалить
    const removeBtn = document.createElement('button');
    removeBtn.className = 'card-remove';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Удалить';
    removeBtn.addEventListener('click', () => { heroes.splice(i, 1); render(); checkReady(); });
    card.appendChild(removeBtn);

    // Вставить перед add-card
    const addCard = document.getElementById('add-card');
    grid.insertBefore(card, addCard);
  });

  // Показать/скрыть кнопку добавления
  const addCard = document.getElementById('add-card');
  addCard.style.display = heroes.length >= MAX ? 'none' : 'flex';

  document.getElementById('count-label').textContent = 'Персонажей: ' + heroes.length + ' / ' + MAX;
  checkReady();
}

function checkReady(){
  const hasName = document.getElementById('world-name').value.trim().length > 0;
  const enough  = heroes.length >= 2;
  const allNamed = heroes.every(h => h.hero.trim().length > 0);
  const allUploaded = heroes.every(h => !!h.url);
  console.log(hasName && enough && allNamed && allUploaded)
  console.log(hasName)
  console.log(enough)
  console.log(allNamed)
  console.log(allUploaded)
  
  document.getElementById('download-btn').disabled = !(hasName && enough && allNamed && allUploaded);
}

// ── Add hero ───────────────────────────────────────────────────────────────
function triggerAdd(){
  const clientId = document.getElementById('ImgBB-key').value.trim();
  if(!clientId){
    setStatus('Введите свой ImgBB key', 'error');
    return;
  }
  document.getElementById('file-input').removeAttribute('multiple');
  // allow picking multiple files to add many at once
  document.getElementById('file-input').setAttribute('multiple', '');
  document.getElementById('file-input').value = '';
  document.getElementById('file-input').click();
}

document.getElementById('file-input').addEventListener('change', async function(){
  const files = Array.from(this.files);
  if(!files.length) return;

  const clientId = document.getElementById('ImgBB-key').value.trim();
  const available = MAX - heroes.length;
  const toUpload = files.slice(0, available);

  if(toUpload.length < files.length){
    setStatus('Можно добавить ещё ' + available + ' персонажей. Остальные файлы проигнорированы.', 'error');
  }

  for(let i = 0; i < toUpload.length; i++){
    const file = toUpload[i];
    const idx = heroes.length;
    heroes.push({ hero: '', url: null });
    render();
    showUploadingOverlay(idx, true);
    setStatus('Загрузка ' + (i+1) + ' из ' + toUpload.length + '…');
    try {
      const url = await uploadToImgBB(file, clientId);
      heroes[idx].url = url;
      render();
      setStatus('');
    } catch(e) {
      heroes.splice(idx, 1);
      render();
      setStatus('Ошибка загрузки: ' + e.message, 'error');
      break;
    }
  }
  setStatus(heroes.length ? 'Загружено ' + heroes.length + ' персонажей' : '', 'ok');
});

function showUploadingOverlay(idx, show){
  const cards = document.querySelectorAll('.hero-card');
  if(!cards[idx]) return;
  let overlay = cards[idx].querySelector('.uploading-overlay');
  if(show && !overlay){
    overlay = document.createElement('div');
    overlay.className = 'uploading-overlay';
    overlay.innerHTML = '<i class="fa fa-spinner fa-spin"></i>&nbsp;Загрузка…';
    cards[idx].appendChild(overlay);
  } else if(!show && overlay){
    overlay.remove();
  }
}

// ── ImgBB upload ───────────────────────────────────────────────────────────
async function uploadToImgBB(file, clientId){
  const formData = new FormData();
  formData.append('image', file);
  const resp = await fetch('https://api.imgbb.com/1/upload?key='+clientId, {
    method: 'POST',
    // headers: { 'key': 'Client-ID ' + clientId },
    body: formData
  });
  if(!resp.ok) throw new Error('HTTP ' + resp.status);
  const json = await resp.json();
  if(!json.success) throw new Error(json.data && json.data.error ? json.data.error : 'ImgBB error');
  return json.data.medium.url;
}

// ── Clear ──────────────────────────────────────────────────────────────────
function clearAll(){
  if(heroes.length > 0 && !confirm('Очистить всех персонажей?')) return;
  heroes = [];
  document.getElementById('world-name').value = '';
  updateTitle();
  render();
  setStatus('');
}

// ── Generate share URL & start game ───────────────────────────────────────
function startGame(){
  const worldName = document.getElementById('world-name').value.trim();
  if(!worldName){ setStatus('Введите название мира', 'error'); return; }
  if(heroes.length < 2){ setStatus('Добавьте хотя бы 2 персонажей', 'error'); return; }
  if(heroes.some(h => !h.url)){ setStatus('Дождитесь загрузки всех картинок', 'error'); return; }
  if(heroes.some(h => !h.hero.trim())){ setStatus('Задайте имена всем персонажам', 'error'); return; }

  // const payload = {
  //   name: worldName,
  //   heroes: heroes.map(h => ({ hero: h.hero.trim(), url: h.url }))
  // };
  // localStorage.setItem('data', payload);
  const headers = ['hero', 'url'];
  const rows = heroes.map(h => [h.hero.trim(), h.url]);
  
  let csvContent = headers.join(',') + '\n';
  rows.forEach(row => {
      // Экранируем поля, которые содержат запятые или кавычки
      const escapedRow = row.map(cell => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
              return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
      });
      csvContent += escapedRow.join(',') + '\n';
  });
  
  // Создаем и скачиваем файл
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${worldName.replace(/[^a-zа-яё0-9]/gi, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  // const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  // const hash = 'custom_' + encoded;
  // const url = location.origin + location.pathname.replace('create.html','') + 'index.html#';
  // window.location.href = url;
}

// ── Status ─────────────────────────────────────────────────────────────────
function setStatus(msg, type){
  const el = document.getElementById('status-bar');
  el.textContent = msg;
  el.className = 'status-bar' + (type ? ' ' + type : '');
}

// ── Init ───────────────────────────────────────────────────────────────────
render();
document.getElementById('world-name').addEventListener('input', checkReady);