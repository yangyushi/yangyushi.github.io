// Build the table of contents from the post headings.
// One list feeds the desktop rail and the mobile disclosure.
(function () {
  const article = document.querySelector(".post");
  const rail = document.getElementById("side_toc");
  const sidebar = document.getElementById("side_bar");
  const mobile = document.querySelector(".toc-mobile");
  const mobileBody = mobile && mobile.querySelector(".toc-body");
  const mobileCount = mobile && mobile.querySelector(".toc-count");
  if (!article || !rail) {
    return;
  }

  document.querySelectorAll("#markdown-toc").forEach((old) => old.remove());

  const headings = Array.from(article.querySelectorAll("h2:not(.cm-heading), h3:not(.cm-heading)"));
  if (!headings.length) {
    if (sidebar) {
      sidebar.remove();
    }
    if (mobile) {
      mobile.remove();
    }
    return;
  }

  const used = new Set(Array.from(document.querySelectorAll("[id]"), (el) => el.id));
  const slug = (text) => {
    const base = text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .slice(0, 60) || "section";
    let candidate = base;
    let n = 2;
    while (used.has(candidate)) {
      candidate = base + "-" + n;
      n += 1;
    }
    used.add(candidate);
    return candidate;
  };

  headings.forEach((heading) => {
    if (!heading.id) {
      heading.id = slug(heading.textContent || "");
    }
  });

  const root = document.createElement("ul");
  let group = null;

  headings.forEach((heading) => {
    const link = document.createElement("a");
    link.href = "#" + heading.id;
    link.textContent = (heading.textContent || "").trim();
    link.dataset.target = heading.id;

    const item = document.createElement("li");

    if (heading.tagName === "H2") {
      const row = document.createElement("div");
      row.className = "toc-row";
      row.append(link);
      item.className = "toc-h2";
      item.append(row);
      root.append(item);
      group = { item, row, sub: null };
      return;
    }

    if (!group) {
      item.append(link);
      root.append(item);
      return;
    }

    if (!group.sub) {
      const sub = document.createElement("ul");
      sub.className = "toc-sub";
      sub.hidden = true;
      group.item.append(sub);
      group.sub = sub;

      const owner = group;
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "toc-toggle";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Expand subsections");
      toggle.textContent = "+";
      group.row.append(toggle);
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        toggle.setAttribute("aria-label", expanded ? "Expand subsections" : "Collapse subsections");
        toggle.textContent = expanded ? "+" : "\u2212";
        owner.sub.hidden = expanded;
      });
    }

    const subItem = document.createElement("li");
    subItem.append(link);
    group.sub.append(subItem);
  });

  rail.replaceChildren(root);

  if (mobile && mobileBody) {
    const clone = root.cloneNode(true);
    clone.querySelectorAll(".toc-sub").forEach((sub) => sub.remove());
    clone.querySelectorAll(".toc-toggle").forEach((button) => button.remove());
    clone.querySelectorAll(".toc-row").forEach((row) => {
      const link = row.querySelector("a");
      if (link) {
        row.replaceWith(link);
      }
    });
    mobileBody.replaceChildren(clone);
    const topLevel = headings.filter((heading) => heading.tagName === "H2").length || headings.length;
    if (mobileCount) {
      mobileCount.textContent = topLevel + (topLevel === 1 ? " section" : " sections");
    }
  }

  const links = Array.from(rail.querySelectorAll("a"));
  const byId = new Map(links.map((link) => [link.dataset.target, link]));
  const anchors = headings.filter((heading) => heading.tagName === "H2");
  const activeHeadings = anchors.length ? anchors : headings;
  let ticking = false;

  const update = () => {
    ticking = false;
    const line = window.scrollY + 140;
    let current = null;
    activeHeadings.forEach((heading) => {
      const top = heading.getBoundingClientRect().top + window.scrollY;
      if (top <= line) {
        current = heading;
      }
    });
    links.forEach((link) => {
      link.classList.remove("is-active");
      link.removeAttribute("aria-current");
    });
    if (!current && activeHeadings.length) {
      current = activeHeadings[0];
    }
    if (current) {
      const active = byId.get(current.id);
      if (active) {
        active.classList.add("is-active");
        active.setAttribute("aria-current", "location");
      }
    }
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    },
    { passive: true }
  );

  update();
})();
