'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function eventTarget(properties = {}) {
  const listeners = new Map();
  return Object.assign(properties, {
    addEventListener(type, callback) {
      const list = listeners.get(type) || [];
      list.push(callback);
      listeners.set(type, list);
    },
    emit(type, detail) {
      for (const callback of listeners.get(type) || []) callback({ type, detail });
    }
  });
}

function filmFixture({ reducedMotion = false, sourceFile = '../assets/js/v12.js' } = {}) {
  let observer;
  let playCalls = 0;
  let pauseCalls = 0;
  const pending = [];
  const settings = [];
  const film = { style: { opacity: '1' } };
  const button = eventTarget({ hidden: true, setAttribute(name, value) { this[name] = value; } });
  const video = eventTarget({
    paused: true,
    error: null,
    closest() { return film; },
    play() {
      playCalls++;
      settings.push({ muted: this.muted, inline: this.playsInline });
      this.paused = false;
      this.emit('play');
      return new Promise((resolve, reject) => pending.push({ resolve, reject }));
    },
    pause() {
      pauseCalls++;
      this.paused = true;
      this.emit('pause');
    }
  });
  const document = eventTarget({
    hidden: false,
    querySelector(selector) { return { '#hero-video': video, '#film-toggle': button }[selector]; }
  });
  const preference = eventTarget({ matches: reducedMotion });
  const IntersectionObserver = class {
    constructor(callback) { observer = callback; }
    observe(target) { assert.equal(target, video); }
  };
  const window = eventTarget({ IntersectionObserver });
  const source = fs.readFileSync(path.resolve(__dirname, sourceFile), 'utf8');
  const start = source.indexOf('  function initFilm()');
  const end = source.indexOf('  function initPanelFocus()', start);
  assert.ok(start >= 0 && end > start, 'test executes the actual playback controller');
  vm.runInNewContext(source.slice(start, end) + '\ninitFilm();', {
    document, window, matchMedia: () => preference, IntersectionObserver
  });
  return {
    video, button, document, window, preference, settings,
    get playCalls() { return playCalls; },
    get pauseCalls() { return pauseCalls; },
    intersect(visible) { observer([{ isIntersecting: visible }]); },
    ready() { video.emit('loadeddata'); video.emit('canplay'); },
    finish() { pending.splice(0).forEach(attempt => attempt.resolve()); },
    reject(name) { pending.splice(0).forEach(attempt => attempt.reject(Object.assign(new Error(name), { name }))); }
  };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('initial observer, page-show and media-ready events do not pause or duplicate startup playback', async () => {
  const f = filmFixture();
  f.intersect(true);
  f.window.emit('pageshow');
  f.ready();
  assert.equal(f.playCalls, 1, 'one pending request is shared by all startup events');
  assert.deepEqual(f.settings, [{ muted: true, inline: true }]);
  assert.equal(f.video.preload, 'auto');
  f.finish();
  await flush();
  assert.equal(f.video.paused, false, 'the video starts without any scroll or gesture');
  assert.equal(f.pauseCalls, 0, 'no stale startup callback pauses successful playback');
  assert.equal(f.button.textContent, 'Pause film');
});

test('manual pause persists through media, observer and visibility events', async () => {
  const f = filmFixture();
  f.finish(); await flush();
  f.button.emit('click');
  f.ready();
  f.intersect(true);
  f.window.emit('pageshow');
  f.document.emit('cv:filmvisibility', { visible: true });
  assert.equal(f.video.paused, true);
  assert.equal(f.playCalls, 1);
  assert.equal(f.button.textContent, 'Play film');
  f.button.emit('click');
  f.finish(); await flush();
  assert.equal(f.video.paused, false);
  assert.equal(f.playCalls, 2);
});

test('visibility pauses hidden video and resumes when the same film returns', async () => {
  const f = filmFixture();
  f.finish(); await flush();
  f.document.hidden = true;
  f.document.emit('visibilitychange');
  f.ready();
  assert.equal(f.video.paused, true);
  assert.equal(f.playCalls, 1);
  f.document.hidden = false;
  f.document.emit('visibilitychange');
  f.finish(); await flush();
  assert.equal(f.video.paused, false);
  f.document.emit('cv:filmvisibility', { visible: false });
  f.ready();
  assert.equal(f.video.paused, true);
  f.document.emit('cv:filmvisibility', { visible: true });
  f.finish(); await flush();
  assert.equal(f.video.paused, false);
  f.intersect(false);
  f.ready();
  assert.equal(f.video.paused, true);
  f.intersect(true);
  f.finish(); await flush();
  assert.equal(f.video.paused, false);
});

test('a quick tab switch during buffering retries an interrupted request once', async () => {
  const f = filmFixture();
  f.document.hidden = true;
  f.document.emit('visibilitychange');
  f.document.hidden = false;
  f.document.emit('visibilitychange');
  assert.equal(f.playCalls, 1);
  f.reject('AbortError'); await flush();
  assert.equal(f.playCalls, 2);
  f.finish(); await flush();
  assert.equal(f.video.paused, false);
});

test('an interrupted request cannot resume after the user explicitly pauses', async () => {
  const f = filmFixture();
  f.button.emit('click');
  f.reject('AbortError'); await flush();
  f.ready();
  assert.equal(f.video.paused, true);
  assert.equal(f.playCalls, 1);
});

test('a browser autoplay denial offers manual play without a retry loop', async () => {
  const f = filmFixture();
  f.video.paused = true;
  f.reject('NotAllowedError'); await flush();
  f.ready();
  f.intersect(true);
  f.window.emit('pageshow');
  assert.equal(f.playCalls, 1);
  assert.equal(f.button.textContent, 'Play film');
  f.button.emit('click');
  assert.equal(f.playCalls, 2);
  f.finish(); await flush();
  assert.equal(f.video.paused, false);
});

test('reduced-motion preference is retained while explicit play still works', async () => {
  const f = filmFixture({ reducedMotion: true });
  f.intersect(true); f.ready();
  assert.equal(f.playCalls, 0);
  assert.equal(f.video.paused, true);
  f.button.emit('click');
  f.finish(); await flush();
  assert.equal(f.video.paused, false);
  f.preference.emit('change');
  assert.equal(f.video.paused, true);
});

test('homepage preloader uses the existing logo and removes itself after one 1000ms timer', () => {
  let shown;
  let removed = false;
  const timers = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/preloader.js'), 'utf8'), {
    document: {
      createElement(tagName) {
        return {
          tagName,
          children: [],
          append(child) { this.children.push(child); },
          setAttribute(name, value) { this[name] = value; },
          remove() { removed = true; }
        };
      },
      body: { prepend(element) { shown = element; } }
    },
    window: { setTimeout(callback, delay) { timers.push({ callback, delay }); } }
  });
  assert.equal(shown.className, 'cv-preloader');
  assert.equal(shown['aria-hidden'], 'true');
  assert.equal(shown.children.length, 1);
  const logo = shown.children[0];
  assert.equal(logo.tagName, 'img');
  assert.equal(logo.src, 'assets/images/crownvault-logo-on-dark.png');
  assert.equal(logo.className, 'cv-preloader-logo');
  assert.equal(logo.alt, '');
  assert.ok(fs.existsSync(path.join(__dirname, '..', logo.src)));
  assert.equal(removed, false);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 1000);
  timers[0].callback();
  assert.equal(removed, true);
});
