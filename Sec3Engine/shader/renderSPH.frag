precision highp float;

varying vec3 worldPosition;
varying vec4 testColor;
varying vec3 normal;
void main(void) {
	vec3 u_lPos = vec3( -1.0, 2.0, 0.0);
	vec3 toLight = (u_lPos - worldPosition); 
	float falloff = 10.0 / (dot(toLight, toLight));
	toLight = normalize(toLight);
	float lambertTerm = max(dot(normalize(normal), toLight), 0.0);
	lambertTerm *= falloff;
	lambertTerm = clamp( lambertTerm, 0.1, 1.0);
	// float softenEdge = max(1.0 - length(2.0 * gl_PointCoord - 1.0), 0.0);
	gl_FragData[0] = vec4(testColor.r * 100.0, testColor.g, 0.0, 1.0);
	// gl_FragData[0] = sqrt(vec4( lambertTerm * 0.004 * (length(testColor)) * normalize(testColor), 1.0));

 } 

 