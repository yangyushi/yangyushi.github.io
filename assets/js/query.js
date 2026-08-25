document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("search");
    const resultList = document.getElementById("searchResults");

    if (!input || !resultList) {
        return;
    }

    const MAX_RESULTS = 6;
    const LOADING_DELAY_MS = 150;
    const searchVersion = input.dataset.searchVersion || "1";

    let pagefindPromise;
    let manifestPromise;
    let loadingTimer;
    let requestId = 0;

    const loadPagefind = () => {
        pagefindPromise ??= import("/pagefind/pagefind.js").then(async (pagefind) => {
            await pagefind.options({
                excerptLength: 24,
                metaCacheTag: searchVersion,
            });
            await pagefind.init();
            return pagefind;
        }).catch((error) => {
            pagefindPromise = undefined;
            throw error;
        });
        return pagefindPromise;
    };

    const loadManifest = () => {
        manifestPromise ??= fetch(`/assets/search-manifest.json?v=${searchVersion}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Search manifest returned ${response.status}`);
                }
                return response.json();
            })
            .catch((error) => {
                manifestPromise = undefined;
                throw error;
            });
        return manifestPromise;
    };

    const clearLoadingTimer = () => {
        if (loadingTimer) {
            clearTimeout(loadingTimer);
            loadingTimer = undefined;
        }
    };

    const clearResults = () => {
        clearLoadingTimer();
        resultList.replaceChildren();
    };

    const showMessage = (message) => {
        const item = document.createElement("li");
        item.className = "search-message";
        item.textContent = message;
        resultList.replaceChildren(item);
        resultList.style.display = "block";
    };

    const appendSafeExcerpt = (target, excerptHtml) => {
        const template = document.createElement("template");
        template.innerHTML = excerptHtml;

        const appendNode = (node, parent) => {
            if (node.nodeType === Node.TEXT_NODE) {
                parent.append(document.createTextNode(node.textContent));
                return;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return;
            }

            const nextParent = node.tagName === "MARK"
                ? parent.appendChild(document.createElement("mark"))
                : parent;
            node.childNodes.forEach((child) => appendNode(child, nextParent));
        };

        template.content.childNodes.forEach((node) => appendNode(node, target));
    };

    const createResultItem = (result, includeExcerpt = true) => {
        const item = document.createElement("li");
        item.className = "search-result";

        const link = document.createElement("a");
        link.href = result.meta?.url || result.url;

        const heading = document.createElement("span");
        heading.className = "search-result-heading";

        const title = document.createElement("span");
        title.className = "search-result-title";
        title.textContent = result.meta?.title || result.title || result.url;

        const type = document.createElement("span");
        type.className = "search-result-type";
        const resultType = result.meta?.type || result.type || "Post";
        type.dataset.type = resultType.toLowerCase();
        type.textContent = resultType === "Notebook" ? "Note" : resultType;

        heading.append(title, type);
        link.append(heading);

        if (includeExcerpt && result.excerpt) {
            const excerpt = document.createElement("p");
            excerpt.className = "search-result-excerpt";
            appendSafeExcerpt(excerpt, result.excerpt);
            link.append(excerpt);
        }

        item.append(link);
        return item;
    };

    const displayResults = (results) => {
        if (results.length === 0) {
            showMessage("Sorry, no articles matched your search.");
            return;
        }

        resultList.replaceChildren(...results.map((result) => createResultItem(result)));
        resultList.style.display = "block";
    };

    const displayAllItems = (manifest) => {
        const groups = [
            ["Posts", manifest.posts || []],
            ["Notebooks", manifest.notebooks || []],
        ];
        const items = [];

        groups.forEach(([label, entries]) => {
            const heading = document.createElement("li");
            heading.className = "search-group-title";
            heading.textContent = label;
            items.push(heading);

            entries.forEach((entry) => {
                items.push(createResultItem(entry, false));
            });
        });

        resultList.replaceChildren(...items);
        resultList.style.display = "block";
    };

    const search = async () => {
        const query = input.value.trim();
        const currentRequest = ++requestId;

        clearLoadingTimer();
        if (!query) {
            clearResults();
            return;
        }

        loadingTimer = setTimeout(() => {
            if (currentRequest === requestId) {
                showMessage("Searching…");
            }
        }, LOADING_DELAY_MS);

        try {
            if (query === "*") {
                const manifest = await loadManifest();
                if (currentRequest === requestId) {
                    clearLoadingTimer();
                    displayAllItems(manifest);
                }
                return;
            }

            const pagefind = await loadPagefind();
            const response = await pagefind.debouncedSearch(query, {}, 150);

            if (!response || currentRequest !== requestId) {
                return;
            }

            const results = await Promise.all(
                response.results.slice(0, MAX_RESULTS).map((result) => result.data())
            );

            if (currentRequest === requestId) {
                clearLoadingTimer();
                displayResults(results);
            }
        } catch (error) {
            console.error("Search failed", error);
            if (currentRequest === requestId) {
                clearLoadingTimer();
                showMessage("Search is temporarily unavailable.");
            }
        }
    };

    const connection = navigator.connection
        || navigator.mozConnection
        || navigator.webkitConnection;
    if (!connection?.saveData) {
        const warmSearch = () => loadPagefind().catch(() => {});
        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(warmSearch, { timeout: 2000 });
        } else {
            setTimeout(warmSearch, 1000);
        }
    }

    input.addEventListener("focus", () => {
        resultList.style.display = "block";
        loadPagefind().catch(() => {});
    });
    input.addEventListener("input", search);
    input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            input.value = "";
            ++requestId;
            clearResults();
            resultList.style.display = "none";
            input.blur();
        }
    });

    document.addEventListener("pointerdown", (event) => {
        if (event.target !== input && !resultList.contains(event.target)) {
            resultList.style.display = "none";
        }
    });
});
