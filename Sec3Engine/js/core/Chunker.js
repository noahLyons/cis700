var SEC3 = SEC3 || {};

SEC3.Chunker = {};
SEC3.Chunker.methods = {};
/*
 * Returns a method to convert log space between near and far values to linear between 0.0 and 1.0 
 */
 SEC3.Chunker.methods.linearize = function () {

	return "" +

	"float linearize( float exp_depth, float near, float far) { \n" +
		"return ( 2.0 * near ) / ( far + near - exp_depth * ( far - near ) ); \n" +
	"} \n";
 };



/*
 * Returns a vertex shader program to render with cascaded shadow maps as a String
 */ 
SEC3.Chunker.renderCascadedShadowMapsVS = function () {

		return "" +		
		"precision highp float; \n " +
		
		"attribute vec3 a_pos; \n " +
		"attribute vec3 a_normal; \n " +
		"attribute vec2 a_texcoord; \n " +

		"uniform mat4 u_modelLight; \n " +
		"uniform mat4 u_mvp; \n " +
		"uniform mat4 u_mlp; \n " +
		"uniform vec3 u_lPos; \n " +
		
		"varying vec2 v_texcoord; \n " +
		"varying vec4 v_lightSpacePos; \n " +
		"varying vec4 v_modelLightPos; \n " +
		"varying vec3 v_worldToLight; \n" + 
		"varying vec3 v_tSpaceNormal; \n" +

		"void main(void) { \n" +

			"gl_Position = u_mvp * vec4( a_pos, 1.0 ); \n " +
			
			"v_lightSpacePos = u_mlp * vec4( a_pos, 1.0 ); \n " +
			"v_modelLightPos = u_modelLight * vec4( a_pos, 1.0 ); \n " +
			"v_worldToLight = normalize(u_lPos - a_pos); \n " +
			"v_tSpaceNormal = normalize(a_normal); \n " +
			"v_texcoord = a_texcoord; \n " +
			
		"}";

}

/*
 * Returns a fragment shader program to render with cascaded shadow maps as a String
 */ 
SEC3.Chunker.renderCascadedShadowMapsFS = function (gl, light) {

//------------------------------------------------------DECLARATIONS:
	var declarations = "" +
		"#extension GL_EXT_draw_buffers: require \n" +
		"precision highp float; \n" +

		"const float AMBIENT_INTENSITY = 0.03; \n" +
		"const float LIGHT_INTENSITY = 400.0; \n" +
		"const float SHADOW_FACTOR = 0.001; \n" +
		"const float BIAS = -0.003; \n" +
		"const float offset = 2.5 / 1024.0; \n" +
		"const float increment = 1.0/ 1024.0; \n" +
		"const float zNear = " + light.zNear + "; \n" + 
		"const float zFar = " + light.zFar + "; \n" +

		
		"varying vec2 v_texcoord; \n" +
		"varying vec4 v_lightSpacePos; \n" +
		"varying vec4 v_modelLightPos; \n" +
		"varying vec3 v_worldToLight; \n" +
		"varying vec3 v_tSpaceNormal; \n" +

		"uniform sampler2D u_sampler; \n" +
		"uniform mat4 u_projection; \n" +
		"uniform mat4 u_modelLight; \n" +
		"uniform vec3 u_cPos; \n";

	for(var i = 0; i < light.numCascades; i++ ) {
		declarations += "uniform sampler2D u_shadowMap" + i + "; \n" +
						"const float offset" + i + " = 1.5 / float(" + light.cascadeFramebuffers[i].getWidth() + "); \n" +
						"const float increment" + i + " = 1.0 / float(" + light.cascadeFramebuffers[i].getWidth() + "); \n" +								
						"uniform vec2 u_clipPlane" + i + "; \n" +
						"uniform mat4 u_cascadeMat" + i + "; \n";
	}

//-----------------------------------------------------------METHODS:

	var methods = "" +

		SEC3.Chunker.methods.linearize() +

		"bool isValid( vec3 uv ) { \n" +
			"return (uv.x <= 1.0 && uv.x >= 0.0 && uv.y <= 1.0 && uv.y >= 0.0 && uv.z <= 1.0 && uv.z >= 0.0);\n" +
		"} \n" +

		/* 
		 * Returns 1.0 if fragment is occluded, 0.0 if not 
		 */
		"float isOccluded(sampler2D shadowMap, float fragDepth, vec2 uv){ \n" +
			"vec2 spotUv = (uv - 0.5); \n" +
			"float radius = sqrt(dot(spotUv, spotUv)); \n" +
			"if( (radius) < 0.49){ \n" +
				"float shadowMapDepth = linearize(texture2D( shadowMap, uv).r, zNear, zFar); \n" +
				"return float(shadowMapDepth < fragDepth + BIAS); \n" +
			"} \n" +
			"return 1.0; \n" +
		"}\n" +

		"float averageLookups(float linDepth, vec2 uv) { \n" +

			"float sum = 0.0; \n" +
			"float shadowMapDepth; \n";
		
			// Create a switch statement to select the correct map based on depth
			for( var i = 0; i < light.numCascades; i++) {
				if(i > 0) {
					methods += "else ";
				}
				methods += "if(linDepth < u_clipPlane" + i +".y) { \n" +
					"vec4 cascadePos = u_cascadeMat" + i + " * v_modelLightPos; \n" +
					"cascadePos.xyz /= cascadePos.w; \n" +
					"cascadePos.xyz = (0.5 * cascadePos.xyz) + vec3(0.5); \n" +
					"float cascadeDepth = linearize(cascadePos.z, zNear, zFar); \n" +		
					"for( float y = -offset" + i +"; y <= offset" + i + "; y += increment" + i + "){ \n" +
						"for( float x = -offset" + i + "; x <= offset" + i + "; x += increment" + i + "){ \n" +

							"sum += isOccluded( u_shadowMap" + i + ", cascadeDepth, uv + vec2(x,y) ); \n" +
						"} \n" +
					"} \n" +
					"return sum / 16.0; \n" +
				"} \n";
			}
		methods += "} \n";

//--------------------------------------------------------------MAIN:

		var main = "" + 
			"void main(void) { \n" +
				"float linearDepth = linearize(gl_FragCoord.z, zNear, zFar); \n" +
				"vec4 color = texture2D( u_sampler, v_texcoord ); \n" +
				"color.rgb = (color.rgb * color.rgb); // gamma correct texture  \n" +

				"vec4 biasedLightSpacePos = v_lightSpacePos; \n" +
				"biasedLightSpacePos = v_lightSpacePos / v_lightSpacePos.w; \n" +
				"biasedLightSpacePos.xyz = (0.5 * biasedLightSpacePos.xyz) + vec3(0.5); \n" +

				"float illuminence = 0.0; \n" +
				"if( isValid(biasedLightSpacePos.xyz) ){ \n" +
					
					"float fragmentDepth = (biasedLightSpacePos.z); \n" +
					"float occlusion = 1.0 - averageLookups(linearDepth, biasedLightSpacePos.xy); \n" +
					"illuminence = occlusion * LIGHT_INTENSITY / pow( v_lightSpacePos.z, 2.0 ); \n" +

				"} \n" +
			
				"float diffuse = clamp(dot(v_tSpaceNormal, v_worldToLight), 0.0, 1.0); \n " +

				"color.rgb *= (illuminence * diffuse) + AMBIENT_INTENSITY; \n" +
									
				"gl_FragData[0] = vec4(vec3(linearDepth), 1.0); \n" +
				"gl_FragData[1] = vec4(vec3(v_tSpaceNormal), 1.0); \n" +
				"gl_FragData[2] = sqrt(color); \n" + // reGamma correct result of our hokey forward shading
				"gl_FragData[3] = vec4( gl_FragCoord.z, 0, 0, 1.0 ); \n" +
			"} \n";

	return declarations + methods + main;
}