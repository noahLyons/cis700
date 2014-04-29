precision highp float;

//--------------------------------------------------------GLOBALS:
const float PI = 3.14159265;



uniform vec3 u_gridDims;
uniform float u_h;
uniform float u_mass;
uniform float u_restDensity;
uniform float u_textureSize;
uniform sampler2D u_positions;
uniform sampler2D u_voxelGrid;varying vec2 v_texCoord;
float h2 = u_h * u_h;
float kDensity = 315.0 / ( 64.0 * PI * pow( u_h, 9.0));
float kNearNorm = 15.0 / ( PI * u_h * u_h * u_h);
float kNorm = 15.0 / ( 2.0 * PI * u_h * u_h * u_h );
float mass = pow(u_h, 3.0) * u_restDensity;


//-------------------------------------------------------HELPERS:
vec2 getVoxelUV( vec3 pos ) {

	pos /= u_h;
	float numColumns =  sqrt(u_gridDims.y);
	float yCompU = floor(mod(pos.y, numColumns)) / numColumns;//u_gridTexDims.x;
	float yCompV = floor(pos.y / numColumns) / numColumns;//u_gridTexDims.y;
	float xCompU = (pos.x / u_gridDims.x) / numColumns;
	float zCompV = (pos.z / u_gridDims.z) / numColumns;

	return vec2( yCompU + xCompU, yCompV + zCompV );
	
}

vec2 unpackIndex ( float packedIndex ) {
	float u = floor(mod(packedIndex, u_textureSize));
	float v = floor( packedIndex / u_textureSize );


	return vec2( u, v ) / u_textureSize;
}

vec2 calcNeighborDensity( vec3 position, vec3 neighborPos ) {
	float density = 0.0;
	float nearDensity = 0.0;
	vec3 fromNeighbor = position - neighborPos;
	float dist = length( fromNeighbor );

	if (dist < u_h ) {
		float sqrtDensity = ( 1.0 - (dist / u_h) );
		density += sqrtDensity * sqrtDensity;
		nearDensity += density * sqrtDensity;
		// density += pow( 1.0 - (dist / u_h), 3.0);
		// nearDensity += pow( 1.0 - (dist / u_h), 4.0);

	}

	return vec2(density, nearDensity);
}	


vec2 getDensity( vec3 position ) {

	vec2 density = vec2(0.0);

	vec3 offset = vec3(0.0);
	for (int x = -1; x < 2; x++ ) {
		for (int y = -1; y < 2; y++ ) {
			for (int z = -1; z < 2; z++ ) {
				vec3 offset = u_h * vec3( float(x), float(y), float(z) );
				vec2 voxelUV = getVoxelUV( position + offset );
				vec4 particleIndices = texture2D( u_voxelGrid, voxelUV);
				if( particleIndices.r >= 0.0 ) {
					vec3 neighborPos = texture2D( u_positions, unpackIndex( particleIndices.r )).rgb;
					density += calcNeighborDensity( position, neighborPos );
				}
				if( particleIndices.g >= 0.0 ) {
					vec3 neighborPos = texture2D( u_positions, unpackIndex( particleIndices.g )).rgb;
					density += calcNeighborDensity( position, neighborPos );
				}
				if( particleIndices.b >= 0.0 ) {
					vec3 neighborPos = texture2D( u_positions, unpackIndex( particleIndices.b )).rgb;
					density += calcNeighborDensity( position, neighborPos );
				}
				if( particleIndices.a >= 0.0 ) {
					vec3 neighborPos = texture2D( u_positions, unpackIndex( particleIndices.a )).rgb;
					density += calcNeighborDensity( position, neighborPos );
				}
			}
		}
	}

	return density;
}
//-------------------------------------------------------MAIN:
void main() {
// Saves the new position and accelleration to location determined in vertex shader

	vec3 myPosition = texture2D(u_positions, v_texCoord).rgb;
	vec2 density = getDensity( myPosition );

	gl_FragColor = vec4( density, 0.0, 0.0 );
}