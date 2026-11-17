// Keep anchor targets clear of the sticky site header on notebook pages.
//
// Quarto's table of contents scrolls to the raw offsetTop of a heading and
// pushes it under the header. The rest of the site uses scroll-padding-top,
// which only applies to native fragment navigation, so the notebooks get this
// small correction instead.
(function () {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  const gap = 12;

  const scrollToId = (id, smooth) => {
    const target = document.getElementById(id);
    if (!target) {
      return false;
    }
    const top =
      target.getBoundingClientRect().top +
      window.scrollY -
      header.getBoundingClientRect().height -
      gap;
    window.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
    return true;
  };

  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest && event.target.closest('a[href^="#"]');
      if (!link) {
        return;
      }
      const href = link.getAttribute("href");
      if (!href || href.length < 2) {
        return;
      }
      const id = decodeURIComponent(href.slice(1));
      if (!scrollToId(id, true)) {
        return;
      }
      // Stop Quarto's own handler from scrolling again without the offset.
      event.preventDefault();
      event.stopPropagation();
      history.replaceState(null, "", href);
    },
    true
  );

  if (window.location.hash.length > 1) {
    const id = decodeURIComponent(window.location.hash.slice(1));
    window.requestAnimationFrame(() => scrollToId(id, false));
  }
})();
