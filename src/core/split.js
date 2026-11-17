/**
 * Wrap each word of an element in a masked span so it can slide in from below.
 * Returns the inner spans (animate these). The original text is kept as aria-label
 * so assistive tech reads the sentence once, not word by word.
 */
export function splitWords(el) {
  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.textContent = '';

  const words = text.split(/\s+/);
  return words.map((word, i) => {
    const outer = document.createElement('span');
    outer.className = 'word';
    outer.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.className = 'word__inner';
    inner.textContent = word;
    outer.append(inner);
    el.append(outer);
    if (i < words.length - 1) el.append(document.createTextNode(' '));
    return inner;
  });
}
