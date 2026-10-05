import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchEntries } from '../src/search.mjs';

const entries = [
  {title: '留出空白', content: '文章讨论复杂系统中的留白与 React 组件。', summary: '', url: '/zh/', language: 'zh-CN', date: '2026-09-01'},
  {title: 'Small systems', content: 'React can make a complex system easier to read.', summary: '', url: '/en/', language: 'en', date: '2026-09-02'},
  {title: 'React 的边界', content: '记录组件与内容的边界。', summary: '', url: '/title/', language: 'zh-CN', date: '2026-08-01'},
];
test('one query finds original articles in both languages and prioritizes titles', () => {
  assert.deepEqual(searchEntries(entries, 'React').map(result => result.entry.url), ['/title/', '/en/', '/zh/']);
});
test('Chinese phrases and mixed-script queries remain searchable', () => {
  assert.equal(searchEntries(entries, '复杂系统 React')[0].entry.url, '/zh/');
  assert.equal(searchEntries(entries, '不存在').length, 0);
});
test('empty queries show recent writing', () => {
  assert.deepEqual(searchEntries(entries, '').map(result => result.entry.url), ['/en/', '/zh/', '/title/']);
});
