#extension GL_EXT_draw_buffers : require
precision highp float;

uniform sampler2D u_positions;
uniform sampler2D u_velocity;
uniform float u_steps;

varying vec2 v_texCoord;

float dT = 1.0 / (60.0 * u_steps);


struct Particle {

	vec3 position;
	vec3 velocity;
};

Particle lookupParticle( vec2 index ) {

	vec3 position = texture2D( u_positions, index ).rgb;
	vec3 velocity = texture2D( u_velocity, index ).rgb;

	
	return Particle( position, velocity );
}

void main() {

	// TODO collisions here?
	Particle particle = lookupParticle( v_texCoord );
	particle.velocity = particle.velocity + dT * vec3( 0.0, -9.8, 0.0 );
	particle.position = particle.position + particle.velocity * dT;
	gl_FragData[0] = vec4( particle.position, 1.0 );
	gl_FragData[1] = vec4( particle.velocity, 1.0 );
}