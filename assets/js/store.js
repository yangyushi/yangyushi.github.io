// REST adapter for the counts and likes tables. Every request uses the
// publishable key. Row level security does the real work: visitors may insert
// rows, and one function returns the totals and this reader's like state.

const TIMEOUT_MS = 8000;

function endpoint(config, path) {
  return `${config.url}/rest/v1/${path}`;
}

async function request(config, path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(endpoint(config, path), {
      method: options.method || "GET",
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function insert(config, table, row) {
  const response = await request(config, table, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  // 409 means the row already exists: same reader and day for a view, or an
  // existing like. Both are a normal result, not an error.
  if (response.ok || response.status === 409) {
    return response.status === 409 ? "exists" : "created";
  }
  throw new Error(`${table} returned ${response.status}`);
}

export async function getPostState(config, slug, visitorId) {
  const response = await request(config, "rpc/post_state", {
    method: "POST",
    body: JSON.stringify({ p_slug: slug, p_visitor: visitorId }),
  });
  if (!response.ok) {
    throw new Error(`post_state returned ${response.status}`);
  }
  const state = await response.json();
  return {
    views: Number(state.views) || 0,
    likes: Number(state.likes) || 0,
    liked: Boolean(state.liked),
    comments: Number(state.comments) || 0,
  };
}

export async function listComments(config, slug) {
  const response = await request(config, "rpc/post_comments", {
    method: "POST",
    body: JSON.stringify({ p_slug: slug }),
  });
  if (!response.ok) {
    throw new Error(`post_comments returned ${response.status}`);
  }
  const rows = await response.json();
  return Array.isArray(rows)
    ? rows.map((row) => ({
        id: String(row.id),
        author: String(row.author),
        body: String(row.body),
        quote: row.quote === null ? null : String(row.quote),
        prefix: row.prefix === null ? null : String(row.prefix),
        suffix: row.suffix === null ? null : String(row.suffix),
        block_index: row.block_index === null ? null : Number(row.block_index),
        block_tag: row.block_tag === null ? null : String(row.block_tag),
        created_at: String(row.created_at),
        likes: Number(row.likes) || 0,
      }))
    : [];
}

export async function getCommentLikes(config, slug, visitorId) {
  const response = await request(config, "rpc/comment_like_state", {
    method: "POST",
    body: JSON.stringify({ p_slug: slug, p_visitor: visitorId }),
  });
  if (!response.ok) {
    throw new Error(`comment_like_state returned ${response.status}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows.map(String) : [];
}

// The database accepts these columns only. Local fields stay in the browser.
export function recordComment(config, comment) {
  return insert(config, "comments", {
    id: comment.id,
    post_slug: comment.post_slug,
    visitor_id: comment.visitor_id,
    author: comment.author,
    body: comment.body,
    quote: comment.quote,
    prefix: comment.prefix,
    suffix: comment.suffix,
    block_index: comment.block_index,
    block_tag: comment.block_tag,
  });
}

export function recordCommentLike(config, commentId, visitorId) {
  return insert(config, "comment_likes", {
    comment_id: commentId,
    visitor_id: visitorId,
  });
}

export function recordView(config, slug, visitorId) {
  return insert(config, "post_views", { post_slug: slug, visitor_id: visitorId });
}

export function recordLike(config, slug, visitorId) {
  return insert(config, "post_likes", { post_slug: slug, visitor_id: visitorId });
}
