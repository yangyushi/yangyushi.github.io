function foldTOC() {
    var toc = document.getElementById('markdown-toc-new');
    var toc_btn = document.getElementById('toc-btn');
    if (toc.style.display === "none") {
        toc.style.display = "block";
        toc_btn.innerHTML = "Hide TOC";
    } else {
        toc.style.display = "none";
        toc_btn.innerHTML = "Show TOC";
    }
}


function moveTOC() {
    var toc = document.getElementById('markdown-toc');
    if (toc) {
        var new_toc = toc.cloneNode(true);
        toc.parentNode.removeChild(toc);
        new_toc.id = 'markdown-toc-new'
        var side_toc = document.getElementById('side_bar');
        side_toc.innerHTML = '<div class="toc_click"> <a href="/">Back to Home</a> </div>';
        side_toc.innerHTML += '<div onclick="topFunction()" class="toc_click"> Back to Top </div>';
        side_toc.innerHTML += '<div onclick="foldTOC()" class="toc_click", id="toc-btn">Hide TOC</div>';
        side_toc.appendChild(new_toc);
    }
}

// When the user clicks on the button, scroll to the top of the document
function topFunction() {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

function addClick() {
    var toc = document.getElementById('markdown-toc-new');
    if (toc){
        var children = toc.children;
        for (var i = 0; i < children.length; i++){
            var child = children[i];
            if (child.children.length > 1){
                var to_click = document.createElement("span");
                to_click.innerHTML = '<span onclick="foldTOCList(this)" class="fold_click"> + </span>';
                to_click.id = child.children[0].id;
                child.insertBefore(to_click, child.children[1]);
            }
        }
    }
}

function autoFold() {
    var toc = document.getElementById('markdown-toc-new');
    if (toc){
        var children = toc.children;
        for (var i = 0; i < children.length; i++){
            var child = children[i];
            if (child.children.length > 1){
                var to_click = child.children[1].children[0];
                foldTOCList(to_click);
            }
        }
    }
}

function foldTOCList(clicked) {
    var to_fold = clicked.parentElement.parentElement.children[2];
    if (typeof to_fold == 'object' && to_fold != null){
        if (to_fold.style.display === "none") {
            to_fold.style.display = "block";
            clicked.innerHTML = ' - ';
        } else {
            to_fold.style.display = "none";
            clicked.innerHTML = ' + ';
        }
    }
}


if ( document.addEventListener ) { // Mozilla, Opera, Webkit
    document.addEventListener( 'DOMContentLoaded', function() {
        document.removeEventListener( 'DOMContentLoaded', arguments.callee, false);
        moveTOC();
        addClick();
        autoFold();
    }, false );
} else if ( document.attachEvent ) { // If IE event model is used
    // ensure firing before onload
    document.attachEvent('onreadystatechange', function() {
        if ( document.readyState === 'complete' ) {
            document.detachEvent( 'onreadystatechange', arguments.callee );
            moveTOC();
            addClick();
            autoFold();
        }
    });
}
