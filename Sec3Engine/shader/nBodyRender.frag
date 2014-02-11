precision highp float;

varying vec4 v_color;
uniform sampler2D uSpriteTex;

void main(void) {
	// gl_FragColor = v_color;
 	vec4 color = texture2D(uSpriteTex, gl_PointCoord);
 	color.a = v_color.a;
	gl_FragColor = color;
}