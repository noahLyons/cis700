precision highp float;

#define DISPLAY_POS 0
#define DISPLAY_NORMAL 1
#define DISPLAY_COLOR 2
#define DISPLAY_DEPTH 3
#define BIAS 0.003
#define LIGHT_INTENSITY 40.0
//--------------------------------------------------------------VARIABLES:

uniform sampler2D u_positionTex;
uniform sampler2D u_normalTex;
uniform sampler2D u_colorTex;
uniform sampler2D u_depthTex;
uniform sampler2D u_shadowMap;

uniform float u_zFar;
uniform float u_zNear;
uniform int u_displayType;

uniform mat4 u_mlp;
uniform vec3 u_lPos;

varying vec2 v_texcoord;

//---------------------------------------------------------HELPER METHODS:

float linearize( float exp_depth, float near, float far ) {
	
	return ( 2.0 * near ) / ( far + near - exp_depth * ( far - near ) );
}

bool inLightFrustum( vec3 uv ) {
	return (uv.x <= 1.0 && uv.x >= 0.0 && uv.y <= 1.0 && uv.y >= 0.0 && uv.z <= 1.0 && uv.z >= 0.0);
}

float isOccluded(sampler2D shadowMap, float fragDepth, vec2 uv){ 
	vec2 spotUv = (uv - 0.5); 
	float radius = sqrt(dot(spotUv, spotUv)); 
	if( (radius) < 0.49){ 
		float shadowMapDepth = linearize(texture2D( shadowMap, uv).r, u_zNear, u_zFar); 
		return float(shadowMapDepth < fragDepth + BIAS); 
	} 
	return 1.0; 
}

//-------------------------------------------------------------------MAIN:

void main() {

	vec3 normal = normalize(texture2D( u_normalTex, v_texcoord ).xyz);
	vec3 position = texture2D( u_positionTex, v_texcoord ).xyz;
	vec4 color = texture2D( u_colorTex, v_texcoord );
	float depth = texture2D( u_depthTex, v_texcoord ).r;
	depth = linearize( depth, u_zNear, u_zFar );

	vec4 fragLSpace = u_mlp * vec4(position, 1.0);
	vec4 biasedLightSpacePos = fragLSpace / fragLSpace.w;
	biasedLightSpacePos.xy = (0.5 * biasedLightSpacePos.xy) + vec2(0.5);
	float illumination = 0.0;
	float shadowing = 0.0;

	if( inLightFrustum(biasedLightSpacePos.xyz) ) {
		illumination = 1.0;
		float fragmentDepth = biasedLightSpacePos.z;
		fragmentDepth = linearize( fragmentDepth, u_zNear, u_zFar);
		shadowing += 1.0 - isOccluded( u_shadowMap, fragmentDepth, biasedLightSpacePos.xy );
	}

	vec3 toLight = normalize(u_lPos - position); 
	float lambertTerm = max(dot(normal, toLight), 0.0);
	illumination = lambertTerm * shadowing * LIGHT_INTENSITY / pow( fragLSpace.z, 2.0 );

    if( u_displayType == DISPLAY_DEPTH )
	    gl_FragData[0] = vec4( vec3(depth), 1 );
	else if( u_displayType == DISPLAY_COLOR )
	    gl_FragData[0] = vec4(color.rgb * illumination, color.a);
	else if( u_displayType == DISPLAY_NORMAL )
	    gl_FragData[0] = vec4( normal, 1 );
	else
	    gl_FragData[0] = vec4( vec3(illumination), 1 );
}