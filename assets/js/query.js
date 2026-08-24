document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("search");
    const resultList = document.getElementById("searchResults");

    if (!input || !resultList) {
        return;
    }

    let pagefindPromise;
    let requestId = 0;

    const loadPagefind = () => {
        pagefindPromise ??= import("/pagefind/pagefind.js").then(async (pagefind) => {
            await pagefind.options({ excerptLength: 20 });
            await pagefind.init();
            return pagefind;
        }).catch((error) => {
            pagefindPromise = undefined;
            throw error;
        });
        return pagefindPromise;
    };

    const clearResults = () => {
        resultList.replaceChildren();
    };

    const showMessage = (message) => {
        const item = document.createElement("li");
        item.textContent = message;
        resultList.replaceChildren(item);
        resultList.style.display = "block";
    };

    const displayResults = (results) => {
        if (results.length === 0) {
            showMessage("Sorry, no articles matched your search.");
            return;
        }

        const items = results.map((result) => {
            const item = document.createElement("li");
            const link = document.createElement("a");
            link.href = result.url;
            link.textContent = result.meta?.title || result.url;
            item.append(link);
            return item;
        });

        resultList.replaceChildren(...items);
        resultList.style.display = "block";
    };

    const search = async () => {
        const query = input.value.trim();
        const currentRequest = ++requestId;

        if (!query) {
            clearResults();
            return;
        }

        try {
            const pagefind = await loadPagefind();
            const listEverything = query === "*";
            const response = listEverything
                ? await pagefind.search(null)
                : await pagefind.debouncedSearch(query, {}, 150);

            if (!response || currentRequest !== requestId) {
                return;
            }

            const results = await Promise.all(
                (listEverything ? response.results : response.results.slice(0, 8))
                    .map((result) => result.data())
            );

            if (currentRequest === requestId) {
                displayResults(results);
            }
        } catch (error) {
            console.error("Search failed", error);
            if (currentRequest === requestId) {
                showMessage("Search is temporarily unavailable.");
            }
        }
    };

    input.addEventListener("focus", () => {
        resultList.style.display = "block";
        loadPagefind().catch(() => {});
    });
    input.addEventListener("input", search);
    input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            input.value = "";
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
