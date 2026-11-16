// Add a copy button to every code block in a post. The button sits beside the
// <pre>, not inside it, so it is never copied and never becomes a comment anchor.

const BLOCKS = ".post pre";

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    document.body.append(area);
    area.select();
    try {
      const ok = document.execCommand("copy");
      area.remove();
      if (ok) {
        resolve();
      } else {
        reject(new Error("copy failed"));
      }
    } catch (error) {
      area.remove();
      reject(error);
    }
  });
}

function addButtons() {
  document.querySelectorAll(BLOCKS).forEach((pre) => {
    if (pre.closest(".code-block")) {
      return;
    }
    const wrap = document.createElement("div");
    wrap.className = "code-block";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.append(pre);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code");
    wrap.append(button);

    let timer = 0;
    button.addEventListener("click", async () => {
      clearTimeout(timer);
      try {
        await copyText(pre.innerText);
        button.textContent = "Copied";
        button.setAttribute("aria-label", "Code copied");
      } catch (error) {
        button.textContent = "Failed";
        button.setAttribute("aria-label", "Copy failed");
      }
      timer = setTimeout(() => {
        button.textContent = "Copy";
        button.setAttribute("aria-label", "Copy code");
      }, 1600);
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", addButtons);
} else {
  addButtons();
}
