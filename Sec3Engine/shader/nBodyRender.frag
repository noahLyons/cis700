precision mediump float;

varying vec4 v_color;
uniform sampler2D uSpriteTex;

void main(void) {
	// gl_FragColor = v_color;
	gl_FragColor = texture2D(uSpriteTex, gl_PointCoord);
	gl_FragColor.a *= v_color.a;
}