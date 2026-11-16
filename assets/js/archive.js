// Filter the archive by category without leaving the page.
(function () {
  const buttons = Array.from(document.querySelectorAll(".filter"));
  const rows = Array.from(document.querySelectorAll(".archive-list .post-row"));
  const groups = Array.from(document.querySelectorAll(".year-group"));
  if (!buttons.length || !rows.length) {
    return;
  }

  const categoryOf = (row) => row.dataset.category || "";
  const counts = { all: rows.length };
  rows.forEach((row) => {
    const key = categoryOf(row);
    counts[key] = (counts[key] || 0) + 1;
  });

  buttons.forEach((button) => {
    const count = button.querySelector(".count");
    const value = counts[button.dataset.filter];
    if (count) {
      count.textContent = value == null ? "" : String(value);
    }
  });

  const apply = (key, updateUrl) => {
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === key));
    });
    rows.forEach((row) => {
      row.hidden = key !== "all" && categoryOf(row) !== key;
    });
    groups.forEach((group) => {
      const visible = Array.from(group.querySelectorAll(".post-row")).some((row) => !row.hidden);
      group.hidden = !visible;
    });
    if (updateUrl) {
      const url = new URL(window.location.href);
      if (key === "all") {
        url.searchParams.delete("category");
      } else {
        url.searchParams.set("category", key);
      }
      window.history.replaceState(null, "", url);
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => apply(button.dataset.filter, true));
  });

  const initial = new URL(window.location.href).searchParams.get("category");
  if (initial && counts[initial]) {
    apply(initial, false);
  }
})();
