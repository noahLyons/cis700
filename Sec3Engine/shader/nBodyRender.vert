precision lowp float;

//attribute vec3 aVertexVelocities; //rename aParticleVelocities
attribute vec2 aParticleIndex; 

uniform sampler2D uParticleVelocities;
uniform sampler2D uParticlePositions;  //rename uParticlePositions
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec4 v_color;
	
void main(void) {

	// Index into the buffer uParticlePositions with aParticleIndex 
	vec4 oldPosition = texture2D(uParticlePositions, aParticleIndex);
	vec3 oldVelocity = texture2D(uParticleVelocities, aParticleIndex).rgb;	    		
   	gl_Position = uPMatrix * uMVMatrix * vec4(oldPosition.rgb, 1.0);//write 
   	//gl_Position =0c4(aParticleIndex,0.0,1.0);

   	gl_PointSize = 0.8 +  0.4 * oldPosition.a;

   	// ---SET COLOR
   	float magnitude = length(oldVelocity + 1.0);
	v_color = vec4(oldPosition.a,1.0,1.0,0.2);
	
}