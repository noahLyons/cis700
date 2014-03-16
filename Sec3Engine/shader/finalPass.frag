precision highp float;

//--------------------------------------------------------------VARIABLES:

uniform sampler2D u_colorTex;

varying vec2 v_texcoord;


//-------------------------------------------------------------------MAIN:

void main() {

	vec4 color = texture2D( u_colorTex, v_texcoord );
	
	gl_FragColor = vec4(color.rgb,color.a);
}