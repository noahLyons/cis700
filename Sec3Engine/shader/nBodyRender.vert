precision highp float;

//attribute vec3 aVertexVelocities; //rename aParticleVelocities
attribute vec2 aParticleIndex; 


uniform sampler2D uParticlePositions;  //rename uParticlePositions
uniform sampler2D uShadowMap;
uniform mat4 uMVMatrix;
uniform mat4 uShadowMapTransform;
uniform float uAlpha;
uniform float uSize;
varying vec4 v_color;
	
void main(void) {

	// Index into the buffer uParticlePositions with aParticleIndex 
	vec4 oldPosition = texture2D(uParticlePositions, aParticleIndex);

	vec3 lightSpaceCoord = (uShadowMapTransform * vec4(oldPosition.rgb, 1.0)).xyz;
	lightSpaceCoord = lightSpaceCoord / lightSpaceCoord.w;
	float shadowDepth = texture2D(uShadowMap, 0.5 * (1.0 + lightSpaceCoord.xy)).b;

   	gl_Position = uMVMatrix * vec4(oldPosition.rgb, 1.0);//write 


   	gl_PointSize = uSize +  0.4 * oldPosition.a;

   	// ---SET COLOR
   	
	v_color = vec4(oldPosition.a,1.0,1.0,uAlpha);


	if(shadowDepth < lightSpaceCoord.z) {  // shadowed 
		v_color = vec4(vec3(1.0, 0.0, 0.0),uAlpha);
		// v_color = vec4(vec3(lightSpaceCoord.z ),uAlpha);
	}
	else {
		v_color = vec4(1.0);
	}
	/*
	if(lightSpaceCoord.x > 1.0 || lightSpaceCoord.x < -1.0) {
		v_color = vec4(0.0,1.0,0.0,1.0);
	}
	*/
	// v_color = vec4(lightSpaceCoord,0.4);
}