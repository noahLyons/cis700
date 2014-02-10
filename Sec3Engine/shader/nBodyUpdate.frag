#extension GL_EXT_draw_buffers : require
precision mediump float;

uniform float uMassMultiplier;
uniform sampler2D uParticleVelocities;
uniform sampler2D uParticlePositions; 
const int max_Iterations = 1;

varying vec2 textureCoord;

vec3 accumulateAcceleration(vec4 position, float uvStep) {
	vec3 accelleration = vec3(0.0);
	vec2 otherUv = vec2(0.0);
	for(int i = 0; i < max_Iterations; i++){
		
		for(int j = 0; j < max_Iterations; j++){
			vec4 otherPosition = texture2D(uParticlePositions, otherUv);
			vec3 distance = (otherPosition.rgb - position.rgb);
			float distanceSquared = dot(distance,distance);

			if(distanceSquared > 0.00000000001){
			accelleration += uMassMultiplier * uMassMultiplier *position.a * otherPosition.a * distance * (0.00001/distanceSquared);
				
			}
			otherUv.y += uvStep;
			
		}
		otherUv.x += uvStep; 
	}
	return accelleration / (position.a * uMassMultiplier);
}

void main(void) {
// Saves the new position and accelleration to location determined in vertex shader

	vec4 oldPosition = texture2D(uParticlePositions, textureCoord);
	vec4 oldVelocity = texture2D(uParticleVelocities, textureCoord);

	float uvStep = 1.0 / 20.0;
	vec3 accellerationFinal = accumulateAcceleration(oldPosition,uvStep);

	vec3 newVelocity = oldVelocity.rgb + accellerationFinal;
	vec4 newPosition = vec4(oldPosition.rgb + newVelocity,oldPosition.a);
		
	gl_FragData[0] = (newPosition);
	gl_FragData[1] = vec4(newVelocity,1.0);
}