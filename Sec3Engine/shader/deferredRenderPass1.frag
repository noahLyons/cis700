#extension GL_EXT_draw_buffers: require

precision highp float;
const float AMBIENT_INTENSITY = 0.03;
const float LIGHT_INTENSITY = 20.0;
const float SHADOW_FACTOR = 0.006;
const float BIAS = -0.003;
const float offset = 2.5 / 1024.0;
const float increment = 1.0/ 1024.0;
//--------------------------------------------------------------VARIABLES:

uniform sampler2D u_sampler;
uniform sampler2D u_shadowMap;
uniform mat4 u_projection;
uniform mat4 u_modelLight;

varying vec4 v_pos;
varying vec3 v_normal;
varying vec2 v_texcoord;
varying float v_depth;
varying vec4 v_lightSpacePos;

float linearizeDepth( float exp_depth) {
	
	return ( 2.0 * 0.1 ) / ( 30.0 + 0.1 - exp_depth * ( 30.0 - 0.1 ) );
}

bool isValid( vec3 uv ) {
	bool result = false;
	if(uv.x <= 1.0 && uv.x >= 0.0 && uv.y <= 1.0 && uv.y >= 0.0 && uv.z <= 1.0 && uv.z >= 0.0){
		result = true;

		//check if uv coord is inside spotlight cone
		// uv = (uv - 0.5);
		// float radius = dot(uv, uv);
		// if( (radius) >= 0.5) result = false;
	}
	return result;
}

/*
 * Returns 1.0 if fragment is occluded, 0.0 if not
 */
float isOccluded(float fragDepth, vec2 uv){
	vec2 spotUv = (uv - 0.5);
	float radius = sqrt(dot(spotUv, spotUv));
	if( (radius) < 0.49){
		
		float shadowMapDepth = linearizeDepth(texture2D( u_shadowMap, uv).r);
		return float(shadowMapDepth < fragDepth + BIAS);
	}
	return 1.0;
}	


float averageLookups(float fragDepth, vec2 uv) {
	
	
	float sum = 0.0;
	for( float y = -offset; y <= offset; y += increment){
		for( float x = -offset; x <= offset; x += increment){

			sum += isOccluded(fragDepth, uv + vec2(x,y));
		}
	}
	return sum / 36.0;
}
//-------------------------------------------------------------------MAIN:

void main(void) {
	vec4 normal = vec4( normalize(v_normal).rgb, 1.0);
	float illuminence = 0.0;
    vec4 color = texture2D( u_sampler, v_texcoord );
    color.rgb = (color.rgb * color.rgb); // gamma correct texture 
    vec4 biasedLightSpacePos = v_lightSpacePos;
    biasedLightSpacePos  = v_lightSpacePos / v_lightSpacePos.w;
	biasedLightSpacePos.xyz = (0.5 * biasedLightSpacePos.xyz) + vec3(0.5);
	if( isValid(biasedLightSpacePos.xyz) ){
		
		float fragmentDepth = linearizeDepth(biasedLightSpacePos.z);
		float occlusion = 1.0 - averageLookups(fragmentDepth, biasedLightSpacePos.xy);
		illuminence = occlusion * LIGHT_INTENSITY / pow( v_lightSpacePos.z, 2.0 );

	}
	

	color.rgb *= ((illuminence) + AMBIENT_INTENSITY);
	
	gl_FragData[0] = vec4( vec3((v_lightSpacePos / v_lightSpacePos.w).rgb), 1.0);
	gl_FragData[1] = normal;
	gl_FragData[2] = color;
	gl_FragData[3] = vec4( v_depth, 0, 0, 0 );
}