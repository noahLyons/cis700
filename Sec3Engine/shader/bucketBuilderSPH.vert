precision highp float;

attribute vec2 a_index;

uniform sampler2D u_positions;
uniform float u_textureLength;
uniform vec3 u_gridDims;
uniform vec2 u_gridTexDims;

varying float index;

//---------------------------------------------------HELPERS:
vec2 worldToUV( vec3 pos ) {

	float zCompU = mod(pos.x, u_gridDims.x) / u_gridTexDims.x;
	float zCompV = (pos.z / u_gridDims.x) / u_gridTexDims.x;
	float xCompU = (pos.x / u_gridDims.x) / u_gridTexDims.x;
	float yCompV = (pos.y / u_gridDims.y) / u_gridTexDims.y;

	return vec2( zCompU + xCompU, zCompV + yCompV );

}

int getIndex( vec2 mapMe ) {

  	return int(mapMe.x + mapMe.y * u_textureLength);
}

//-----------------------------------------------------MAIN:
void main() {

	int absoluteIndex = getIndex(a_index);
	vec3 worldPosition = texture2D(u_positions, a_index ).rgb;
	vec2 uv = worldToUV( worldPosition );
	gl_Position = vec4( uv, absoluteIndex, 1.0 );

}