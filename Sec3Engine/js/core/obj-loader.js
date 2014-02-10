// By Cheng

//Loader for object models
// ...under construction

function readOBJFile( fileName, model ){
    var request = new XMLHttpRequest()

    request.onreadstatechange = function(){
    	if( request.readyState === 4 && request.status !== 404 ){
    		onReadOBJFile( request.responseText );
    	}
    }

    request.open( 'GET', fileName, true );
    request.send();
}