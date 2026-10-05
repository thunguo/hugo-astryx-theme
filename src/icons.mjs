import { createElement as h } from 'react';

const icon = (paths) => h('svg', {
  viewBox: '0 0 24 24', width: '1em', height: '1em', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round',
  strokeLinejoin: 'round', 'aria-hidden': true,
}, ...paths.map((d, index) => h('path', {d, key: index})));

export const siteIcons = {
  close: icon(['M6 6l12 12M18 6L6 18']),
  search: icon(['M20 20l-4.5-4.5', 'M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0']),
  chevronLeft: icon(['M15 5l-7 7 7 7']),
  chevronRight: icon(['M9 5l7 7-7 7']),
  chevronDown: icon(['M5 9l7 7 7-7']),
  check: icon(['M5 12l4 4L19 6']),
  copy: icon(['M8 8h12v12H8z', 'M16 8V4H4v12h4']),
  sun: icon(['M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0', 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4L19 5']),
  moon: icon(['M20 15a8 8 0 0 1-11-11A8 8 0 1 0 20 15']),
  monitor: icon(['M3 4h18v13H3z', 'M12 17v4m-4 0h8']),
  menu: icon(['M4 6h16M4 12h16M4 18h16']),
};

export default siteIcons;
