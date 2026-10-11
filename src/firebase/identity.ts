export function getPlayerId(): string {
  let uid = localStorage.getItem('chess-player-uid');
  if (!uid) {
    uid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('chess-player-uid', uid);
  }
  return uid;
}

export function generateRoomId(): string {
  // Avoids confusable chars (0/O, 1/I/L)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
