// Phát hiện đạo văn: so khớp n-gram (shingle) + cosine tần suất từ.
// Chạy hoàn toàn cục bộ, không cần AI, nên luôn dùng được.

export function normalize(text = '') {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function shingles(words, n = 3) {
  const set = new Set();
  if (words.length < n) {
    if (words.length) set.add(words.join(' '));
    return set;
  }
  for (let i = 0; i <= words.length - n; i++) set.add(words.slice(i, i + n).join(' '));
  return set;
}

function termFreq(words) {
  const tf = new Map();
  for (const w of words) tf.set(w, (tf.get(w) || 0) + 1);
  return tf;
}

export function cosine(wordsA, wordsB) {
  const a = termFreq(wordsA);
  const b = termFreq(wordsB);
  let dot = 0;
  for (const [w, c] of a) dot += c * (b.get(w) || 0);
  const norm = (m) => Math.sqrt([...m.values()].reduce((s, c) => s + c * c, 0));
  const denom = norm(a) * norm(b);
  return denom ? dot / denom : 0;
}

// Tỉ lệ (0..100) văn bản `a` trùng với `b`
export function similarity(a, b) {
  const wa = normalize(a);
  const wb = normalize(b);
  if (!wa.length || !wb.length) return 0;
  const sa = shingles(wa);
  const sb = shingles(wb);
  let common = 0;
  for (const s of sa) if (sb.has(s)) common++;
  const containment = common / sa.size;
  const score = 0.7 * containment + 0.3 * cosine(wa, wb);
  return Math.round(score * 10000) / 100;
}

// So một bài với danh sách bài khác, trả về bài giống nhất
export function findMostSimilar(content, others) {
  let best = { score: 0, sourceId: null };
  for (const o of others) {
    const score = similarity(content, o.content);
    if (score > best.score) best = { score, sourceId: o.id };
  }
  return best;
}
