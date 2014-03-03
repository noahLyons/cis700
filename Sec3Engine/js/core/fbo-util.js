//A wrapper for creating framebuffer objects

//CIS700WEBGLCORE is a core function interface
var CIS700WEBGLCORE = CIS700WEBGLCORE || {};

CIS700WEBGLCORE.createFBO = function(){
    "use strict"

     var textures = [];
     var depthTex = null;
     var fbo = null;

     function init( gl, width, height ){
     	gl.getExtension( "OES_texture_float" );
     	gl.getExtension( "OES_texture_float_linear" );
     	var extDrawBuffers = gl.getExtension( "WEBGL_draw_buffers");
     	var extDepthTex = gl.getExtension( "WEBGL_depth_texture" );

     	if( !extDepthTex || !extDrawBuffers ){
     		alert("Depth texture extension unavailable on your browser!");
     		return false;
     	}

     	//Create depth texture 
     	depthTex = gl.createTexture();
     	gl.bindTexture( gl.TEXTURE_2D, depthTex );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);

        //Create textures for FBO attachment
        for( var i = 0; i < 4; ++i ){
        	textures[i] = gl.createTexture()
        	gl.bindTexture( gl.TEXTURE_2D,  textures[i] );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // TODO nearest?
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);        	
        }

        //Create FBO
        fbo = gl.createFramebuffer();
        gl.bindFramebuffer( gl.FRAMEBUFFER, fbo );

        //Create render target;
        var drawbuffers = [];
        drawbuffers[0] = extDrawBuffers.COLOR_ATTACHMENT0_WEBGL;
        drawbuffers[1] = extDrawBuffers.COLOR_ATTACHMENT1_WEBGL;
        drawbuffers[2] = extDrawBuffers.COLOR_ATTACHMENT2_WEBGL;
        drawbuffers[3] = extDrawBuffers.COLOR_ATTACHMENT3_WEBGL;
        extDrawBuffers.drawBuffersWEBGL( drawbuffers );

        //Attach textures to FBO
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0 );
        gl.framebufferTexture2D( gl.FRAMEBUFFER, drawbuffers[0], gl.TEXTURE_2D, textures[0], 0 );
        gl.framebufferTexture2D( gl.FRAMEBUFFER, drawbuffers[1], gl.TEXTURE_2D, textures[1], 0 );
        gl.framebufferTexture2D( gl.FRAMEBUFFER, drawbuffers[2], gl.TEXTURE_2D, textures[2], 0 );
        gl.framebufferTexture2D( gl.FRAMEBUFFER, drawbuffers[3], gl.TEXTURE_2D, textures[3], 0 );

        var FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if( FBOstatus !== gl.FRAMEBUFFER_COMPLETE ){
            console.log( "FBO incomplete! Initialization failed!" );
            return false;
        }
        gl.bindFramebuffer( gl.FRAMEBUFFER, null );
        gl.bindTexture( gl.TEXTURE_2D, null );
        return true;
     }

    return {
        ref: function(){
        	return fbo;
        },
        initialize: function( gl, width, height ){
            return init( gl, width, height );
        },
        bind: function(gl){
            gl.bindFramebuffer( gl.FRAMEBUFFER, fbo );
        },
        unbind: function(gl){
            gl.bindFramebuffer( gl.FRAMEBUFFER, null );
        },
        texture: function(i){
            return textures[i];
        },
        depthTexture: function(){
            return depthTex; 
        },
        ///// The following 3 functions should be implemented for all objects
        ///// whose resources are retrieved asynchronously
        isReady: function(){
        	var isReady = ready;
            for( var i = 0; i < textures.length; ++i ){
                isReady &= textures[i].ready;
            }
            console.log( isReady );
            return isReady;
        },
        addCallback: function( functor ){
            callbackFunArray[callbackFunArray.length] = functor;
        },
        executeCallBackFunc: function(){
            var i;
            for( i = 0; i < callbackFunArray.length; ++i ){
                callbackFunArray[i]();
            }
        }       
    };

};

