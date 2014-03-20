//Dependent on Chunker

SEC3 = SEC3 || {};

SEC3.ShaderCreator = {};

/*
 * Returns a program to render with cascading shadows
 */
SEC3.ShaderCreator.renderCascShadowProg = function (gl, light) {

	var vsString = SEC3.Chunker.renderCascadedShadowMapsVS();
	var fsString = SEC3.Chunker.renderCascadedShadowMapsFS(gl, light);

	var shader = SEC3.createShaderProgram();

	shader.loadShaderFromStrings(gl, vsString, fsString);
	gl.useProgram( shader.ref() );
    //query the locations of shader parameters
    shader.aVertexPosLoc = gl.getAttribLocation( shader.ref(), "a_pos" );
    shader.aVertexNormalLoc = gl.getAttribLocation( shader.ref(), "a_normal" );
    shader.aVertexTexcoordLoc = gl.getAttribLocation( shader.ref(), "a_texcoord" );

    shader.uPerspLoc = gl.getUniformLocation( shader.ref(), "u_projection" );
    shader.uMVPLoc = gl.getUniformLocation( shader.ref(), "u_mvp" );
    shader.uSamplerLoc = gl.getUniformLocation( shader.ref(), "u_sampler");
    shader.uMLPLoc = gl.getUniformLocation( shader.ref(), "u_mlp");
    shader.uModelLightLoc = gl.getUniformLocation( shader.ref(), "u_modelLight");
    shader.uLPosLoc = gl.getUniformLocation( shader.ref(), "u_lPos" );
    shader.uCPosLoc = gl.getUniformLocation( shader.ref(), "u_cPos" );	    

    shader.uCascadeLocs = [];
    shader.uClipPlaneLocs = [];
    shader.uCascadePerspLocs = [];
    for(var i = 0; i < light.numCascades; i++ ){
        shader.uCascadeLocs[i] = gl.getUniformLocation( shader.ref(), "u_shadowMap" + i);
        shader.uClipPlaneLocs[i] = gl.getUniformLocation( shader.ref(), "u_clipPlane" + i);
        shader.uCascadePerspLocs[i] = gl.getUniformLocation( shader.ref(), "u_cascadePersp" + i);
        gl.uniform2f(shader.uClipPlaneLocs[i], 
        			 light.cascadeClips[i][NEAR_PLANE], 
        			 light.cascadeClips[i][FAR_PLANE] );
        gl.uniformMatrix4fv(shader.uCascadePerspLocs[i], false, light.cascadePerspectives[i] );
    }	

    return shader;
}