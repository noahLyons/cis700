precision highp float;

const float EPSILON = 0.000000001;
const vec3 color = vec3(0.4, 0.8, 1.0);
const vec3 shadowColor = vec3(0.3, 0.0, 0.3);

uniform float uAlpha;
uniform sampler2D uShadowMap;
uniform vec3 uLightPosition;
uniform mat4 uShadowMapTransform;
uniform float uLuminence;
uniform float uScatterMultiply;
uniform float uShadowMultiply;
uniform float uScale;
varying vec3 worldPosition;

bool withinLightFrustum(vec2 coordinate) {
 	return coordinate.x > 0.0 && 
 		   coordinate.x < 1.0 && 
 		   coordinate.y > 0.0 && 
 		   coordinate.y < 1.0;

 }

void main(void) {
	
		
	vec4 lightSpacePos = uShadowMapTransform * vec4(worldPosition, 1.0);
	lightSpacePos /= lightSpacePos.w;

	lightSpacePos.xyz = 0.5 + (lightSpacePos.xyz * 0.5);
	
	float shadowDepth = texture2D(uShadowMap, lightSpacePos.xy).b;

 
   	// ---SET COLOR 	
   	
   	vec3 lightVector = worldPosition - uLightPosition;
   	float lightSquaredDistance = dot(lightVector,lightVector);
    // float lightDistance = length(lightVector);
   	vec4 v_color;

   	//if point transformed into light space is outside of light view frustum, 
	if(! withinLightFrustum(lightSpacePos.xy)) {
		discard;
	}

	vec3 lightFalloff = color / lightSquaredDistance;
	if(EPSILON + shadowDepth < lightSpacePos.z) {  // current particle is 
		
		float occluderDistance = (lightSpacePos.z - shadowDepth) * uScale;
		float occluderDistanceSquared = occluderDistance * occluderDistance;
		float falloff = uLuminence / (1.0 + occluderDistanceSquared);
		v_color = vec4( (( uScatterMultiply * lightFalloff) * falloff) + (uShadowMultiply * shadowColor ), uAlpha);
		
	}
	else {
		v_color = vec4( lightFalloff * uLuminence * uLuminence, uAlpha);// + (uAlpha * uLuminence * 0.06 / max(1.0, lightSquaredDistance) ));//	 + min((2.0/ lightSquaredDistance),uAlpha));
	}
	gl_FragColor = v_color;
	// float magnitude = length(gl_FragColor);
	// gl_FragColor.a = uAlpha * max(1.0, magnitude);
	// gl_FragColor.rgb += vec3(0.08);
	// gl_FragColor.rgb *= 0.8;

 } 

 