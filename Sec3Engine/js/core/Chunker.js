var SEC3 = SEC3 || {};

SEC3.Chunker = {};

SEC3.Chunker.renderWithCascadedShadowMaps = function (gl, light) {
	var prefix = "" +
		"#extension GL_EXT_draw_buffers: require \n" +
		"precision highp float; \n" +
		"const float AMBIENT_INTENSITY = 0.03; \n" +
		"const float LIGHT_INTENSITY = 40.0; \n" +
		"const float SHADOW_FACTOR = 0.001; \n" +
		"const float BIAS = -0.005; \n" +
		"const float CASCADE_BIAS = 0.4; \n" +
		"const float offset = 2.5 / 1024.0; \n" +
		"const float increment = 1.0/ 1024.0; \n";
//--------------------------------------------------------------	
	var cascadeUniforms = "const float zNear = " + light.zNear + "; \n" + 
						  "const float zFar = " + light.zFar + "; \n";

		for(var i = 0; i < light.numCascades; i++ ) {
			cascadeUniforms += "uniform sampler2D u_shadowMap" + i + "; \n" +
								"const float offset" + i + " = 3.5 / float(" + light.cascadeFramebuffers[i].getWidth() + "); \n" +
								"const float increment" + i + " = 1.0 / float(" + light.cascadeFramebuffers[i].getWidth() + "); \n" +								
								"uniform vec2 u_clipPlane" + i + "; \n" +
								"uniform mat4 u_cascadePersp" + i + "; \n";
		}
		
	var postfix = "" +

//--------------------------------------------------------------

		"uniform sampler2D u_sampler; \n" +
		"uniform mat4 u_projection; \n" +
		"uniform mat4 u_modelLight; \n" +

		"varying vec4 v_pos; \n" +
		"varying vec3 v_normal; \n" +
		"varying vec2 v_texcoord; \n" +
		"varying float v_depth; \n" +
		"varying vec4 v_lightSpacePos; \n" +
		"varying vec4 v_modelLightPos; \n" +
		"varying vec3 v_worldToLight; \n" +
		"varying vec3 v_tSpaceNormal; \n" +

		"float linearizeDepth( float exp_depth, float near, float far) { \n" +
			
		"	return ( 2.0 * near ) / ( far + near - exp_depth * ( far - near ) ); \n" +
		"} \n" +

		"bool isValid( vec3 uv ) { \n" +
		"	bool result = false; \n" +
		"	if(uv.x <= 1.0 && uv.x >= 0.0 && uv.y <= 1.0 && uv.y >= 0.0 && uv.z <= 1.0 && uv.z >= 0.0){ \n" +
		"		result = true; \n" +
		"	} \n" +
		"	return result; \n" +
		"} \n" +
//--------------------------------------------------------------
		"/* \n" +
		" * Returns 1.0 if fragment is occluded, 0.0 if not \n" +
		" */ \n" +
		"float isOccluded(sampler2D shadowMap, float fragDepth, vec2 uv, vec2 clips){ \n" +
		"	vec2 spotUv = (uv - 0.5); \n" +
		"	float radius = sqrt(dot(spotUv, spotUv)); \n" +
		"	if( (radius) < 0.49){ \n" +
				
		"		float shadowMapDepth = linearizeDepth(texture2D( shadowMap, uv).r, clips.x, clips.y); \n" +
		"		return float(shadowMapDepth < fragDepth + (BIAS)); \n" +
		"	} \n" +
		"	return 1.0; \n" +
		"}	 \n" +

		"float averageLookups(float fragDepth, vec2 uv) { \n" +

		"	float sum = 0.0; \n" +
		"	float shadowMapDepth; \n";
		
		var cascadeSwitch = "";
		// for( var i = light.numCascades -1; i >=0; i-- ) {
		for( var i = 0; i < light.numCascades; i++) {
			if(i > 0) {
				cascadeSwitch += "	else";
			}
			cascadeSwitch += "	if(v_lightSpacePos.z < u_clipPlane" + i +".y - CASCADE_BIAS) { \n" +
		"		vec4 cascadePos = u_cascadePersp" + i + " * v_modelLightPos; \n" +
		"		cascadePos.xyz /= cascadePos.w; \n" +
		"		cascadePos.xyz = (0.5 * cascadePos.xyz) + vec3(0.5); \n" +
		"		float cascadeDepth = linearizeDepth(cascadePos.z, u_clipPlane" + i + ".x, u_clipPlane" + i + ".y ); \n" +
		"		for( float y = -offset" + i +"; y <= offset" + i + "; y += increment" + i + "){ \n" +
		"			for( float x = -offset" + i + "; x <= offset" + i + "; x += increment" + i + "){ \n" +

		"				sum += isOccluded( u_shadowMap" + i + ", cascadeDepth, uv + vec2(x,y), u_clipPlane" + i + " ); \n" +
		"			} \n" +
		"		} \n" +
		"		return sum / 64.0; \n" +
		"	} \n";
		}
		cascadeSwitch += "} \n";

//-------------------------------------------------------------------MAIN: 
		var body = "";
		body +=
		"void main(void) { \n" +
		"	float linearDepth = linearizeDepth(v_depth, zNear, zFar); \n" +
		"	vec4 normal = vec4( normalize(v_normal).rgb, 1.0); \n" +
		"	float illuminence = 0.0; \n" +
		"    vec4 color = texture2D( u_sampler, v_texcoord ); \n" +
		"    color.rgb = (color.rgb * color.rgb); // gamma correct texture  \n" +
		"    vec4 biasedLightSpacePos = v_lightSpacePos; \n" +
		"    biasedLightSpacePos  = v_lightSpacePos / v_lightSpacePos.w; \n" +
		"	biasedLightSpacePos.xyz = (0.5 * biasedLightSpacePos.xyz) + vec3(0.5); \n" +
		"	if( isValid(biasedLightSpacePos.xyz) ){ \n" +
				
		"		float fragmentDepth = (biasedLightSpacePos.z); \n" +
		"		float occlusion = 1.0 - averageLookups(fragmentDepth, biasedLightSpacePos.xy); \n" +
		"		illuminence = occlusion * LIGHT_INTENSITY / pow( v_lightSpacePos.z, 2.0 ); \n" +

		"	} \n" +
		
		"	float diffuse = clamp(dot(v_tSpaceNormal, v_worldToLight), 0.0, 1.0); \n " +

		"	color.rgb *= (illuminence * diffuse) + AMBIENT_INTENSITY; \n" +
			
		"	gl_FragData[0] = vec4( vec3(linearizeDepth(biasedLightSpacePos.z, zNear, zFar)), 1.0); \n" +
		// "	gl_FragData[1] = vec4( v_tSpaceNormal, 1.0 ); \n" +
		"	gl_FragData[1] = normal; \n" +
		"	gl_FragData[2] = sqrt(color); \n" +
		"	gl_FragData[3] = vec4( v_depth, 0, 0, 0 ); \n" +
		"} \n";

		var fsString = prefix + cascadeUniforms + postfix + cascadeSwitch + body;

		var vsString = "" +

		"precision highp float; \n " +

		//--------------------------------------------------------------VARIABLES:

		"attribute vec3 a_pos; \n " +
		"attribute vec3 a_normal; \n " +
		"attribute vec2 a_texcoord; \n " +

		"uniform mat4 u_modelLight; \n " +
		"uniform mat4 u_modelview; \n " +
		"uniform mat4 u_mvp; \n " +
		"uniform mat4 u_mlp; \n " +
		"uniform mat4 u_normalMat; \n " +
		"uniform vec3 u_lpos; \n " +

		"varying vec4 v_pos; \n " +
		"varying vec3 v_normal; \n " +
		"varying vec2 v_texcoord; \n " +
		"varying float v_depth; \n " +
		"varying vec4 v_lightSpacePos; \n " +
		"varying vec4 v_modelLightPos; \n " +
		"varying vec3 v_worldToLight; \n" + 
		"varying vec3 v_tSpaceNormal; \n" +

		//-------------------------------------------------------------------MAIN:

		"void main(void) { \n" +

			"gl_Position = u_mvp * vec4( a_pos, 1.0 ); \n " +
			"v_pos = u_modelview * vec4( a_pos, 1.0 ); \n " +
			"v_lightSpacePos = u_mlp * vec4( a_pos, 1.0 ); \n " +
			"v_modelLightPos = u_modelLight * vec4( a_pos, 1.0 ); \n " +
			"v_worldToLight = normalize(u_lpos - a_pos); \n " +
			"v_normal = vec3( u_normalMat * vec4(a_normal,0.0) ); \n " +
			"v_tSpaceNormal = normalize(a_normal); \n " +
			"v_texcoord = a_texcoord; \n " +
			"v_depth = ( gl_Position.z / gl_Position.w + 1.0 ) / 2.0; \n " +
		"}";

		var shader = SEC3.createShaderProgram();
		shader.loadShaderFromStrings(gl, vsString, fsString);
		gl.useProgram( shader.ref() );
	    //query the locations of shader parameters
	    shader.aVertexPosLoc = gl.getAttribLocation( shader.ref(), "a_pos" );
	    shader.aVertexNormalLoc = gl.getAttribLocation( shader.ref(), "a_normal" );
	    shader.aVertexTexcoordLoc = gl.getAttribLocation( shader.ref(), "a_texcoord" );

	    shader.uPerspLoc = gl.getUniformLocation( shader.ref(), "u_projection" );
	    shader.uModelViewLoc = gl.getUniformLocation( shader.ref(), "u_modelview" );
	    shader.uMVPLoc = gl.getUniformLocation( shader.ref(), "u_mvp" );
	    shader.uNormalMatLoc = gl.getUniformLocation( shader.ref(), "u_normalMat");
	    shader.uSamplerLoc = gl.getUniformLocation( shader.ref(), "u_sampler");
	    shader.uMLPLoc = gl.getUniformLocation( shader.ref(), "u_mlp");
	    shader.uModelLightLoc = gl.getUniformLocation( shader.ref(), "u_modelLight");
	    shader.uLPosLoc = gl.getUniformLocation( shader.ref(), "u_lpos" );

	    shader.uCascadeLocs = [];
	    shader.uClipPlaneLocs = [];
	    shader.uCascadePerspLocs = [];
	    for(var i = 0; i < light.numCascades; i++ ){
	        shader.uCascadeLocs[i] = gl.getUniformLocation( shader.ref(), "u_shadowMap" + i);
	        shader.uClipPlaneLocs[i] = gl.getUniformLocation( shader.ref(), "u_clipPlane" + i);
	        shader.uCascadePerspLocs[i] = gl.getUniformLocation( shader.ref(), "u_cascadePersp" + i);
	        gl.uniform2f(shader.uClipPlaneLocs[i], light.cascadeClips[i][NEAR_PLANE], light.cascadeClips[i][FAR_PLANE] );
	        gl.uniformMatrix4fv(shader.uCascadePerspLocs[i], false, light.cascadePerspectives[i] );
	    }

		return shader;
}