
precision highp float;

//--------------------------------------------------------------VARIABLES:

//uniform sampler2D u_blurredBackground;
uniform sampler2D u_blurredForeground;
uniform sampler2D u_unalteredImage; // keep? could already have this in one of the framebuffers 
uniform sampler2D u_downsampled;
uniform sampler2D u_smallBlur;
varying vec2 v_texcoord;

//----------------------------------------------------------------METHODS:

// vec3 interpolate( vec3 small, vec3 big, float coc, )

//-------------------------------------------------------------------MAIN:

void main() {
	vec4 finalCoc = texture2D( u_downsampled, v_texcoord );

	float coc = finalCoc.a;
	// Calc texel colors to interpolate between

	vec3 interpolatedTexel = vec3(0.0);

	if( coc > 0.666 ) {

		vec3 maxBlurColor = texture2D( u_blurredForeground, v_texcoord ).rgb;
		vec3 midBlurColor = 3.0 * (1.0 - coc) * finalCoc.rgb;
		maxBlurColor = 3.0 * (coc - 0.666 ) * maxBlurColor;
		interpolatedTexel = midBlurColor + maxBlurColor;

	}
	
	else if ( coc > 0.333) {
		vec3 smallBlur = texture2D( u_smallBlur, v_texcoord ).rgb;
		vec3 midBlurColor = 3.0 * (0.666 - coc) * smallBlur;
		vec3 maxBlurColor = 3.0 * (coc - 0.333) * finalCoc.rgb;
		interpolatedTexel = midBlurColor + maxBlurColor;
	}

	else {
		vec3 smallBlur = texture2D( u_smallBlur, v_texcoord ).rgb;
		vec3 fullResTexel = texture2D( u_unalteredImage, v_texcoord ).rgb;
		vec3 biasedLow = 3.0 * (0.333 - coc) * fullResTexel;
		vec3 biasedHigh = 3.0 * coc * smallBlur;
		interpolatedTexel = biasedLow + biasedHigh;

	}
	
	gl_FragData[0] = vec4(interpolatedTexel.rgb, 1.0);

}
