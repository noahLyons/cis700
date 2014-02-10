#extension GL_EXT_draw_buffers : require
precision mediump float;

varying vec4 newPosition;
varying vec3 newVelocity;

void main(void) {
// Saves the new position and accelleration to location determined in vertex shader
	gl_FragData[0] = (newPosition);
	gl_FragData[1] = vec4(newVelocity,1.0);
}