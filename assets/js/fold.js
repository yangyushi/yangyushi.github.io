document.getElementById('btnBookmark').addEventListener('click', function() {
    var btn = document.getElementById('btnBookmark');
    if (btn.innerHTML == 'Bookmarks +') {
        btn.innerHTML = "Bookmarks -"
    } else {
        btn.innerHTML = "Bookmarks +"
    }
    var div = document.getElementById('divBookmark');
    if (div.style.display === 'none') {
        div.style.display = 'block';
    } else {
        div.style.display = 'none';
    }
});

document.getElementById('btnNews').addEventListener('click', function() {
    var btn = document.getElementById('btnNews');
    if (btn.innerHTML == 'Recent News +') {
        btn.innerHTML = "Recent News -"
    } else {
        btn.innerHTML = "Recent News +"
    }
    var div = document.getElementById('divNews');
    if (div.style.display === 'none') {
        div.style.display = 'block';
    } else {
        div.style.display = 'none';
    }
});

document.getElementById('btnNotebook').addEventListener('click', function() {
    var btn = document.getElementById('btnNotebook');
    if (btn.innerHTML == "Notebooks +") {
        btn.innerHTML = "Notebooks -"
    } else {
        btn.innerHTML = "Notebooks +"
    }
    var div = document.getElementById('divNotebook');
    if (div.style.display === 'none') {
        div.style.display = 'block';
    } else {
        div.style.display = 'none';
    }
});

