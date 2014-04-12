#extension GL_EXT_draw_buffers : require
precision highp float;

const float box = 2.0;


const float dT = (1.0 / 60.0);
const float dT2 = dT * dT;
const float k = 0.0001;
const float restPressure =  0.011;
const float restDensity = 1.0;

uniform float h; // effective radius
uniform sampler2D u_positions;
uniform sampler2D u_velocity;
uniform sampler2D u_densities;
// uniform float u_invTextureLength; 

varying float h2;
varying vec2 v_texCoord;
varying float kPressure;
varying float kVis;


//density += kDensity * pow((h2 - dist2), 3.0);
float getPressure( float density ) {
	return restPressure + (k * (density - restDensity));
}

vec3 assembleForces( vec3 position, vec3 myVelocity, float myDensity  ) {

	// x = density // y = pressure // z = viscosity
	float myPressure = getPressure(myDensity);


	vec3 forces = vec3(0.0);
	vec2 uv = vec2( 0.0 );
	for (int i = 0; i < 64; i++) {
		uv.x = float(i) / 64.0;
		for (int j = 0; j < 64; j++){
			uv.y = float(j) / 64.0;

			vec3 neighborPos = texture2D( u_positions, uv ).xyz;
			 // TODO: pack density into position texture
			vec3 toNeighbor = neighborPos - position;
			float dist = length( toNeighbor );
			if( dist < 0.05 ) {
				// add pressure force from neighbor
				float neighborDensity = texture2D( u_densities, uv ).r;
				float neighborPressure = getPressure( neighborDensity );
				vec3 fPressure = kPressure * pow(( 0.05 - dist), 3.0) * (toNeighbor / dist);
				fPressure *= ( myPressure + neighborPressure ) / ( 2.0 * neighborDensity);
				// forces -= fPressure;

				// add viscosity force from neighbor
				vec3 neighborVelocity = texture2D( u_velocity, uv ).rgb;
				vec3 fVis = ( neighborVelocity - myVelocity ) / neighborDensity;
				fVis *= kVis * (  0.05 - dist );
				// forces += fVis;
				forces -= toNeighbor * neighborPressure;//normalize(toNeighbor);	
			}	

		}
	}
	return forces;
}

bool inBox( vec3 position ){
	return position.x > -box && position.x < box &&
		   position.y > -box && position.y < box &&
		   position.z > -box && position.z < box;
}

vec3 getWallForces( vec3 myPosition) {

	float floorDistance = myPosition.y;
	if ( floorDistance < h ) {
		return  (h - floorDistance ) * vec3( 0.0, 1.0, 0.0 ) / dT2;
	}
	return vec3(0.0, 0.0, 0.0);
}

void main() {

	vec3 myPosition = texture2D(u_positions, v_texCoord).rgb;
	vec3 myVelocity = texture2D( u_velocity, v_texCoord ).rgb;
	float myDensity = texture2D(u_densities, v_texCoord).r; //TODO will be alpha of velocity

	vec3 forces = vec3(0.0, 0.0, 0.0);
	//Get pressure and viscosity forces
	forces += assembleForces( myPosition, myVelocity, myDensity );
		// forces = myDensity * forces;
	// Apply gravity
	forces += vec3(0.0, -10.0, 0.0);
	//Collide with floor/walls
	forces +=  getWallForces(myPosition);

	myVelocity = myVelocity + (forces / myDensity);// * ( 1.0 / myDensity );
	
	myPosition += myVelocity * dT;

	float myPressure = getPressure(myDensity);

	gl_FragData[0] = vec4( myPosition, myPressure );
	gl_FragData[1] = vec4( myVelocity, 1.0 );
}