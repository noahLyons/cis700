precision highp float;

varying vec3 worldPosition;
varying vec3 testColor;
varying vec3 normal;
void main(void) {
	vec3 u_lPos = vec3( 0.0, 5.0, 0.0);
	vec3 toLight = (u_lPos - worldPosition); 
	float falloff = 5.0 / (length(toLight));
	toLight = normalize(toLight);
	float lambertTerm = max(dot(normalize(normal), toLight), 0.0);
	// lambertTerm *= falloff;
	// float softenEdge = max(1.0 - length(2.0 * gl_PointCoord - 1.0), 0.0);
	gl_FragData[0] = vec4(lambertTerm * ( 0.000000000000004 * testColor.r) * vec3( 0.1, 0.3, 1.0), 1.0);

 } 

 