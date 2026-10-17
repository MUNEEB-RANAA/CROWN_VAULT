'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function motionFixture({ mobile = false, reduced = false } = {}) {
  const callbacks = new Map();
  const frames = new Map();
  let nextFrame = 0;
  let layoutReads = 0;
  const element = () => ({ style: {}, inert: false, removeAttribute() { this.style = {}; } });
  const film = element(), copy = element(), paths = element();
  const panels = [element(), element(), element()];
  paths.querySelectorAll = () => panels;
  const stage = { offsetHeight: 800 };
  const classes = new Set();
  const story = {
    offsetHeight: 1880,
    getBoundingClientRect() { layoutReads++; return { top: -window.scrollY }; },
    classList: { toggle(name, value) { if (value) classes.add(name); else classes.delete(name); } },
    querySelector(name) { return { '.hero-stage': stage, '.hero-film': film, '.hero-copy': copy, '.path-stage': paths }[name]; }
  };
  const listen = (name, callback) => { const list = callbacks.get(name) || []; list.push(callback); callbacks.set(name, list); };
  const desktop = { matches: !mobile, addEventListener(name, fn) { this.change = fn; } };
  const preference = { matches: reduced, addEventListener(name, fn) { this.change = fn; } };
  const document = {
    hidden: false,
    querySelector(selector) { return selector === '.hero-story' ? story : null; },
    addEventListener: listen,
    dispatchEvent(event) { for (const fn of callbacks.get(event.type) || []) fn(event); }
  };
  const window = { scrollY: 0, addEventListener: listen };
  const context = { document, window, matchMedia: query => query.includes('min-width') ? desktop : preference,
    requestAnimationFrame(fn) { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/home.js'), 'utf8'), context);
  document.dispatchEvent({ type: 'DOMContentLoaded' });
  function scroll(y) { window.scrollY = y; document.dispatchEvent({ type: 'scroll' }); }
  function settle() {
    let time = 0;
    while (frames.size && time < 4000) {
      time += 16;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time));
    }
    assert.equal(frames.size, 0, 'animation stops requesting frames when it settles');
  }
  return { film, copy, paths, panels, classes, frames, preference, desktop, document, scroll, settle, get layoutReads() { return layoutReads; } };
}

test('hero reaches visible, usable cards without reading layout on every scroll frame', () => {
  const f = motionFixture();
  assert.equal(f.film.style.opacity, '1');
  assert.equal(f.paths.inert, true);
  const reads = f.layoutReads;
  f.scroll(1080); f.settle();
  assert.equal(f.film.style.opacity, '0');
  assert.equal(f.film.inert, true);
  assert.equal(f.paths.inert, false);
  assert.ok(f.panels.every(panel => panel.style.opacity === '1'));
  assert.equal(f.layoutReads, reads);
  f.scroll(0); f.settle();
  assert.equal(f.film.style.opacity, '1');
  assert.equal(f.copy.inert, false);
});

test('mobile and reduced-motion layouts keep all navigation cards available', () => {
  for (const options of [{ mobile: true }, { reduced: true }]) {
    const f = motionFixture(options);
    assert.equal(f.classes.has('motion-active'), false);
    assert.equal(f.paths.inert, false);
    assert.ok(f.panels.every(panel => !panel.inert));
    f.scroll(500);
    assert.equal(f.frames.size, 0);
  }
});

test('changing reduced-motion preferences cancels pending animation and reveals content', () => {
  const f = motionFixture();
  f.scroll(500);
  assert.equal(f.frames.size, 1);
  f.preference.matches = true; f.preference.change();
  assert.equal(f.frames.size, 0);
  assert.equal(f.classes.has('motion-active'), false);
  assert.equal(f.paths.inert, false);
  assert.equal(f.film.inert, false);
});
