precision highp float;

//--------------------------------------------------------------VARIABLES:
const int MAX_SAMPLES = 30;
const float E = 2.71828;
const float PI = 3.14159265358979;
attribute vec3 a_pos;
attribute vec2 a_texcoord;
uniform float u_lilSig;

varying vec2 v_texcoord;
varying float v_weight[MAX_SAMPLES];

//-------------------------------------------------------------------MAIN:



//--------------------------------------
void main(void) {
	float gauss = 1.0 / (sqrt(2.0 * PI * exp2(u_lilSig)));
   	
	float denom = 2.0 * exp2(u_lilSig);

	for(int i = 0; i < MAX_SAMPLES; i++){
		
		float exponent = -1.0 * exp2(float(i)) / denom;
		gauss *= pow(E, exponent);
      v_weight[i] = gauss;
	}

	v_texcoord = a_texcoord * 0.5 + vec2(0.5);

    gl_Position = vec4( a_pos, 1.0 );
}