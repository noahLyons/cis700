precision highp float;

const float EPSILON = 0.0025;
const vec3 color = vec3(0.4, 0.8, 1.0);
const vec3 shadowColor = vec3(0.01, 0.007, 0.015);

uniform sampler2D u_gDepth;
uniform vec2 u_screenSize;
uniform float uAlpha;
uniform sampler2D uShadowMap;
uniform vec3 uLightPosition;
uniform mat4 uShadowMapTransform;
uniform float uLuminence;
uniform float uScatterMultiply;
uniform float uShadowMultiply;
uniform float uScale;
uniform vec3 u_cPos;
varying vec3 worldPosition;

bool withinLightFrustum(vec2 coordinate) {
 	return coordinate.x > 0.0 && 
 		   coordinate.x < 1.0 && 
 		   coordinate.y > 0.0 && 
 		   coordinate.y < 1.0;

 }

float linearize( float exp_depth, float near, float far ) {
	
	return ( 2.0 * near ) / ( far + near - exp_depth * ( far - near ) );
}

void main(void) {
	
    float u = gl_FragCoord.x / u_screenSize.x;
    float v = gl_FragCoord.y / u_screenSize.y;
   	float gDepth = texture2D(u_gDepth, (vec2(u, v))).r;
   	float depth = gl_FragCoord.z;
   	vec4 v_color = vec4(u, v, 0.0, 0.06);

   	if( depth > gDepth ){
   		discard;
   	}
   	float distanceFade = pow((1.5 - linearize(depth, 0.6, 26.0)), 2.0);
   	float softenEdge = max(1.0 - length(2.0 * gl_PointCoord - 1.0), 0.0);
   	float alpha = uAlpha * distanceFade * softenEdge;

	vec4 lightSpacePos = uShadowMapTransform * vec4(worldPosition, 1.0);
	lightSpacePos /= lightSpacePos.w;

	lightSpacePos.xyz = 0.5 + (lightSpacePos.xyz * 0.5);
	
	float shadowDepth = linearize(texture2D(uShadowMap, lightSpacePos.xy).b, 0.6, 26.0);

 
   	// ---SET COLOR 	
   	
   	vec3 lightVector = worldPosition - uLightPosition;
    float lightDistance = length(lightVector);
   	float lightSquaredDistance = (lightDistance * lightDistance);

   	// if point transformed into light space is inside of light view frustum, 
	if( withinLightFrustum(lightSpacePos.xy)) {
		v_color = vec4(shadowColor, alpha);
		vec2 spotUv = (lightSpacePos.xy - 0.5); 
		float radius = sqrt(dot(spotUv, spotUv)); 
		if( (radius) < 0.49){ 
			vec3 lightFalloff = color / lightSquaredDistance;
			vec3 cameraToPoint = normalize( u_cPos - worldPosition );
			vec3 lightToPoint = normalize(uLightPosition - worldPosition);
			float amount = (-0.4 * dot(cameraToPoint, lightToPoint)) + 0.5;
			// amount = sqrt(amount);	
			if(EPSILON + shadowDepth < linearize(lightSpacePos.z, 0.6, 26.0)) {  // current particle is 
				
				float occluderDistance = (lightSpacePos.z - shadowDepth) * uScale;
				float occluderDistanceSquared = occluderDistance * occluderDistance;
				float falloff = uLuminence / ( occluderDistanceSquared * amount * amount);
				v_color = vec4( (( uScatterMultiply * lightFalloff) * falloff) + (uShadowMultiply * shadowColor ), alpha);
				
				// v_color.a = (amount) * alpha + ((1.0 - amount) * length((v_color.rgb)));
			}
			else {
				v_color = vec4( lightFalloff * uLuminence, alpha);// + (alpha * uLuminence * 0.06 / max(1.0, lightSquaredDistance) ));//	 + min((2.0/ lightSquaredDistance),alpha));
				// v_color.a += amount * alpha * 20.0;
			}
			// v_color = vec4(0.1);
			// v_color.r = (amount);
		}
		// v_color.a *= length(v_color.rgb);
	}
	else {
			v_color = vec4(shadowColor * uShadowMultiply, alpha);
	}

	gl_FragColor = vec4(sqrt(v_color.rgb), v_color.a);
	// float magnitude = length(gl_FragColor);
	// gl_FragColor.a = uAlpha * max(1.0, magnitude);
	// gl_FragColor.rgb += vec3(0.08);
	// gl_FragColor.rgb *= 0.8;

 } 

 