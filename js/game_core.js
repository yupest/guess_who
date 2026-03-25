/**
 * game_core.js — общая логика отрисовки игрового поля
 * Используется в: script_v3.js, script_collection.js, script_upload.js
 */

/**
 * Строит игровое поле из массива персонажей.
 *
 * @param {Object[]} data       — массив {hero, url, …}
 * @param {string}   name       — название мира / коллекции
 * @param {string}   href       — URL для кнопки «Поделиться» (null → не показывать)
 * @param {Function} onRefresh  — колбэк кнопки обновления персонажа (↺ в карточке героя)
 */
function renderGame(data, name, href, onRefresh) {
  d3.select('title').text(name);

  d3.selectAll('.item').remove();
  d3.select('div[class="copy-url"]').remove();
  d3.select('.item__hero').remove();

  d3.select('span[name="game"]').text(' (' + name + ')');

  const grid  = d3.select('#game.grid');
  const grid1 = d3.select('#hero');

  grid.attr('game', name).attr('person', '');
  grid.style('--auto-grid-min-size', '')
      .style('grid-auto-rows', '230px')
      .style('grid-gap', '12px');

  // Кнопка «Поделиться»
  if (href) {
    d3.select("div[class='share-url']").append('div')
      .attr('class', 'copy-url')
      .append('input')
        .attr('type', 'text')
        .attr('class', 'share-link')
        .attr('value', href);

    d3.select('div[class="copy-url"]')
      .on('click', function () {
        document.querySelector('.share-link').focus();
        document.querySelector('.share-link').select();
        document.execCommand('copy');
      })
      .append('span')
        .attr('class', 'copy-link')
        .text(' Поделиться');
  }

  // Карточки персонажей
  grid.selectAll("div[class='item']").data(data).enter()
    .append('div')
      .attr('class', 'item')
      .style('background-size', 'cover')
      .style('background-position', 'top')
      .style('background-image', d => 'url(' + d['url'] + ')')
      .on('click', click);

  grid.selectAll('div')
    .append('div')
      .attr('class', 'item__details item__count')
      .text(d => d['hero']);

  // Карточка загаданного героя
  grid1.attr('class', 'grid')
       .style('padding-bottom', '10px')
       .style('--auto-grid-min-size', 11)
       .style('justify-items', 'center');

  grid1.append('div')
    .attr('class', 'item__hero')
    .style('background-size', 'cover')
    .style('background-repeat', 'no-repeat')
    .style('background-position', 'top')
    .style('background-image', 'url("data/favicon.png")')
    .style('width', '230px');

  // Начальная прозрачность + hover
  const heroEmpty = () => d3.select('#hero.grid').text() === '';

  d3.selectAll('div[class="item"]')
    .style('opacity', () => heroEmpty() ? '0.5' : '1');

  if (heroEmpty()) {
    d3.selectAll("div[game='" + name + "']").selectAll('div[class="item"]')
      .on('mouseover', function () { d3.select(this).style('opacity', '1'); })
      .on('mouseout',  function () { d3.select(this).style('opacity', '0.5'); });
  }

  // ── Клик по карточке ────────────────────────────────────────────────────
  function click(d) {
    if (heroEmpty()) {

      grid1.select('div')
        .append('div')
          .attr('class', 'item__who');

      d3.select('#hero.grid').select('.item__who')
        .text(d3.select(this).select('.item__details').text());
      d3.select('#hero.grid').select('.item__hero')
        .style('background-image', d3.select(this).style('background-image'));

      // Первый клик — выбрать загаданного персонажа
      d3.select('#hero.grid').select('.item__who')
        .append('i')
          .attr('class', 'fa fa-refresh refresh')
          .attr('style', 'font-size:2rem;')
          .style('color', '#2c2c2c')
          .on('click', function () {
            grid1.attr('class', '');
            if (typeof onRefresh === 'function') onRefresh();
          });

      d3.selectAll("div[game='" + name + "']").selectAll('div[class="item"]')
        .style('opacity', '1')
        .on('mouseout', '');
    } else {
      // Последующие клики — зачеркнуть / восстановить персонажа
      d3.select(this)
        .style('background', function () {
          return d3.select(this).style('background-color') === 'rgb(44, 44, 44)'
            ? 'url(' + d['url'] + ')'
            : '#2c2c2c';
        })
        .style('background-size', 'cover')
        .style('background-position', 'top');
    }

    // Счётчик оставшихся
    let crossed = 0;
    d3.selectAll('.item').each(function () {
      if (d3.select(this).style('background-color') === 'rgb(44, 44, 44)') crossed++;
    });
    const total = d3.selectAll('.item').size();
    d3.select('span[name="count"]').text(' ' + (total - crossed) + '/' + total);
  }
}
