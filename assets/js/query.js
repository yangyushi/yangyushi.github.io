let isOnSR = false;

document.getElementById("searchResults").addEventListener("mouseenter", function(  ) {isOnSR=true;});
document.getElementById("searchResults").addEventListener("mouseout", function(  ) {isOnSR=false;});


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
    if (isOnSR){
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
