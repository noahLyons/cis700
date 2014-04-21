#extension GL_EXT_draw_buffers : require
precision highp float;

//--------------------------------------------------------GLOBALS:

const float PI = 3.14159265;

uniform vec3 u_gridDims;
uniform float u_restPressure;
uniform float u_restDensity;
uniform float u_steps;
uniform float u_k;
uniform float u_h; // effective radius
uniform float u_kViscosity;
uniform sampler2D u_positions;
uniform sampler2D u_velocity;
uniform sampler2D u_densities;
uniform sampler2D u_voxelGrid;
varying vec2 v_texCoord;

float wPressure = 45.0 / (PI * pow(u_h, 6.0));
float wViscosity = wPressure;

float h2 = u_h * u_h;
float dT = (1.0 / (60.0 * u_steps));
float dT2 = dT * dT;

//--------------------------------------------------------STRUCTS:

struct Particle {

	vec3 position;
	vec3 velocity;
	float density;
	float pressure;
};


//--------------------------------------------------------HELPERS:

float getPressure( float density ) {
	return u_restPressure + ( u_k * (density - u_restDensity));
}

vec2 getVoxelUV( vec3 pos ) {

	pos /= u_h;
	float numColumns =  sqrt(u_gridDims.y);
	float yCompU = floor(mod(pos.y, numColumns)) / numColumns;//u_gridTexDims.x;
	float yCompV = floor(pos.y / numColumns) / numColumns;//u_gridTexDims.y;
	float xCompU = (pos.x / u_gridDims.x) / numColumns;
	float zCompV = (pos.z / u_gridDims.z) / numColumns;

	return vec2( yCompU + xCompU, yCompV + zCompV );
	
}

Particle lookupParticle( vec2 index ) {
	float density = texture2D( u_densities, index ).r;
	float pressure = getPressure( density );
	vec3 position = texture2D( u_positions, index ).rgb;
	vec3 velocity = texture2D( u_velocity, index ).rgb;

	
	return Particle( position, velocity, density, pressure);
}

vec3 calcNeighborForces( Particle me, Particle neighbor ) {

	vec3 forces = vec3(0.0);
	vec3 toNeighbor = neighbor.position - me.position;
	float dist = length( toNeighbor );
	float dist2 = dist * dist;
	if( dist < u_h ) {
		// add pressure force from neighbor
		if( dist > 0.00000001) {
			vec3 fPressure = wPressure * pow(( u_h - dist), 3.0) * (toNeighbor / dist);
			fPressure *= ( me.pressure + neighbor.pressure ) / ( 2.0 * neighbor.density);
			forces -= fPressure * ( 1.0 / me.density );
		}
		// add viscosity force from neighbor
		vec3 fVis = ( neighbor.velocity - me.velocity ) / neighbor.density;
		fVis *= wViscosity * (  u_h - dist );
		forces += u_kViscosity * fVis  * ( 1.0 / me.density );
	}	
	return forces;
}

vec2 unpackIndex ( float packedIndex ) {

	float u = floor(mod(packedIndex, 128.0));
	float v = floor( packedIndex / 128.0 );


	return vec2( u, v ) / 128.0;
}

bool isValidUV( vec2 uv ) {
	return uv.x >= 0.0 && uv.x <= 1.0 &&
		   uv.y >= 0.0 && uv.y <= 1.0;

}

vec3 assembleForces( Particle particle  ) {

	// x = density // y = pressure // z = viscosity
	vec3 forces = vec3(0.0);

	vec3 offset = vec3(0.0);
	for (int x = -1; x < 2; x++ ) {
		for (int y = -1; y < 2; y++ ) {
			for (int z = -1; z < 2; z++ ) {
				vec3 offset = u_h * vec3( float(x), float(y), float(z) );
				vec2 voxelUV = getVoxelUV( particle.position + offset );
				if ( ! isValidUV( voxelUV ) ) continue;
				vec4 particleIndices = texture2D( u_voxelGrid, voxelUV);

				if( particleIndices.r < 0.0 )	continue;
				Particle r = lookupParticle( unpackIndex( particleIndices.r ));
				forces += calcNeighborForces( particle, r );
				
				if( particleIndices.g < 0.0 ) 	continue;
				Particle g = lookupParticle( unpackIndex( particleIndices.g ));
				forces += calcNeighborForces( particle, g );
				
				if( particleIndices.b < 0.0 ) 	continue;	
				Particle b = lookupParticle( unpackIndex( particleIndices.b ));
				forces += calcNeighborForces( particle, b );
				
				if( particleIndices.a < 0.0 ) 	continue;
				Particle a = lookupParticle( unpackIndex( particleIndices.a ));
				forces += calcNeighborForces( particle, a );
				
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

	wallDist = (u_gridDims.x * u_h ) - myPosition.x;
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

	Particle particle = lookupParticle( v_texCoord );
	vec2 uv = getVoxelUV( particle.position );//TEMP
	vec3 forces = vec3(0.0, 0.0, 0.0);
	//Get pressure and viscosity forces
		forces += assembleForces( particle );
	// Apply gravity
		forces += vec3(0.0, -9.8, 0.0) ;
	//Collide with floor/walls
		forces +=  getWallForces( particle.position );

	vec3 newVelocity = particle.velocity + forces;
	
	vec3 newPosition = particle.position + newVelocity * dT2; 

	gl_FragData[0] = vec4( newPosition, 1.0 );
	gl_FragData[1] = vec4( newVelocity, 1.0 );
	gl_FragData[2] = vec4 ( particle.density, 0.0, 0.2, 1.0 );

}