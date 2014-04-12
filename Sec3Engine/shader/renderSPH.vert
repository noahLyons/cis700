precision highp float;

attribute vec2 a_index; 
attribute vec3 a_GeometryVerts;
attribute vec3 a_GeometryNormals;

uniform sampler2D u_testTex;
uniform sampler2D u_positions; 
uniform mat4 u_MVP;

varying vec3 worldPosition;
varying vec3 testColor;
varying vec3 normal;

float linearize( float exp_depth ) {
	
	return ( 2.0 * 0.1 ) / ( 30.0 + 0.1 - exp_depth * ( 30.0 - 0.1 ) );
}

void main(void) {
	vec4 pos =  texture2D(u_positions, a_index).rgba;
	worldPosition = a_GeometryVerts;
	worldPosition += pos.xyz;
	normal = a_GeometryNormals;
	testColor = texture2D(u_testTex, a_index).rgb;
   	gl_Position = u_MVP * vec4(worldPosition, 1.0);
}