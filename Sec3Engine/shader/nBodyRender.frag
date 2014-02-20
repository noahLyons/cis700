precision highp float;

const float EPSILON = 0.0000000000000000001;
const vec3 color = vec3(0.1, 0.8, 0.6);
const vec3 shadowColor = vec3(0.1, 0.2, 0.4);

uniform float uAlpha;
uniform sampler2D uSpriteTex;
uniform sampler2D uShadowMap;
uniform vec3 uLightPosition;
varying vec4 worldPosition;
uniform mat4 uShadowMapTransform;

void main(void) {
	

	vec4 lightSpaceCoord = uShadowMapTransform * vec4(worldPosition.rgb, 1.0);
	lightSpaceCoord /= lightSpaceCoord.w;

	vec3 shadowMapCoord = 0.5 + (lightSpaceCoord.xyz * 0.5);
	
	float shadowDepth = texture2D(uShadowMap, shadowMapCoord.xy).b;

 
   	// ---SET COLOR
   	
   	vec3 lightVector = worldPosition.xyz - uLightPosition;
   	float lightSquaredDistance = dot(lightVector,lightVector);
   	vec4 v_color;

	if(shadowMapCoord.x < 0.0 || shadowMapCoord.x > 1.0 || shadowMapCoord.y < 0.0 || shadowMapCoord.y > 1.0) {
		v_color = vec4(shadowColor, 0.01);
	}
	else if(EPSILON + shadowDepth < shadowMapCoord.z) {  // shadowed 
		float distance = shadowMapCoord.z - shadowDepth;
		float distanceSquared = distance * distance;
		float fakeTransmittance = max(1.0 - (0.01 / (distance)), distanceSquared);
		// fakeTransmittance = max(fakeTransmittance, 0.02);
		v_color = vec4(((max(0.0, 2.0 - distance) * color) + (max(1.0, 2.0 / distance) * shadowColor)) * 0.002, uAlpha);

		// v_color = vec4(vec3( lightSpaceCoord.z  - shadowDepth),1.0);
	}
	else {
		// v_color = vec4((color + lightSquaredDistance) / (lightSquaredDistance + vec3(1.0)), uAlpha + 0.02);
		// v_color = vec4(color / lightSquaredDistance, uAlpha );
		v_color = vec4(1.0 * color / lightSquaredDistance, uAlpha );//+ (0.0001 / lightSquaredDistance));
	}
	gl_FragColor = v_color;
	gl_FragColor.rgb += vec3(0.01);

 } 