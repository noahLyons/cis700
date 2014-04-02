precision highp float;

//--------------------------------------------------------------VARIABLES:

uniform float u_weight1;
uniform float u_weight2;
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;

varying vec2 v_texcoord;



//-------------------------------------------------------------------MAIN:

void main(void) {

	
	vec4 color1 = texture2D(u_texture1, v_texcoord);
	vec4 color2 = texture2D(u_texture2, v_texcoord);
	color1.rgb *= u_weight1;
	color2.rgb *= u_weight2;

	gl_FragData[0] = color1 + color2;

}