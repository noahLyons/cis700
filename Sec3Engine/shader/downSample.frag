precision highp float;


//--------------------------------------------------------------VARIABLES:
 
uniform sampler2D u_source; 
uniform vec2 u_pixDim;

varying vec2 v_texcoord;


//----------------------------------------------------------------METHODS:
vec2 getTexelUv( vec2 offset) {
	return offset * u_pixDim + v_texcoord;
}

// returns the average of four nearest texels 
vec4 averageTexels() { 

	vec4 summedTexels = texture2D( u_source, getTexelUv(vec2(-0.5, 0.5)) );
	summedTexels += texture2D( u_source, getTexelUv(vec2(0.5,0.5)));
	summedTexels += texture2D( u_source, getTexelUv(vec2(0.5,-0.5)));
	summedTexels += texture2D( u_source, getTexelUv(vec2(-0.5,-0.5)));

	return summedTexels / 4.0;
}
//-------------------------------------------------------------------MAIN:

void main() {
	
	gl_FragData[0] = averageTexels();

}
