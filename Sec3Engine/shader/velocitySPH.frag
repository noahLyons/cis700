#extension GL_EXT_draw_buffers : require
precision highp float;

//--------------------------------------------------------GLOBALS:

const float PI = 3.14159265;

uniform vec3 u_gridDims;
uniform vec2 u_gridTexDims;
uniform float u_restPressure;
uniform float u_restDensity;
uniform float u_steps;
uniform float u_k;
uniform float u_h; // effective radius
uniform float u_kViscosity;
uniform sampler2D u_positions;
uniform sampler2D u_velocity;
uniform sampler2D u_densities;
// uniform float u_invTextureLength; 
varying vec2 v_texCoord;
float wPressure = 45.0 / (PI * pow(u_h, 6.0));
float wViscosity = wPressure;

float h2 = u_h * u_h;
float dT = (1.0 / (60.0 * u_steps));
float dT2 = dT * dT;

//density += kDensity * pow((h2 - dist2), 3.0);
//--------------------------------------------------------HELPERS:
float getPressure( float density ) {
	return u_restPressure + ( u_k * (density - u_restDensity));
}

vec2 getVoxel( vec3 pos ) {
	
	pos /= u_h;
	float numColumns =  sqrt(u_gridDims.y);
	float yCompU = floor(mod(pos.y, numColumns)) / numColumns;//u_gridTexDims.x;
	float yCompV = floor(pos.y / numColumns) / numColumns;//u_gridTexDims.y;
	float xCompU = (pos.x / u_gridDims.x) / numColumns;
	float zCompV = (pos.z / u_gridDims.z) / numColumns;

	return vec2( yCompU + xCompU, yCompV + zCompV );
	
}

vec3 assembleForces( vec3 position, vec3 myVelocity, float myDensity  ) {

	// x = density // y = pressure // z = viscosity
	vec3 forces = vec3(0.0);

	float myPressure = getPressure(myDensity);

	vec2 uv = vec2( 0.0 );
	for (int i = 0; i < 128; i++) {
		uv.x = float(i) / 128.0;
		for (int j = 0; j < 128; j++){
			uv.y = float(j) / 128.0;

			vec3 neighborPos = texture2D( u_positions, uv ).xyz;
			 // TODO: pack density into position texture
			vec3 toNeighbor = neighborPos - position;
			float dist = length( toNeighbor );
			float dist2 = dist * dist;
			if( dist < u_h ) {
				// add pressure force from neighbor
				float neighborDensity = texture2D( u_densities, uv ).r;
				float neighborPressure = getPressure( neighborDensity );
				if( dist > 0.00000001) {
					vec3 fPressure = wPressure * pow(( u_h - dist), 3.0) * (toNeighbor / dist);
					fPressure *= ( myPressure + neighborPressure ) / ( 2.0 * neighborDensity);
					forces -= fPressure * ( 1.0 / myDensity );
				}
				// add viscosity force from neighbor
				vec3 neighborVelocity = texture2D( u_velocity, uv ).rgb;
				vec3 fVis = ( neighborVelocity - myVelocity ) / neighborDensity;
				fVis *= wViscosity * (  u_h - dist );
				forces += u_kViscosity * fVis  * ( 1.0 / myDensity );
				// forces -= toNeighbor * neighborPressure;//normalize(toNeighbor);	
			}	

		}
	}
	return forces;
}

vec3 getWallForces( vec3 myPosition) {
	vec3 wallForce = vec3(0.0);
	float floorDistance = myPosition.y + 0.0;
	if ( floorDistance < u_h ) {
		wallForce +=  (u_h - floorDistance ) * vec3( 0.0, 1.0, 0.0 ) / dT2;
	}

	float wallDist = myPosition.x;
	if ( wallDist < u_h ) {
		wallForce +=  (u_h - wallDist ) * vec3( 1.0, 0.0, 0.0 ) / dT2;
	}

	wallDist = (u_gridDims.x * u_h) - myPosition.x;
	if ( wallDist < u_h ) {
		wallForce +=  (u_h - wallDist ) * vec3( -1.0, 0.0, 0.0 ) / dT2;
	}

	wallDist = myPosition.z;
	if ( wallDist < u_h ) {
		wallForce +=  (u_h - wallDist ) * vec3( 0.0, 0.0, 1.0 ) / dT2;
	}

	wallDist = ((u_gridDims.z * u_h)) - myPosition.z;
	if ( wallDist < u_h ) {
		wallForce +=  (u_h - wallDist ) * vec3( 0.0, 0.0, -1.0 ) / dT2;
	}
	return wallForce;
}
//---------------------------------------------------------------MAIN:
void main() {

	vec3 myPosition = texture2D(u_positions, v_texCoord).rgb;
	vec3 myVelocity = texture2D( u_velocity, v_texCoord ).rgb;
	float myDensity = texture2D(u_densities, v_texCoord).r; //TODO will be alpha of velocity
	vec2 uv = getVoxel( myPosition );
	vec3 forces = vec3(0.0, 0.0, 0.0);
	//Get pressure and viscosity forces
	forces += assembleForces( myPosition, myVelocity, myDensity );
		// forces = myDensity * forces;
	// Apply gravity
	forces += vec3(0.0, -9.8, 0.0) ;
	//Collide with floor/walls
	forces +=  getWallForces(myPosition);

	myVelocity = myVelocity + (forces);// * ( 1.0 / myDensity );
	
	myPosition += myVelocity * dT2;

	float myPressure = getPressure(myDensity);

	gl_FragData[0] = vec4( myPosition, myPressure );
	gl_FragData[1] = vec4( myVelocity, 1.0 );
	gl_FragData[2] = vec4 ( uv, 1.0, 1.0 );

}