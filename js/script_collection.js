/**
 * script_collection.js — логика страницы коллекции (form.html)
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
  for (let i = 0; i < 2; i++)
    code += seed_chars[Math.floor(Math.random() * seed_chars.length)];
  const crc = seed_crc(code);
  code += seed_chars[crc % seed_chars.length];
  local_seed = code;
  return code;
}

function parse_code(_seed) {
  console.log(_seed);
  if (!_seed.match(/^([0-9A-Z]{1,8}-)*[0-9A-Z]{1,8}$/)) {
    console.log('error');
    return null;
  }
  return { dataset: _seed.split('-').map(Number) };
}

d3.csv('data/worlds.csv').then(worlds => {
  d3.csv('data/heroes.csv').then(items => {

    var items_collection = [];

    // ── Подготовка игры ────────────────────────────────────────────────────
    function prepare_game(_seed) {
      const index_heroes = _seed.dataset.length
        ? _seed.dataset
        : items_collection.map(d => d.index);
      const dataGame = items.filter(d => index_heroes.includes(Number(d.index)));
      const shuffled = dataGame.map((_, i) => [random(), i]).sort();
      return shuffled.map(s => dataGame[s[1]]);
    }

    // ── Запуск игры ────────────────────────────────────────────────────────
    function start_game(data, href) {
      d3.select("div[class='message']").remove();
      d3.select('div[class="copy-url"]').remove();
      d3.select("i[class='fa fa-play-circle refresh-game']").remove();

      renderGame(data, 'Своя коллекция', href, function () {
        const _seed = parse_code(document.location.hash.slice(1));
        start_game(prepare_game(_seed), document.location.href);
      });
    }

    // ── Настройка меню ─────────────────────────────────────────────────────
    d3.select('span[name="back"]').append('i').attr('class', 'fa fa-home refresh-game')
      .append('span').attr('class', 'tooltiptext').text('Вернуться на Главную');
    d3.select('a[name="home"]').style('all', 'unset');

    d3.select('span[name="play"]')
      .append('i')
        .attr('class', 'fa fa-play-circle refresh-game')
        .style('color', '#2c2c2c')
        .on('click', create_game)
      .append('span')
        .attr('class', 'tooltiptext')
        .text('Играть с коллекцией');

    d3.select('span[name="clear"]')
      .append('i')
        .attr('class', 'fa fa-refresh refresh-game')
        .style('color', '#2c2c2c')
        .on('click', function () {
          items_collection = [];
          collection.selectAll("div[class='item']").remove();
          document.location.href = document.location.origin + document.location.pathname;
        })
      .append('span')
        .attr('class', 'tooltiptext')
        .text('Очистить коллекцию');

    // ── Коллекция ──────────────────────────────────────────────────────────
    const collection = d3.select('#collection.grid');
    collection.style('--auto-grid-min-size', '').style('grid-auto-rows', '230px').style('grid-gap', '12px');

    function show_collection() {
      collection.selectAll("div[class='item']").remove();
      collection.selectAll("div[class='item']").data(items_collection).enter()
        .append('div')
          .attr('class', 'item')
          .style('background-size', 'cover')
          .style('background-position', 'top')
          .style('background-image', d => 'url(' + d['url'] + ')')
          .on('dblclick', function (el) {
            items_collection.splice(
              items_collection.indexOf(d3.select(this)['_groups'][0][0]['__data__']), 1
            );
            d3.select(this).remove();
          });

      collection.selectAll('div')
        .append('div')
          .attr('class', 'item__details item__count')
          .text(d => d['hero']);
    }

    function click_item(d) {
      if (!items_collection.includes(d)) items_collection.push(d);
      d3.select(this).style('opacity', 1);
      show_collection();
    }

    function click_world(d) {
      const id_world = worlds.filter(row => row['name'] === d)[0]['index_world'];
      const heroes   = items.filter(item => item['index_world'] === id_world);
      const grid     = d3.select('#items.grid');

      grid.selectAll("div[class='item']").remove();
      grid.attr('game', d).attr('person', '');
      grid.style('--auto-grid-min-size', '').style('grid-auto-rows', '230px').style('grid-gap', '12px');

      grid.selectAll("div[class='item']").data(heroes).enter()
        .append('div')
          .attr('class', 'item')
          .style('background-size', 'cover')
          .style('background-position', 'top')
          .style('background-image', item => 'url(' + item['url'] + ')')
          .style('opacity', el => items_collection.includes(el) ? 1 : 0.5)
          .on('click', click_item);

      grid.selectAll('div')
        .append('div')
          .attr('class', 'item__details item__count')
          .text(d => d['hero']);
    }

    function select_all(d) {
      const id_world = worlds.filter(row => row['name'] === d)[0]['index_world'];
      items.filter(item => item['index_world'] === id_world).forEach(hero => {
        if (!items_collection.includes(hero)) items_collection.push(hero);
      });
      show_collection();
    }

    function create_game() {
      const code    = items_collection.map(d => String(d.index)).slice(0, 48).join('-');
      const _seed   = parse_code(code);
      const results = prepare_game(_seed);
      collection.selectAll("div[class='item']").remove();
      d3.select('#game.grid').selectAll("div[class='item']").remove();
      document.location.href = document.location.origin + document.location.pathname + '#' + code;
      start_game(results, document.location.href);
    }

    // ── Список миров ───────────────────────────────────────────────────────
    const dataNames = d3.nest().key(d => d.name).rollup(d => d[0]).entries(worlds)
      .map(d => d.value['name']).slice(5);

    const grid = d3.select('#worlds.grid');
    grid.attr('person', '');
    grid.style('--auto-grid-min-size', '')
        .style('grid-auto-rows', '230px')
        .style('grid-gap', '12px')
        .style('display', 'block')
        .style('width', 'auto')
        .style('float', 'left')
        .style('margin-right', '10px');

    grid.selectAll("div[class='item']").data(dataNames).enter()
      .append('div')
        .attr('class', 'item')
        .on('click', click_world)
        .on('dblclick', select_all);

    grid.selectAll('div')
      .append('div')
        .attr('class', 'item__details item__count')
        .text(d => d);

    // ── Старт по хэшу ─────────────────────────────────────────────────────
    const hash = document.location.hash.slice(1);
    const game = parse_code(hash);
    if (game) {
      start_game(prepare_game(game), document.location.href);
    }
  });
});
