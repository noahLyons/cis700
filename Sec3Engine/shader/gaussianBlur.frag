precision highp float;

#define VERTICAL 1
#define HORIZONTAL 0
const int NUM_WEIGHTS = 3;
const int PIXELS_SAMPLED_PER_DIR = 3;
const int PIXELS_PER_WEIGHT = PIXELS_SAMPLED_PER_DIR / NUM_WEIGHTS;
//--------------------------------------------------------------VARIABLES:

//uniform sampler2D u_positionTex;


uniform sampler2D u_source; // texture unit 0
uniform int u_blurDirection;
uniform vec2 u_pixDim;

varying float v_weight[NUM_WEIGHTS];
varying vec2 v_texcoord;


//----------------------
vec2 getTexelUv( vec2 offset) {
	return offset * u_pixDim + v_texcoord;
}

vec4 getPixelColor(vec2 direction) {
	vec4 color = texture2D( u_source, v_texcoord ) * v_weight[0];

	for( int i = 1; i < PIXELS_SAMPLED_PER_DIR; i++) {
			float weight = v_weight[ i / PIXELS_PER_WEIGHT ];

			vec2 uv = getTexelUv(direction * float(i));
			vec4 weightedColorAbove = texture2D( u_source, uv) * weight;

			uv = getTexelUv(direction * float(-i));
			vec4 weightedColorBelow = texture2D( u_source, uv) * weight;

			color += weightedColorAbove;
			color += weightedColorBelow;
	}
	return color;// / float(PIXELS_PER_WEIGHT);
}
//-------------------------------------------------------------------MAIN:

void main() {
	
	
	if( u_blurDirection == VERTICAL) {
	    gl_FragData[0] = getPixelColor(vec2(0.0, 1.0));
	}

	if( u_blurDirection == HORIZONTAL ) {
	    gl_FragData[0] = getPixelColor(vec2(1.0, 0.0));
	}
	// gl_FragData[0] = color;	
}