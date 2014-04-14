precision highp float;

//--------------------------------------------------------GLOBALS:
const float PI = 3.14159265;

uniform float u_h;
uniform sampler2D u_positions;

varying vec2 v_texCoord;
float h2 = u_h * u_h;
float kDensity = 315.0 / ( 64.0 * PI * pow( u_h, 9.0));

//-------------------------------------------------------HELPERS:
float getDensity( vec3 position ) {

	// x = density // y = pressure // z = viscosity
	float density = 0.0;
	float u = 0.0;
	float v = 0.0;

	for (int i = 0; i < 128; i++) {
		u = float(i) / 128.0;
		for (int j = 0; j < 128; j++){
			v = float(j) / 128.0;
 			
			vec3 neighborPos = texture2D( u_positions, vec2( u, v ) ).xyz;
			float dist = length(  position - neighborPos );
			if (dist < u_h ) {
				float dist2 = dist * dist;
				density += kDensity * pow((h2 - dist2), 3.0);
				// density += pow(((1.0 - dist) / 0.05), 2.0);
			}


		}
	}
	return density;
}
//-------------------------------------------------------MAIN:
void main() {
// Saves the new position and accelleration to location determined in vertex shader

	vec3 myPosition = texture2D(u_positions, v_texCoord).rgb;
	float density = getDensity( myPosition );

	gl_FragColor = vec4( density );
}