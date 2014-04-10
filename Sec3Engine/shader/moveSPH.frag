

#extension GL_EXT_draw_buffers : require
precision highp float;

uniform float u_gravity;
uniform sampler2D u_velocity;
uniform sampler2D u_positions; 

varying vec2 v_texCoord;

void main(void) {
// Saves the new position and accelleration to location determined in vertex shader

	vec4 oldPosition = texture2D(u_positions, v_texCoord);
	vec4 oldVelocity = texture2D(u_velocity, v_texCoord);
	vec3 accellerationFinal = vec3( 0.0, u_gravity, 0.0);
	vec3 newVelocity = (oldVelocity.rgb + accellerationFinal);
	vec4 newPosition = vec4(oldPosition.rgb + newVelocity, oldPosition.a);
		
	gl_FragData[0] = vec4( 1, 0, 0, 1 );
	gl_FragData[1] = vec4(newVelocity.rgb, 1.0);
}