#extension GL_EXT_draw_buffers : require
precision highp float;

uniform float uGravityModifier;
uniform sampler2D uParticleVelocities;
uniform sampler2D uParticlePositions; 
uniform vec4 uAttractor;
uniform float uDamping;
uniform float uInteractions;
const int max_Iterations = 64;

varying vec2 textureCoord;

highp float rand(vec2 co)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

vec3 accumulateAcceleration(vec4 position, float uvStep) {
	vec3 accelleration = vec3(0.0);
	vec2 otherUv = vec2(0.0);
	float ii = 0.0;
	float jj = 0.0;
	for(int i = 0; i < max_Iterations; i++){
		if(ii > uInteractions) { break; }
		ii += 1.0;
		jj = 0.0;
		for(int j = 0; j < max_Iterations; j++){
			if(jj > uInteractions) { break; }
			jj += 1.0;
			vec4 otherPosition = texture2D(uParticlePositions, otherUv);
			vec3 distance = (otherPosition.rgb - position.rgb);
			float distanceSquared = dot(distance,distance);

			if(distanceSquared > 0.0000001){
				accelleration += uGravityModifier * uGravityModifier *position.a * otherPosition.a * normalize(distance) * (0.0000001/distanceSquared);
			}
			otherUv.y += uvStep;
			
		}
		otherUv.x += uvStep; 
	}
	return accelleration / (position.a * uGravityModifier);
}

void main(void) {
// Saves the new position and accelleration to location determined in vertex shader

	vec4 oldPosition = texture2D(uParticlePositions, textureCoord);
	vec4 oldVelocity = texture2D(uParticleVelocities, textureCoord);

	float uvStep = 1.0 / float(max_Iterations);
	vec3 accellerationFinal = accumulateAcceleration(oldPosition,uvStep); 

	// particle interactor 
	vec3 attractorPos = vec3(uAttractor.xyz);
	// if(uAttractor.z < 0.1) {
	// 	attractorPos = vec3(0.0);
	// }
	vec3 distance = attractorPos - oldPosition.rgb;
	float distanceSquared = dot(distance, distance);
	accellerationFinal += distanceSquared * distance * (uAttractor.w) * 0.00001; // anti-diffusion
	accellerationFinal += (uAttractor.w * normalize(distance)) * min((0.1/ distanceSquared),0.05);

	vec3 randomAcceleration = vec3(rand(oldPosition.xy), rand(oldPosition.yz), rand(oldPosition.xz));
	accellerationFinal += 0.0002 * randomAcceleration * ( 1.0  / max(length(oldVelocity.xyz), 0.005) );

	if (length(accellerationFinal) > 0.06)
	{
		accellerationFinal = normalize(accellerationFinal) * 0.06;
	}

	vec3 newVelocity = (oldVelocity.rgb + accellerationFinal) / uDamping;
	
	// if (length(newVelocity) > 0.5)
	// {
	// 	newVelocity = normalize(newVelocity) * 0.5;
	// }

	vec4 newPosition = vec4(oldPosition.rgb + newVelocity,oldPosition.a);
		
	gl_FragData[0] = (newPosition);
	gl_FragData[1] = vec4(newVelocity,1.0);
}