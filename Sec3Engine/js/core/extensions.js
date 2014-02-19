
SEC3ENGINE = SEC3ENGINE || {};

SEC3ENGINE.drawBuffersExt = SEC3ENGINE.drawBuffersExt || null;
SEC3ENGINE.extensions = {};

SEC3ENGINE.extensions.drawBuffers = function(gl){
	if (! SEC3ENGINE.drawBuffersExt) {
		try {
			SEC3ENGINE.drawBuffersExt = gl.getExtension("WEBGL_draw_buffers");
	        if(! SEC3ENGINE.drawBuffersExt){
	            alert("sorry, your browser does not support multiple draw buffers");
	        }
	        return SEC3ENGINE.drawBuffersExt;
	    }
	    catch (e) {
	    	alert("bad gl context given to extension manager");
	    	return null;
	    }
	}
	return SEC3ENGINE.drawBuffersExt;
};

SEC3ENGINE.depthTextureExt = SEC3ENGINE.depthTextureExt || null;

SEC3ENGINE.extensions.depthTexture = function(gl){
	if (! SEC3ENGINE.depthTextureExt) {
		try {
			SEC3ENGINE.depthTextureExt = gl.getExtension("WEBKIT_WEBGL_depth_texture");
	        if(! SEC3ENGINE.depthTextureExt){
	            alert("sorry, depth textures not implemented for this browser");
	        }
	        return SEC3ENGINE.depthTextureExt;
	    }
	    catch (e) {
	    	alert("bad gl context given to extension manager");
	    	return null;
	    }
	}
	return SEC3ENGINE.depthTextureExt;
};