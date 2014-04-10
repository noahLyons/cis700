precision highp float;

attribute vec2 a_index; 

uniform sampler2D u_positions; 
uniform mat4 u_MVP;

varying vec3 worldPosition;

void main(void) {

	worldPosition = texture2D(u_positions, a_index).rgb;
   	gl_Position = u_MVP * vec4(worldPosition, 1.0);
	gl_PointSize = 10.0;

}