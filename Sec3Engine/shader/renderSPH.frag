precision highp float;

varying vec3 worldPosition;

void main(void) {
	
	float softenEdge = max(1.0 - length(2.0 * gl_PointCoord - 1.0), 0.0);
	gl_FragData[0] = vec4(worldPosition, sqrt(softenEdge));

 } 

 