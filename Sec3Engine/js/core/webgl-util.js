// By Cheng
//SEC3ENGINE is a core function interface
var SEC3ENGINE = SEC3ENGINE || {};

SEC3ENGINE.getWebGLContext = function( canvas, message ){

    var ctx = null;
    var names = [ "webgl", "experimental-webgl", "webkit-3d" ];
    if( !window.WebGLRenderingContext ){
        message.innerText = "The browser does not support WebGL.  Visit http://get.webgl.org.";
        return undefined;
    }
    for (var ii = 0; ii < names.length; ++ii) {
        try {
            ctx = canvas.getContext(names[ii]);
        } 
        catch(e) {}
        if (ctx) {
            break;
        }
    }

    if( !ctx ){
    	message.innerText = "browser supports WebGL but initialization failed.";
    }
    return ctx;
};

//
SEC3ENGINE.registerAsyncObj = function( gl, asyncObj ){
    if( !gl.asyncObjArray ){
        gl.asyncObjArray = [];
    }
    gl.asyncObjArray[gl.asyncObjArray.length] = asyncObj;
};

//Make sure all objects with asynchronously-requested resources are ready before starting the rendering loop
SEC3ENGINE.run = function(gl){
    var i;
    var n;

    n = gl.asyncObjArray.length;

    //check if resources are ready, one by one
    for( i = 0; i < gl.asyncObjArray.length; ++i ){
        if( gl.asyncObjArray[i].isReady() ){
            //Run object's registered callback functions
            gl.asyncObjArray[i].executeCallBackFunc();
            n -= 1;
        }
    }


    if( n === 0 ){
       SEC3ENGINE.renderLoop(); 
    }
    else{
        window.setTimeout( SEC3ENGINE.run, 500, gl );
    }
};
