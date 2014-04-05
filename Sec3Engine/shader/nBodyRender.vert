precision highp float;


attribute vec2 aParticleIndex; 

uniform sampler2D uParticlePositions; 
uniform mat4 uCameraTransform;
uniform float uSize;

varying vec3 worldPosition;

float linearize( float exp_depth, float near, float far ) {
	
	return ( 2.0 * near ) / ( far + near - exp_depth * ( far - near ) );
}

void main(void) {

	// Index into the buffer uolParticlePositions with aParticleIndex 
	
	worldPosition = texture2D(uParticlePositions, aParticleIndex).rgb;
   	gl_Position = uCameraTransform * vec4(worldPosition, 1.0);//write 

	gl_PointSize = uSize * (1.0 / linearize((0.5 * gl_Position.z / gl_Position.w) + 0.5, 0.4, 30.0));

}