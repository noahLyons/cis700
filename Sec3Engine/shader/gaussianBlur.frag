precision highp float;

#define VERTICAL 1
#define HORIZONTAL 0
const int MAX_SAMPLES = 30;
//--------------------------------------------------------------VARIABLES:

//uniform sampler2D u_positionTex;


uniform sampler2D u_source; // texture unit 0
uniform int u_blurDirection;
uniform vec2 u_pixDim;

varying float v_weight[MAX_SAMPLES];
varying vec2 v_texcoord;


//----------------------
vec2 getTexelUv(vec2 offset) {
	return offset * u_pixDim + v_texcoord;
}

vec4 getPixelColor(vec2 direction) {
	float weightSum = v_weight[0];
	vec4 color = texture2D( u_source, v_texcoord ) * v_weight[0];

	for( int i = 1; i < 100; i++) {
			
			vec2 uv = getTexelUv(direction * float(i));
			vec4 weightedColorAbove = texture2D( u_source, uv) * v_weight[i / 4];
			color += weightedColorAbove;
			uv = getTexelUv(direction * -float(i));
			vec4 weightedColorBelow = texture2D( u_source, uv) * v_weight[i / 4];
			color += weightedColorBelow;
			weightSum += v_weight[i / 4] * 2.0;

		}
	color /= weightSum;
	return color;
}
//-------------------------------------------------------------------MAIN:

void main() {
	
	
	if( u_blurDirection == VERTICAL) {
	    gl_FragData[VERTICAL] = getPixelColor(vec2(0.0, 1.0));
	}

	if( u_blurDirection == HORIZONTAL ) {
	    gl_FragData[0] = getPixelColor(vec2(1.0, 0.0));
	}
	// gl_FragData[0] = color;	
}