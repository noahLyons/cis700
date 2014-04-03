precision highp float;


attribute vec2 aParticleIndex; 

uniform sampler2D uParticlePositions; 
uniform mat4 uCameraTransform;
uniform float uSize;

varying vec3 worldPosition;

void main(void) {

	// Index into the buffer uolParticlePositions with aParticleIndex 
	
	worldPosition = texture2D(uParticlePositions, aParticleIndex).rgb;
   	gl_Position = uCameraTransform * vec4(worldPosition, 1.0);//write 

	gl_PointSize = 1.0;

}