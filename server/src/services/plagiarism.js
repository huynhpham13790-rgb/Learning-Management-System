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

// Tỉ lệ (0..100) văn bản `a` trùng với `b`.
// `common`: tập shingle phổ biến (xuất hiện ở nhiều bài, vd. trích đề bài) — không tính là trùng.
export function similarity(a, b, common = null) {
  const wa = normalize(a);
  const wb = normalize(b);
  if (!wa.length || !wb.length) return 0;
  const sb = shingles(wb);
  let sa = shingles(wa);
  if (common) {
    const filtered = new Set([...sa].filter((s) => !common.has(s)));
    // Bài gần như chỉ gồm cụm phổ biến => không đủ dữ kiện để kết luận
    if (filtered.size < Math.max(3, sa.size * 0.1)) return 0;
    sa = filtered;
  }
  let shared = 0;
  for (const s of sa) if (sb.has(s)) shared++;
  const containment = shared / sa.size;
  const score = common ? 0.9 * containment + 0.1 * cosine(wa, wb) : 0.7 * containment + 0.3 * cosine(wa, wb);
  return Math.round(score * 10000) / 100;
}

// Shingle xuất hiện ở hơn 30% số bài (tối thiểu 3 bài) được coi là cụm phổ biến
export function commonShingles(texts, ratio = 0.3) {
  const df = new Map();
  for (const t of texts) for (const s of shingles(normalize(t))) df.set(s, (df.get(s) || 0) + 1);
  const limit = Math.max(3, Math.ceil(texts.length * ratio));
  return new Set([...df].filter(([, n]) => n >= limit).map(([s]) => s));
}

// So một bài với danh sách bài khác, trả về bài giống nhất.
// Khi đủ nhiều bài (>= 5) thì lọc bỏ các cụm phổ biến để tránh báo động giả.
export function findMostSimilar(content, others) {
  const common = others.length >= 4 ? commonShingles([content, ...others.map((o) => o.content)]) : null;
  let best = { score: 0, sourceId: null };
  for (const o of others) {
    const score = similarity(content, o.content, common);
    if (score > best.score) best = { score, sourceId: o.id };
  }
  return best;
}
