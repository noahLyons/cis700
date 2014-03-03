precision highp float;


#define TEXTURE 0
#define DEPTH 1

//--------------------------------------------------------------VARIABLES:
uniform sampler2D u_depth;
uniform sampler2D u_source; 
uniform vec2 u_pixDim;
uniform float u_near;
uniform float u_far;

varying vec2 v_texcoord;

//----------------------------------------------------------------METHODS:
float linearizeDepth( float exp_depth ) {
	
	return ( 2.0 * u_near ) / ( u_far + u_near - exp_depth * ( u_far - u_near ) );
}

vec2 getTexelUv( vec2 offset) {
	return offset * u_pixDim + v_texcoord;
}

//-------------------------------------------------------------------MAIN:

void main() {
	vec4 texels[4];
	texels[0] = texture2D( u_source, getTexelUv(vec2(-0.5, 0.5)));
	texels[1] = texture2D( u_source, getTexelUv(vec2(0.5,0.5)));
	texels[2] = texture2D( u_source, getTexelUv(vec2(0.5,-0.5)));
	texels[3] = texture2D( u_source, getTexelUv(vec2(-0.5,-0.5)));

	vec4 summedTexels = vec4(0.0);

	float texelDepths[4];
	texelDepths[0] = texture2D( u_depth, getTexelUv(vec2(-0.5, 0.5))).x;
	texelDepths[1] = texture2D( u_depth, getTexelUv(vec2(0.5,0.5))).x;
	texelDepths[2] = texture2D( u_depth, getTexelUv(vec2(0.5,-0.5))).x;
	texelDepths[3] = texture2D( u_depth, getTexelUv(vec2(-0.5,-0.5))).x;
	float summedTexelDepths = 0.0;

	for (int i = 0; i < 4; i++) {

		texelDepths[i] = linearizeDepth( texelDepths[i]);
		summedTexels += texels[i];	
		summedTexelDepths += texelDepths[i];
	}

	
	gl_FragData[TEXTURE] = summedTexels / 4.0;
	gl_FragData[DEPTH] = vec4(vec3(summedTexelDepths / 4.0), 1.0);

}
