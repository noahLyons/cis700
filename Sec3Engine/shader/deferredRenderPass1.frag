#extension GL_EXT_draw_buffers: require

precision highp float;

const float LIGHT_INTENSITY = 25.0;
const float SHADOW_FACTOR = 0.03;
const float BIAS = -0.004;
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
		uv = (uv - 0.5);
		float radius = dot(uv, uv);
		if( (radius) >= 0.5) result = false;
	}
	return result;
}

//-------------------------------------------------------------------MAIN:

void main(void) {
    vec4 color = texture2D( u_sampler, v_texcoord );
    color = color * color;
    vec4 BiasedLightSpacePos = v_lightSpacePos;
    BiasedLightSpacePos  = v_lightSpacePos / v_lightSpacePos.w;
    // BiasedLightSpacePos = u_projection * vec4(v_lightSpacePos.rgb, 1.0);
    // BiasedLightSpacePos /= BiasedLightSpacePos.w;
	BiasedLightSpacePos.xyz = (0.5 * BiasedLightSpacePos.xyz) + vec3(0.5);
	if( isValid(BiasedLightSpacePos.xyz) ){

		float shadowMapDepth = linearizeDepth(texture2D( u_shadowMap, BiasedLightSpacePos.xy ).r);
		float fragmentDepth = linearizeDepth(BiasedLightSpacePos.z);
		if ( shadowMapDepth < fragmentDepth + BIAS  ) {
			 	color.rgb *= SHADOW_FACTOR;
		}
		else {
			color.rgb *= max(SHADOW_FACTOR, LIGHT_INTENSITY / pow((fragmentDepth * v_lightSpacePos.w), 2.0));

		}
	}
	else {
		color.rgb *= SHADOW_FACTOR;
		BiasedLightSpacePos.rgb = vec3(0.2);
	}
	// gl_FragColor = color;
	gl_FragData[0] = vec4( vec3((v_lightSpacePos / v_lightSpacePos.w).rgb), 1.0);
	gl_FragData[1] = vec4( normalize(v_normal), 1.0 );
	gl_FragData[2] = color;
	gl_FragData[3] = vec4( v_depth, 0, 0, 0 );
}