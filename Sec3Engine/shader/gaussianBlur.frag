precision highp float;

#define VERTICAL 1
#define HORIZONTAL 0

//--------------------------------------------------------------VARIABLES:

//uniform sampler2D u_positionTex;


uniform sampler2D u_source; // texture unit 0
uniform int u_blurDirection;

varying vec2 v_texcoord;

//-------------------------------------------------------------------MAIN:

void main() {
	vec4 color = texture2D( u_source, v_texcoord );
	if( u_blurDirection == VERTICAL) {
	    gl_FragData[VERTICAL] = color;	
	}

	if( u_blurDirection == HORIZONTAL ) {
	    gl_FragData[0] = color;	
	}
	// gl_FragData[0] = color;	
}