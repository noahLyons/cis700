precision highp float;

//attribute vec3 aVertexVelocities; //rename aParticleVelocities
attribute vec2 aParticleIndex; 


uniform sampler2D uParticlePositions;  //rename uParticlePositions
uniform sampler2D uShadowMap;
uniform mat4 uMVMatrix;
uniform vec3 uLightPosition;
uniform mat4 uShadowMapTransform;
uniform float uAlpha;
uniform float uSize;
varying vec4 worldPosition;
void main(void) {

	// Index into the buffer uolParticlePositions with aParticleIndex 
	
	worldPosition = texture2D(uParticlePositions, aParticleIndex);
   	gl_Position = uMVMatrix * vec4(worldPosition.rgb, 1.0);//write 
	gl_PointSize = uSize;

}