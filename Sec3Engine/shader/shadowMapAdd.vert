precision highp float;

//attribute vec3 aVertexVelocities; //rename aParticleVelocities
attribute vec2 aParticleIndex; 


uniform sampler2D uParticlePositions;  //rename uParticlePositions
uniform mat4 uMVMatrix;
uniform float uAlpha;
uniform float uSize;
varying vec4 v_color;
	
void main(void) {

	// Index into the buffer uParticlePositions with aParticleIndex 
	vec4 oldPosition = texture2D(uParticlePositions, aParticleIndex);
	// vec3 oldVelocity = 0.2 + 3.0 * texture2D(uParticleVelocities, aParticleIndex).rgb;	    		
   	gl_Position = uMVMatrix * vec4(oldPosition.rgb, 1.0);//write 

   	gl_PointSize = 1.0;
   	
}