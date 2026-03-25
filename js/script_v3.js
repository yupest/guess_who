/**
 * script_v3.js — логика главной страницы (index.html)
 * Зависит от: d3.v5, js/game_core.js
 */

var seed = 1;
var local_seed;

const seed_chars = '123456789QWERTYUIOPASDFGHJKLZXCVBNM';
const magic = [29, 23, 11, 19, 17];

function random() {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function seed_crc(code) {
  let crc = 0;
  for (let i = 0; i < 5; i++)
    crc += magic[i] * seed_chars.indexOf(code[i]);
  return crc;
}

function update_seed(_id) {
  let code = '';
  for (let i = 0; i < 4; i++)
    code += seed_chars[Math.floor(Math.random() * seed_chars.length)];
  const crc = seed_crc(code);
  code += seed_chars[crc % seed_chars.length];
  code += _id;
  local_seed = code;
  return code;
}

function parse_code(_seed) {
  if (!_seed.match(/^[0-9A-Z]{6,8}$/)) return null;
  const code = _seed.slice(0, 4);
  const crc   = _seed[4];
  if (seed_chars[seed_crc(code) % seed_chars.length] !== crc) return null;
  let result = 0;
  for (let i = 1; i < 5; i++)
    result = seed_chars.length * result + seed_chars.indexOf(_seed[i]);
  return { dataset: Number(_seed.slice(5)), seed: result };
}

const home = document.location.origin + document.location.pathname;

d3.csv('data/worlds.csv').then(worlds => {
  d3.csv('data/heroes.csv').then(items => {

    // ── Подготовка игры ────────────────────────────────────────────────────
    function prepare_game(_seed) {
      seed = _seed.seed;
      const dataGame  = items.filter(d => d['index_world'] === String(_seed.dataset));
      const nameGame  = worlds.filter(d => d['index_world'] === String(_seed.dataset))[0]['name'];
      const shuffled  = dataGame.map((_, i) => [random(), i]).sort();
      const results   = [];
      for (let i = 0; i < 24; i++) {
        if (shuffled[i]) results.push(dataGame[shuffled[i][1]]);
      }
      return [results, nameGame];
    }

    // ── Запуск игры ────────────────────────────────────────────────────────
    function start_game(results, href) {
      const data = results[0];
      const name = results[1];

      // Убрать элементы главного экрана
      d3.select('i[class="fa fa-home"]').remove();
      d3.select('i[class="fa fa-refresh refresh-game fa-fw"]').remove();
      d3.select('p').remove();
      d3.select('div[class="copy-url"]').remove();
      d3.select('.refresh-game').remove();

      // Меню: назад
      d3.select('span[name="back"]').append('i').attr('class', 'fa fa-home refresh-game')
        .append('span').attr('class', 'tooltiptext').text('Вернуться на Главную');
      d3.select('a[name="home"]').style('all', 'unset');

      // Меню: обновить мир
      d3.select('span[name="clear"]').datum(data[0]['index_world'])
        .append('i')
          .attr('class', 'fa fa-refresh refresh-game fa-fw')
          .style('color', '#2c2c2c')
          .on('click', refresh_game)
        .append('span')
          .attr('class', 'tooltiptext')
          .text('Обновить игру. Если база мира больше 24 персонажей, произойдет подбор новых.');

      // Рендер поля (общий модуль)
      renderGame(data, name, href, function () {
        const _seed = parse_code(document.location.hash.slice(1));
        start_game(prepare_game(_seed), document.location.href);
      });
    }

    function refresh_game(g) {
      const code    = update_seed(g);
      const _seed   = parse_code(local_seed);
      const results = prepare_game(_seed);
      document.location.href = home + '?name=' + results[1] + '#' + code;
      start_game(results, document.location.href);
    }

    // ── Старт ──────────────────────────────────────────────────────────────
    const hash = document.location.hash.slice(1);
    const game = parse_code(hash);

    if (game) {
      start_game(prepare_game(game), document.location.href);
    } else {
      // Экран выбора мира
      const dataGroups = d3.nest().key(d => d.group).rollup(d => d[0]).entries(worlds).map(d => d.value['group']);

      // d3.select('p').append('nav').attr('id', 'primary_nav_wrap');
      d3.select('nav').append('ul');
      d3.select('ul').selectAll('li').data(dataGroups).enter()
        .append('li').append('a')
          .attr('href', d => '#' + d)
          .text(d => d)
          .on('click', filterGame);

      function getSizeWorld(world) {
        return world['index_world'] > 2
          ? ' (' + items.filter(d => d['index_world'] === world['index_world']).length + ')'
          : '';
      }

      function filterGame(g) {
        d3.selectAll('a').style('background', '');
        d3.selectAll('.item').remove();
        const grid = d3.select('.grid');
        grid.style('--auto-grid-min-size', '18rem').style('grid-auto-rows', '400px');

        const worldData = (g === 'Все') ? worlds : worlds.filter(d => d['group'] === g);
        if (g === 'Все') d3.select('a[href="#Все"]').style('background', '#ddd');

        grid.selectAll("div[class='item']").data(worldData).enter()
          .append('div')
            .attr('class', 'item')
            .style('background', d => 'url(' + d['poster'] + ')')
            .style('background-size', 'cover')
            .style('background-position', 'top')
            .on('click', clickGame);

        grid.selectAll('div')
          .append('div')
            .attr('class', 'item__details')
            .text(d => d['name'] + getSizeWorld(d));
      }

      filterGame(dataGroups[0]);

      function clickGame(g) {
        if (g['index_world'] < -2) {
          document.location.href = items[parseInt(g['index_world']) + 5]['url'];
        } else if (g['index_world'] < 0) {
          window.open(items[parseInt(g['index_world']) + 5]['url'], '_blank').focus();
        } else {
          const code    = update_seed(g['index_world']);
          const _seed   = parse_code(local_seed);
          const results = prepare_game(_seed);
          document.location.href = home + '?name=' + results[1] + '#' + code;
          start_game(results, document.location.href);
        }
      }
    }
  });
});
