// Text anchors for comments. One module owns the promise: a saved anchor
// finds the same text again, or reports that it cannot.
//
// An anchor names one block and a quote inside it. The words before and after
// the quote score the candidates when the same words appear twice.

const BLOCK_SELECTOR = "p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, dt, dd";
const CONTEXT = 40;
const MAX_QUOTE = 400;

function blockOf(node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return element ? element.closest(BLOCK_SELECTOR) : null;
}

function textOffset(block, node, offset) {
  const range = document.createRange();
  range.setStart(block, 0);
  range.setEnd(node, offset);
  return range.toString().length;
}

// A block is a candidate when it holds text, contains no other candidate, and
// is not part of the comment UI that sits inside the content.
export function blocksOf(root) {
  return Array.from(root.querySelectorAll(BLOCK_SELECTOR)).filter(
    (element) =>
      !element.querySelector(BLOCK_SELECTOR) &&
      element.textContent.trim() !== "" &&
      !element.closest(".cm-section, .cm-rail, .cm-composer, .cm-sheet")
  );
}

function rangeIn(block, start, end) {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let seen = 0;
  let first = null;
  let last = null;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const length = node.nodeValue.length;
    if (!first && start <= seen + length) {
      first = { node, offset: Math.max(0, start - seen) };
    }
    if (!last && end <= seen + length) {
      last = { node, offset: Math.max(0, end - seen) };
      break;
    }
    seen += length;
  }
  if (!first || !last) {
    return null;
  }
  range.setStart(first.node, Math.min(first.offset, first.node.nodeValue.length));
  range.setEnd(last.node, Math.min(last.offset, last.node.nodeValue.length));
  return range;
}

export function capture(root, range) {
  const block = blockOf(range.startContainer);
  if (!block || !root.contains(block)) {
    return null;
  }
  const blocks = blocksOf(root);
  const blockIndex = blocks.indexOf(block);
  if (blockIndex < 0) {
    return null;
  }

  const text = block.textContent;
  let start = textOffset(block, range.startContainer, range.startOffset);
  let end = block.contains(range.endContainer)
    ? textOffset(block, range.endContainer, range.endOffset)
    : text.length;
  start = Math.max(0, Math.min(start, text.length));
  end = Math.max(start, Math.min(end, text.length));
  while (start < end && /\s/.test(text[start])) {
    start += 1;
  }
  while (end > start && /\s/.test(text[end - 1])) {
    end -= 1;
  }
  if (end <= start) {
    return null;
  }
  if (end - start > MAX_QUOTE) {
    end = start + MAX_QUOTE;
  }

  return {
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
    block_index: blockIndex,
    block_tag: block.tagName.toLowerCase(),
  };
}

export function locate(root, anchor) {
  if (!anchor || !anchor.quote) {
    return null;
  }
  const blocks = blocksOf(root);
  let best = null;
  blocks.forEach((block, index) => {
    if (anchor.block_tag && block.tagName.toLowerCase() !== anchor.block_tag) {
      return;
    }
    const text = block.textContent;
    let at = text.indexOf(anchor.quote);
    while (at >= 0) {
      const before = text.slice(Math.max(0, at - CONTEXT), at);
      const after = text.slice(at + anchor.quote.length, at + anchor.quote.length + CONTEXT);
      let score = 0;
      if (anchor.prefix && before.endsWith(anchor.prefix)) {
        score += 2;
      }
      if (anchor.suffix && after.startsWith(anchor.suffix)) {
        score += 2;
      }
      if (index === anchor.block_index) {
        score += 3;
      }
      if (!best || score > best.score) {
        best = { block, at, score };
      }
      at = text.indexOf(anchor.quote, at + 1);
    }
  });
  if (!best) {
    return null;
  }
  return rangeIn(best.block, best.at, best.at + anchor.quote.length);
}

// Wrap the range in spans that carry the group key. Returns the first span, or
// null when the range is empty. Text is split, never rebuilt, so inline markup
// inside the quote stays intact.
export function wrapRange(range, key) {
  const block = blockOf(range.startContainer);
  if (!block) {
    return null;
  }
  const start = textOffset(block, range.startContainer, range.startOffset);
  const end = textOffset(block, range.endContainer, range.endOffset);
  if (end <= start) {
    return null;
  }

  const nodes = [];
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let offset = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const length = node.nodeValue.length;
    if (offset + length > start && offset < end) {
      nodes.push({ node, start: offset, length });
    }
    offset += length;
  }

  let first = null;
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const { node, start: nodeStart, length } = nodes[index];
    const from = Math.max(0, start - nodeStart);
    const to = Math.min(length, end - nodeStart);
    if (to <= from) {
      continue;
    }
    let target = node;
    if (from > 0) {
      target = target.splitText(from);
    }
    if (to - from < target.nodeValue.length) {
      target.splitText(to - from);
    }
    const mark = document.createElement("span");
    mark.className = "cm-mark";
    mark.dataset.group = key;
    target.parentNode.insertBefore(mark, target);
    mark.appendChild(target);
    first = mark;
  }
  return first;
}
