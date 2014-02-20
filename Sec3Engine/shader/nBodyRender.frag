precision highp float;

const float EPSILON = 0.0;
const vec3 color = vec3(0.4, 0.4, 1.0);
const vec3 shadowColor = vec3(0.015, 0.01, 0.02);//vec3(0.1, 0.03, 0.05);

uniform float uAlpha;
uniform sampler2D uShadowMap;
uniform vec3 uLightPosition;
uniform mat4 uShadowMapTransform;
uniform float uLuminence;
varying vec3 worldPosition;

void main(void) {
	
	float rootLum = sqrt(uLuminence);	
	vec4 lightSpaceCoord = uShadowMapTransform * vec4(worldPosition, 1.0);
	lightSpaceCoord /= lightSpaceCoord.w;

	vec3 shadowMapCoord = 0.5 + (lightSpaceCoord.xyz * 0.5);
	
	float shadowDepth = texture2D(uShadowMap, shadowMapCoord.xy).b;

 
   	// ---SET COLOR 	
   	
   	vec3 lightVector = worldPosition - uLightPosition;
   	float lightSquaredDistance = dot(lightVector,lightVector);
    lightSquaredDistance = sqrt(lightSquaredDistance);
   	vec4 v_color;

	if(shadowMapCoord.x < 0.0 || shadowMapCoord.x > 1.0 || shadowMapCoord.y < 0.0 || shadowMapCoord.y > 1.0) {
		v_color = vec4(shadowColor, 0.04);
	}
	else if(EPSILON + shadowDepth < shadowMapCoord.z) {  // shadowed 
		float distance = shadowMapCoord.z - shadowDepth;
		float distanceSquared = distance * distance;
		// float fakeTransmittance = max(1.0 - (0.01 / (distance)), distanceSquared);
		// fakeTransmittance = max(fakeTransmittance, 0.02);
		// v_color = vec4(( 0.1 * (max(0.0, 0.6 - distance) * (rootLum * color / lightSquaredDistance)) + (max(2.0, 0.2 / min(1.0, distance)) * (rootLum * shadowColor / lightSquaredDistance))) * 0.1, uAlpha);
		v_color = vec4( ( ((uLuminence * color / lightSquaredDistance) * max(0.0, 0.3 - distanceSquared)) + ((max(2.0, 0.1 / min(1.0, distance)) * (rootLum * shadowColor / lightSquaredDistance))) ) * 0.04, uAlpha);
		// v_color = vec4(vec3( lightSpaceCoord.z  - shadowDepth),1.0);	
	}
	else {
		// v_color = vec4((color + lightSquaredDistance) / (lightSquaredDistance + vec3(1.0)), uAlpha + 0.02);
		v_color = vec4( color * uLuminence / lightSquaredDistance, uAlpha + (uAlpha * uLuminence * 0.06 / max(1.0, lightSquaredDistance) ));//	 + min((2.0/ lightSquaredDistance),uAlpha));
		// v_color = vec4(1.0 * color / lightSquaredDistance, uAlpha );//+ (0.0001 / lightSquaredDistance));
	}
	gl_FragColor = v_color;
	gl_FragColor.rgb += vec3(0.08);
	gl_FragColor.rgb *= 1.3;

 } 