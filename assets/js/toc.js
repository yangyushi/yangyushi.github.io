function moveTOC() {
    var toc = document.getElementById('markdown-toc');
    if (toc) {
        var side_toc = document.getElementById('side_bar');
        side_toc.innerHTML += ('<br><p><strong>Table of contents</strong></p>');
        side_toc.innerHTML += toc.innerHTML;
        toc.parentNode.removeChild(toc);
    }
}

if ( document.addEventListener ) { // Mozilla, Opera, Webkit
    document.addEventListener( 'DOMContentLoaded', function() {
        document.removeEventListener( 'DOMContentLoaded', arguments.callee, false);
        moveTOC();
    }, false );
} else if ( document.attachEvent ) { // If IE event model is used
    // ensure firing before onload
    document.attachEvent('onreadystatechange', function() {
        if ( document.readyState === 'complete' ) {
            document.detachEvent( 'onreadystatechange', arguments.callee );
            moveTOC();
        }
    });
}
