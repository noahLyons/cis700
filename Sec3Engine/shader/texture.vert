precision highp float;

//--------------------------------------------------------------VARIABLES:
const int MAX_SAMPLES = 20;
const float E = 2.71828;
const float PI = 3.14159265358979;
attribute vec3 a_pos;
attribute vec2 a_texcoord;
uniform float u_lilSig;
varying vec2 v_texcoord;
varying float v_weight[MAX_SAMPLES];
varying float numSamples;
//-------------------------------------------------------------------MAIN:



//--------------------------------------
void main(void) {
	float gauss = 1.0/(sqrt(2.0 * PI * u_lilSig));
   	
   	numSamples = ceil(3.0 * u_lilSig);

   	float denom = -2.0 * pow(u_lilSig,u_lilSig);
   	for(int i = 0; i < MAX_SAMPLES; i++){
   		if( i > int(numSamples)) { 
   			break;
   		 }
   		float exponent = exp2(float(i)) / denom;
   		v_weight[i] = pow(E, exponent);
   	}

   	v_texcoord = a_texcoord * 0.5 + vec2(0.5);

    gl_Position = vec4( a_pos, 1.0 );
}