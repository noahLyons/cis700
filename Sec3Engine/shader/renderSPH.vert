precision highp float;

attribute vec2 a_index; 

uniform sampler2D u_pos; 
uniform mat4 u_MVP;

varying vec3 worldPosition;

void main(void) {

	worldPosition = texture2D(u_pos, a_index).rgb;
   	gl_Position = u_MVP * vec4(worldPosition, 1.0);
	gl_PointSize = 40.0;

}