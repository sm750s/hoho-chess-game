export type Theme = 'dark' | 'light';

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('chess-theme', t); } catch {}
}

export function getCurrentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function toggleTheme(): Theme {
  const next: Theme = getCurrentTheme() === 'light' ? 'dark' : 'light';
  applyTheme(next);
  return next;
}

// 초기 적용 (로컬스토리지에 저장된 값, 없으면 라이트)
try {
  const saved = localStorage.getItem('chess-theme');
  if (saved === 'light' || saved === 'dark') applyTheme(saved);
  else applyTheme('light');
} catch {}
