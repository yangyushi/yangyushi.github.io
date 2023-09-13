document.addEventListener("DOMContentLoaded", function() {
    var documents;
    fetch('assets/search_index.json')
        .then(response => response.json())
        .then(data => {
            documents = data;

            var idx = lunr(function() {
                this.ref('id');
                this.field('title');
                this.field('content');

                documents.forEach(function(doc) {
                    this.add(doc);
                }, this);
            });

            document.getElementById("search").addEventListener("keyup", function() {
                var query = this.value;
                var results = idx.search(query);
                displayResults(results, documents);
            });
        });
});

function displayResults(results, documents) {
    var output = '';
    if (results.length === 0) {
        output = "Sorry, no articles matched your search.";
    } else {
        results.forEach(result => {
            var item = documents.find(doc => doc.id === result.ref);
            output += `<li><a href="${item.id}">${item.title}</a><li>`;
        });
    }
    document.getElementById("searchResults").innerHTML = output;
}


document.getElementById('search').addEventListener('blur', function() {
    var obj = document.getElementById("searchResults")

    var is_selecting_article = false;
    for (let i = 0; i < obj.children.length; i++) {
        const child = obj.children[i];
        is_selecting_article = is_selecting_article || child.matches(":active");
    }
    if (is_selecting_article){
        obj.style.display = "block";
    } else {
        obj.style.display = "none";
    }
});

document.getElementById('search').addEventListener('focus', function() {
    var obj = document.getElementById("searchResults")
    if (obj.style.display == "none"){
        obj.style.display = "block";
    }
});
