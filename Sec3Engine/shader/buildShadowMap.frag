precision highp float;

varying float v_depth;


float linearizeDepth( float exp_depth) {
	
	return ( 2.0 * 0.1 ) / ( 30.0 + 0.1 - exp_depth * ( 30.0 - 0.1 ) );
}
//-------------------------------------------------------------------MAIN:

void main(void) {
	
	float depth = (gl_FragCoord.z);

	gl_FragData[0] = vec4(depth, depth, depth, 1.0);

}