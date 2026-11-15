import { storage, visitorId } from "./visitor.js";

async function init() {
  const statsRoot = document.querySelector(".post-stats");
  const mount = document.querySelector("[data-post-comments]");
  if (!statsRoot && !mount) {
    return;
  }

  const store = storage();
  const reader = visitorId(store);
  const slug =
    (statsRoot && statsRoot.dataset.postSlug) ||
    (mount && mount.dataset.postSlug) ||
    window.location.pathname;

  let siteConfig;
  let api;
  let comments;
  try {
    const version = new URL(import.meta.url).search;
    siteConfig = await import(`./supabase-config.js${version}`);
    api = await import(`./store.js${version}`);
    comments = await import(`./comments.js${version}`);
  } catch (error) {
    if (statsRoot) {
      statsRoot.hidden = false;
      const line = statsRoot.querySelector(".post-stats-line");
      if (line) {
        line.hidden = true;
      }
      const note = statsRoot.querySelector(".post-stats-error");
      if (note) {
        note.hidden = false;
      }
    }
    return;
  }

  const settings = {
    url: siteConfig.SUPABASE_URL || "",
    key: siteConfig.SUPABASE_PUBLISHABLE_KEY || "",
  };
  if (!settings.url || !settings.key || !slug) {
    return;
  }

  if (statsRoot) {
    const line = statsRoot.querySelector(".post-stats-line");
    const errorNote = statsRoot.querySelector(".post-stats-error");
    const views = statsRoot.querySelector(".stat-views");
    const likes = statsRoot.querySelector(".stat-likes");
    const button = statsRoot.querySelector(".like-button");
    const heart = statsRoot.querySelector(".like-heart");
    const commentCount = statsRoot.querySelector(".stat-comments");
    const commentLabel = statsRoot.querySelector(".stat-comments-label");
    const commentWrap = statsRoot.querySelector(".stat-comments-wrap");

    const showError = () => {
      statsRoot.hidden = false;
      line.hidden = true;
      errorNote.hidden = false;
    };

    const showStats = (state) => {
      statsRoot.hidden = false;
      views.textContent = String(state.views);
      likes.textContent = String(state.likes);
      if (commentCount) {
        commentCount.textContent = String(state.comments);
      }
      if (commentLabel) {
        commentLabel.textContent = state.comments === 1 ? "comment" : "comments";
      }
      if (commentWrap) {
        commentWrap.hidden = state.comments === 0;
      }
      errorNote.hidden = true;
      line.hidden = false;
    };

    const markLiked = (liked) => {
      button.setAttribute("aria-pressed", liked ? "true" : "false");
      button.setAttribute("aria-label", liked ? "You liked this page" : "Like this page");
      button.disabled = liked;
      if (heart) {
        heart.textContent = liked ? "\u2764\uFE0F" : "\u{1F90D}";
      }
    };

    let state = null;
    try {
      await api.recordView(settings, slug, reader);
      state = await api.getPostState(settings, slug, reader);
      showStats(state);
      markLiked(state.liked);
    } catch (error) {
      showError();
    }

    let busy = false;
    button.addEventListener("click", async () => {
      if (busy) {
        return;
      }
      busy = true;
      const before = Number(likes.textContent) || 0;
      markLiked(true);
      likes.textContent = String(before + 1);
      try {
        await api.recordLike(settings, slug, reader);
      } catch (error) {
        markLiked(false);
        likes.textContent = String(before);
      } finally {
        busy = false;
      }
    });
  }

  if (mount) {
    try {
      await comments.mountComments({
        mount,
        slug,
        config: settings,
        api,
        store,
        reader,
      });
    } catch (error) {
      console.error("comments failed", error);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
