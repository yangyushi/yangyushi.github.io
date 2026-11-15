// Comments for one page: text anchors, margin cards, the composer, and the
// page-comment section. The database holds approved comments; this module
// holds nothing that cannot be lost, except the writer's own pending copies.

import { capture, locate, wrapRange } from "./anchor.js";
import { uuid4 } from "./visitor.js";

const PENDING_KEY = "blog-comment-pending";
const NAME_KEY = "blog-comment-name";
const LAST_KEY = "blog-comment-last";
const THROTTLE_MS = 30000;
const MAX_PENDING = 20;
const RAIL_WIDTH = 200;
const NARROW = 800;
const BUBBLE_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
  '<path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" fill="none" stroke="currentColor" ' +
  'stroke-width="1.4" stroke-linejoin="round"/></svg>';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function dateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(date);
}

function readPending(store, slug) {
  try {
    const all = JSON.parse(store.getItem(PENDING_KEY) || "[]");
    return (Array.isArray(all) ? all : []).filter((row) => row && row.post_slug === slug);
  } catch (error) {
    return [];
  }
}

function rememberPending(store, slug, item) {
  try {
    const all = JSON.parse(store.getItem(PENDING_KEY) || "[]");
    const rows = Array.isArray(all) ? all : [];
    const others = rows.filter((row) => row && row.post_slug !== slug);
    const list = rows.filter((row) => row && row.post_slug === slug && row.id !== item.id);
    list.push(item);
    store.setItem(PENDING_KEY, JSON.stringify(others.concat(list.slice(-MAX_PENDING))));
  } catch (error) {
    // Storage is optional. The comment is already on the server.
  }
}

function buildUi(mount) {
  const section = element("section", "cm-section");
  const head = element("header", "cm-section-head");
  head.append(element("h2", "cm-heading", "Comments"));
  const pageButton = element("button", "cm-button cm-page-button");
  pageButton.type = "button";
  pageButton.innerHTML = `${BUBBLE_ICON}<span>Comment on this page</span>`;
  head.append(pageButton);
  const list = element("div", "cm-list");
  const note = element("p", "cm-note", "Comments are unavailable right now.");
  note.hidden = true;
  section.append(head, list, note);
  mount.append(section);

  const rail = element("div", "cm-rail");
  rail.hidden = true;
  document.body.append(rail);

  const add = element("button", "cm-add");
  add.type = "button";
  add.innerHTML = `${BUBBLE_ICON}<span>Comment</span>`;
  add.hidden = true;
  document.body.append(add);

  const composer = element("dialog", "cm-composer");
  composer.setAttribute("aria-label", "Add a comment");
  composer.innerHTML = `
    <p class="cm-quote" hidden></p>
    <form class="cm-form" novalidate>
      <input class="cm-name" maxlength="60" placeholder="Name" autocomplete="nickname">
      <textarea class="cm-text" maxlength="600" rows="3" placeholder="Write a comment"></textarea>
      <p class="cm-status" role="status" hidden></p>
      <div class="cm-actions">
        <button type="button" class="cm-button cm-cancel">Cancel</button>
        <button type="submit" class="cm-button cm-send">Send</button>
      </div>
    </form>`;
  document.body.append(composer);

  const sheet = element("dialog", "cm-sheet");
  sheet.setAttribute("aria-label", "Comments");
  sheet.innerHTML = `
    <div class="cm-sheet-head">
      <button type="button" class="cm-close" aria-label="Close">×</button>
    </div>
    <div class="cm-sheet-body"></div>`;
  document.body.append(sheet);

  return {
    section,
    list,
    note,
    pageButton,
    rail,
    add,
    composer,
    sheet,
    sheetBody: sheet.querySelector(".cm-sheet-body"),
    quote: composer.querySelector(".cm-quote"),
    form: composer.querySelector(".cm-form"),
    name: composer.querySelector(".cm-name"),
    text: composer.querySelector(".cm-text"),
    status: composer.querySelector(".cm-status"),
    send: composer.querySelector(".cm-send"),
    cancel: composer.querySelector(".cm-cancel"),
    close: sheet.querySelector(".cm-close"),
  };
}

export async function mountComments({ mount, slug, config, api, store, reader }) {
  if (!mount || mount.dataset.mounted === "true") {
    return;
  }
  mount.dataset.mounted = "true";

  const root =
    mount.closest("article.post") ||
    document.getElementById("quarto-document-content") ||
    mount.closest("main") ||
    mount.closest("article");
  if (!root) {
    return;
  }

  const ui = buildUi(mount);
  const state = { items: [], liked: new Set(), groups: [], lastAnchor: null, lastRect: null };

  function clearMarks() {
    root.querySelectorAll(".cm-mark").forEach((mark) => {
      const parent = mark.parentNode;
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize();
    });
  }

  function likeButton(item) {
    const button = element("button", "cm-like like-button");
    button.type = "button";
    const heart = element("span", "like-heart");
    const count = element("span", "cm-likes", String(item.likes || 0));
    button.append(heart, count);

    const apply = (liked, total) => {
      heart.textContent = liked ? "\u2764\uFE0F" : "\u{1F90D}";
      count.textContent = String(total);
      button.disabled = liked;
      button.setAttribute("aria-pressed", liked ? "true" : "false");
      button.setAttribute("aria-label", liked ? "You liked this comment" : "Like this comment");
    };
    apply(state.liked.has(item.id), item.likes || 0);

    button.addEventListener("click", async () => {
      if (button.disabled) {
        return;
      }
      const before = Number(item.likes) || 0;
      button.disabled = true;
      apply(true, before + 1);
      try {
        await api.recordCommentLike(config, item.id, reader);
        state.liked.add(item.id);
        item.likes = before + 1;
      } catch (error) {
        item.likes = before;
        apply(false, before);
      }
    });
    return button;
  }

  function commentBlock(item) {
    const block = element("div", "cm-comment");
    block.append(element("p", "cm-body", item.body));

    const meta = element("footer", "cm-meta");
    meta.append(element("span", "cm-author", item.author));
    meta.append(element("span", "cm-sep", "·"));
    const time = element("time", "cm-time", dateLabel(item.created_at));
    time.dateTime = item.created_at;
    meta.append(time);
    if (!item.pending) {
      meta.append(likeButton(item));
    }
    block.append(meta);
    if (item.pending) {
      block.append(element("p", "cm-pending", "Awaiting approval"));
    }
    return block;
  }

  function cardFor(items, options = {}) {
    const card = element("article", "cm-card");
    if (options.quote && items[0].quote) {
      card.append(element("blockquote", "cm-quote", items[0].quote));
    }
    items.forEach((item) => card.append(commentBlock(item)));
    if (options.orphan) {
      card.append(element("p", "cm-note", "The text moved. This comment still stands."));
    }
    return card;
  }

  function render() {
    clearMarks();
    ui.list.replaceChildren();
    ui.rail.replaceChildren();
    state.groups = [];

    const groups = new Map();
    const page = [];
    const orphans = [];
    for (const item of state.items) {
      if (!item.quote) {
        page.push(item);
        continue;
      }
      const range = locate(root, item);
      if (!range) {
        item.missing = true;
        orphans.push(item);
        continue;
      }
      const key = [item.block_index, item.quote, item.prefix, item.suffix].join("\u0000");
      if (!groups.has(key)) {
        groups.set(key, { key, items: [], range });
      }
      groups.get(key).items.push(item);
    }

    for (const group of groups.values()) {
      group.mark = wrapRange(group.range, group.key);
      if (!group.mark) {
        group.items.forEach((item) => {
          item.missing = true;
          orphans.push(item);
        });
        continue;
      }
      group.card = cardFor(group.items);
      ui.rail.append(group.card);
      state.groups.push(group);
    }

    page
      .concat(orphans)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .forEach((item) =>
        ui.list.append(cardFor([item], { quote: true, orphan: item.missing === true }))
      );
  }

  function placeRail() {
    const rect = root.getBoundingClientRect();
    const article = mount.closest("article.post");
    // A notebook keeps its table of contents on the right, so its comments
    // take the left margin instead.
    const rightBusy = !article && document.getElementById("TOC") !== null;
    const roomRight = window.innerWidth - rect.right;
    const roomLeft = rect.left;
    let left = null;
    if (!rightBusy && roomRight >= RAIL_WIDTH + 26) {
      left = rect.right + 26;
    } else if (rightBusy && roomLeft >= RAIL_WIDTH + 26) {
      left = rect.left - RAIL_WIDTH - 26;
    }
    const visible = left !== null && rect.height > 0;
    ui.rail.hidden = !visible;
    if (!visible) {
      return;
    }
    ui.rail.style.left = `${left + window.scrollX}px`;
    ui.rail.style.top = `${rect.top + window.scrollY}px`;
    ui.rail.style.width = `${RAIL_WIDTH}px`;

    let last = 0;
    for (const group of state.groups) {
      if (!group.card) {
        continue;
      }
      const top = group.mark.getBoundingClientRect().top - rect.top;
      const y = Math.max(top, last + 8);
      group.card.style.top = `${y}px`;
      last = y + group.card.offsetHeight;
    }
  }

  let frame = 0;
  function scheduleRail() {
    if (frame) {
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      placeRail();
    });
  }

  function openSheet(items) {
    ui.sheetBody.replaceChildren();
    ui.sheetBody.append(cardFor(items, { quote: true }));
    if (!ui.sheet.open) {
      ui.sheet.showModal();
    }
  }

  function openComposer(anchor, rect) {
    state.lastAnchor = anchor;
    ui.quote.hidden = !anchor;
    ui.quote.textContent = anchor ? `“${anchor.quote}”` : "";
    ui.name.value = store.getItem(NAME_KEY) || "";
    ui.text.value = "";
    ui.status.hidden = true;
    ui.send.disabled = false;
    ui.composer.classList.toggle("cm-bottom", window.innerWidth <= NARROW);
    if (window.innerWidth > NARROW) {
      const left = rect ? rect.left : window.innerWidth / 2 - 180;
      const top = rect ? rect.bottom + 10 : 140;
      ui.composer.style.left = `${Math.max(8, Math.min(left, window.innerWidth - 376))}px`;
      ui.composer.style.top = `${Math.max(8, Math.min(top, window.innerHeight - 280))}px`;
    } else {
      ui.composer.style.left = "";
      ui.composer.style.top = "";
    }
    if (!ui.composer.open) {
      ui.composer.showModal();
    }
    setTimeout(() => ui.text.focus(), 0);
  }

  function hideAdd() {
    ui.add.hidden = true;
  }

  function trackSelection() {
    if (ui.composer.open || ui.sheet.open) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      hideAdd();
      return;
    }
    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      hideAdd();
      return;
    }
    const anchor = capture(root, range);
    if (!anchor) {
      hideAdd();
      return;
    }
    const rects = range.getClientRects();
    const end = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
    state.lastAnchor = anchor;
    state.lastRect = end;
    ui.add.hidden = false;
    ui.add.style.left = `${Math.max(8, Math.min(end.right + 6, window.innerWidth - 120))}px`;
    ui.add.style.top = `${Math.min(end.bottom + 8, window.innerHeight - 48)}px`;
  }

  let selectionTimer = 0;
  document.addEventListener("selectionchange", () => {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(trackSelection, 150);
  });
  window.addEventListener("scroll", hideAdd, { passive: true });

  ui.add.addEventListener("mousedown", (event) => event.preventDefault());
  ui.add.addEventListener("click", () => {
    if (!state.lastAnchor) {
      return;
    }
    openComposer(state.lastAnchor, state.lastRect);
    hideAdd();
  });

  ui.pageButton.addEventListener("click", () => openComposer(null, null));
  ui.cancel.addEventListener("click", () => ui.composer.close());
  ui.close.addEventListener("click", () => ui.sheet.close());
  ui.composer.addEventListener("click", (event) => {
    if (event.target === ui.composer) {
      ui.composer.close();
    }
  });
  ui.sheet.addEventListener("click", (event) => {
    if (event.target === ui.sheet) {
      ui.sheet.close();
    }
  });

  root.addEventListener("click", (event) => {
    const mark = event.target.closest(".cm-mark");
    if (!mark) {
      return;
    }
    const group = state.groups.find((entry) => entry.key === mark.dataset.group);
    if (!group) {
      return;
    }
    if (!ui.rail.hidden && group.card) {
      group.card.classList.add("cm-card-active");
      group.card.scrollIntoView({ block: "nearest" });
      setTimeout(() => group.card.classList.remove("cm-card-active"), 1200);
    } else {
      openSheet(group.items);
    }
  });

  ui.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (ui.send.disabled) {
      return;
    }
    const author = ui.name.value.trim();
    const body = ui.text.value.trim();
    if (!author) {
      ui.name.focus();
      return;
    }
    if (!body) {
      ui.text.focus();
      return;
    }
    if (Date.now() - (Number(store.getItem(LAST_KEY)) || 0) < THROTTLE_MS) {
      ui.status.textContent = "Please wait a moment.";
      ui.status.hidden = false;
      return;
    }

    const anchor = state.lastAnchor;
    const item = {
      id: uuid4(),
      post_slug: slug,
      visitor_id: reader,
      author,
      body,
      quote: anchor ? anchor.quote : null,
      prefix: anchor ? anchor.prefix : null,
      suffix: anchor ? anchor.suffix : null,
      block_index: anchor ? anchor.block_index : null,
      block_tag: anchor ? anchor.block_tag : null,
      created_at: new Date().toISOString(),
      likes: 0,
      pending: true,
    };

    ui.send.disabled = true;
    ui.status.textContent = "Sending…";
    ui.status.hidden = false;
    try {
      await api.recordComment(config, item);
    } catch (error) {
      ui.status.textContent = "Could not send. Try again.";
      ui.send.disabled = false;
      return;
    }

    store.setItem(NAME_KEY, author);
    store.setItem(LAST_KEY, String(Date.now()));
    rememberPending(store, slug, item);
    state.items.push(item);
    ui.composer.close();
    render();
    scheduleRail();
  });

  let failed = false;
  try {
    const [comments, liked] = await Promise.all([
      api.listComments(config, slug),
      api.getCommentLikes(config, slug, reader),
    ]);
    const approved = new Set(comments.map((item) => item.id));
    state.items = comments.concat(
      readPending(store, slug).filter((item) => !approved.has(item.id)).map((item) => ({ ...item, pending: true }))
    );
    state.liked = new Set(liked);
  } catch (error) {
    failed = true;
    state.items = readPending(store, slug).map((item) => ({ ...item, pending: true }));
  }
  if (failed) {
    ui.note.hidden = false;
  }

  render();
  scheduleRail();
  window.addEventListener("resize", scheduleRail);
  if ("ResizeObserver" in window) {
    new ResizeObserver(scheduleRail).observe(root);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleRail);
  }
}
