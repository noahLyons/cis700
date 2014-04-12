precision highp float;

const float PI = 3.14159265;
const float densityWeight = 1.0;



uniform float h;
uniform sampler2D u_positions;
// uniform float u_invTextureLength; 

varying vec2 v_texCoord;
varying float h2;
varying float kDensity;



float getDensity( vec3 position ) {

	// x = density // y = pressure // z = viscosity
	float density = 0.0;
	float u = 0.0;
	float v = 0.0;

	for (int i = 0; i < 64; i++) {
		u = float(i) / 64.0;
		for (int j = 0; j < 64; j++){
			v = float(j) / 64.0;
 			
			vec3 neighborPos = texture2D( u_positions, vec2( u, v ) ).xyz;
			float dist = length(  position - neighborPos );
			if (dist < 0.05 ) {
				float dist2 = dist * dist;
				density += kDensity * pow((h2 - dist2), 3.0);
				// density += pow(((1.0 - dist) / 0.05), 2.0);
			}


		}
	}
	return density;
}

void main() {
// Saves the new position and accelleration to location determined in vertex shader

	vec3 myPosition = texture2D(u_positions, v_texCoord).rgb;
	float density = getDensity( myPosition );

	gl_FragColor = vec4( density );
}