precision mediump float;
//attribute vec3 aVertexAccelerations;
//attribute vec3 aVertexVelocities; //rename aParticleVelocities
attribute vec2 aParticleIndex; 


uniform float uMassMultiplier;
uniform sampler2D uParticleVelocities;
uniform sampler2D uParticlePositions; 
const int max_Iterations = 1;

uniform float uTime;

varying vec4 newPosition;
varying vec3 newVelocity;

//vec3 getAccellerationFromBody(){}

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
	vec4 oldPosition = texture2D(uParticlePositions, aParticleIndex);
	vec4 oldVelocity = texture2D(uParticleVelocities, aParticleIndex);
	/*
		float moddy = mod(uTime,4.0);
		if( moddy > 1.0 && moddy < 3.0){

			oldVelocity *= -1.0;
		}
	*/


	//float uvStep = rand(aParticleIndex) * 0.030125;
	float uvStep = 1.0 / 20.0;
	vec3 accellerationFinal = accumulateAcceleration(oldPosition,uvStep);

	newVelocity = oldVelocity.rgb + accellerationFinal;
	// if(length(newVelocity) > 10.0){
	// 	newVelocity /= 50.0;
	// }
	// if(length(newVelocity) > 20.0){
	// 	newVelocity *= -1.0;// length(newVelocity);
	// }


	// updated position to be written to texture in frag shader

	newPosition = vec4(oldPosition.rgb + newVelocity,oldPosition.a);

	// if(length(newPosition) > 6.0)
	// {
	// 	newPosition = vec3(0.0);
	// }
	vec2 glSpaceIndex = 2.0 * (aParticleIndex - 0.5);
	// set data write location 
	gl_Position = vec4(glSpaceIndex, 0.0, 1.0); 

	// Set particle size
	gl_PointSize = 1.0;
}