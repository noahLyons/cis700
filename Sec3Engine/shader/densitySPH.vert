precision highp float;

const float PI = 3.14159265;

attribute vec3 a_pos;
attribute vec2 a_texCoord;

uniform float h; // effective radius
varying float h2;
varying float kDensity;
varying float kPressure;
varying float kVis;
varying vec2 v_texCoord;

void main(void) {
	// scale vertex attribute to [0-1] range
	h2 = h * h;
	kDensity = 315.0 / ( 64.0 * PI * h * h * h * h * h * h * h * h * h );
	kPressure = 45.0 / (PI * h * h * h * h * h * h);
	kVis = kPressure;
	v_texCoord = a_texCoord * 0.5 + vec2(0.5);
   	gl_Position = vec4(a_pos, 1.0);
}