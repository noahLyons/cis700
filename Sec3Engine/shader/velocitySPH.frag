#extension GL_EXT_draw_buffers : require
precision highp float;

//--------------------------------------------------------GLOBALS:

const float PI = 3.14159265;

uniform vec3 u_gridDims;
uniform float u_restPressure;
uniform float u_restDensity;
uniform float u_steps;
uniform float u_textureSize;
uniform float u_k;
uniform float u_kNear;
uniform float u_h; // effective radius
uniform float u_mass;
uniform float u_kViscosity;
uniform float u_surfaceTension;
uniform mat4 u_projectorViewMat;
uniform mat4 u_projectorProjectionMat;
uniform vec3 u_projectorPos;
uniform sampler2D u_positions;
uniform sampler2D u_velocity;
uniform sampler2D u_densities;
uniform sampler2D u_voxelGrid;
uniform sampler2D u_sceneDepth;
uniform sampler2D u_sceneNormals;

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
	vec2 density;
	float pressure;
	float nearPressure;
};


//--------------------------------------------------------HELPERS:

float getPressure( float density ) {
	// return  u_k * (pow(density / u_restDensity, 3.0) - 1.0);
	return  u_k * (  density - u_restDensity );
}

float getNearPressure( float neardensity ) {
	return u_kNear * neardensity;
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
	vec2 density = texture2D( u_densities, index ).rg;
	float pressure = getPressure( density.x );
	float nearPressure = getNearPressure( density.y );
	vec3 position = texture2D( u_positions, index ).rgb;
	vec3 velocity = texture2D( u_velocity, index ).rgb;

	
	return Particle( position, velocity, density, pressure, nearPressure);
}

vec3 calcNeighborForces( Particle me, Particle neighbor ) {

	vec3 forces = vec3(0.0);
	vec3 toNeighbor = neighbor.position - me.position;
	float dist = length( toNeighbor );
	float dist2 = dist * dist;
	if( dist < u_h ) {
		// add pressure force from neighbor
		if( dist > 0.00001) {
			vec3 fPressure = wPressure * pow(( u_h - dist), 2.0) * (toNeighbor / dist);
			fPressure *= ( me.pressure + neighbor.pressure ) / ( 2.0 * neighbor.density.x);
			forces -= fPressure * ( 1.0 / me.density.x ) ;

			// vec3 fPressure = pow(( 1.0 - (dist / u_h)), 2.0) * (toNeighbor / dist);
			// fPressure *= ( me.pressure + neighbor.pressure ) / ( 2.0 * neighbor.density.x);
			// forces -= fPressure * ( 1.0 / me.density.x ) ;
			// add nearPressure from neighbor
			vec3 fNear = wPressure * me.nearPressure * pow(1.0 - (dist / u_h), 3.0) * (toNeighbor / dist);
			// fNear *= ( me.nearPressure + neighbor.nearPressure ) / ( 2.0 * neighbor.density.x);
			forces -= fNear * ( 1.0 / me.density.x ) ;

			// add viscosity force from neighbor
			vec3 fVis = ( neighbor.velocity - me.velocity ) / neighbor.density.x;
			fVis *= wViscosity * (  u_h - dist );
			forces += u_kViscosity * fVis * ( 1.0 / me.density.x );
		}
	}	
	return forces;
}

vec2 unpackIndex ( float packedIndex ) {

	float u = floor(mod(packedIndex, u_textureSize));
	float v = floor( packedIndex / u_textureSize );


	return vec2( u, v ) / u_textureSize;
}

//TODO TEMP
bool isValidUV( vec2 uv ) {
	return uv.x >= 0.0 && uv.x <= 1.0 &&
		   uv.y >= 0.0 && uv.y <= 1.0;

}
//TODO TEMP
bool isInsideGrid( vec3 pos ) {
	return pos.x >= 0.0 && pos.x < u_gridDims.x * u_h &&
		   pos.z >= 0.0 && pos.z < u_gridDims.z * u_h &&
		   pos.y >= 0.0 && pos.y < u_gridDims.y * u_h;
}
vec3 assembleForces( Particle particle  ) {

	// x = density // y = pressure // z = viscosity
	vec3 forces = vec3(0.0);
	vec3 surfaceTensionDirection = vec3(0.0);
	float surfaceTensionMagnitude = 0.0;
	vec3 offset = vec3(0.0);
	for (int x = -1; x < 2; x++ ) {
		for (int y = -1; y < 2; y++ ) {
			for (int z = -1; z < 2; z++ ) {
				vec3 offset = u_h * vec3( float(x), float(y), float(z) );
				vec3 queryPosition = particle.position + offset;
				vec3 toQuery = (queryPosition - particle.position);
				
				vec2 voxelUV = getVoxelUV( particle.position + offset );
				vec4 particleIndices = texture2D( u_voxelGrid, voxelUV);
				bool isVoxelEmpty = true;
				if( particleIndices.r >= 0.0 ) {
					Particle r = lookupParticle( unpackIndex( particleIndices.r ));
					forces += calcNeighborForces( particle, r );
					// vec3 toNeighbor = normalize(r.position - particle.position);
					isVoxelEmpty = false;
					surfaceTensionDirection += toQuery;// * 0.25;
					// surfaceTensionMagnitude -= 0.25;
				}
				if( isVoxelEmpty ) {
					surfaceTensionMagnitude += 1.0;
					// surfaceTensionMagnitude += 1.0;
				}
				if( particleIndices.g >= 0.0 ) {
					Particle g = lookupParticle( unpackIndex( particleIndices.g ));
					forces += calcNeighborForces( particle, g );
					// vec3 toNeighbor = normalize(g.position - particle.position);
					// surfaceTensionDirection += toNeighbor * 0.25;
					// surfaceTensionMagnitude -= 0.25;					
				}
				if( particleIndices.b >= 0.0 ) { 
					Particle b = lookupParticle( unpackIndex( particleIndices.b ));
					forces += calcNeighborForces( particle, b );
					// vec3 toNeighbor = normalize(b.position - particle.position);
					// surfaceTensionDirection += toNeighbor * 0.25;
					// surfaceTensionMagnitude -= 0.25;					
				}
				
				if( particleIndices.a >= 0.0 ) {
					Particle a = lookupParticle( unpackIndex( particleIndices.a ));
					forces += calcNeighborForces( particle, a );
					// vec3 toNeighbor = normalize(a.position - particle.position);
					// surfaceTensionDirection += toNeighbor * 0.25;
					// surfaceTensionMagnitude -= 0.25;					
				}
							
			}
		}
	}
	if( length(surfaceTensionDirection) > 0.0 ) {
		forces += normalize(surfaceTensionDirection) * u_surfaceTension * pow(surfaceTensionMagnitude, 2.0);
	}
	return forces;
}

vec3 getBoundaryForces( vec3 myPosition) {
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

Particle applyCollisions( Particle p ) {
	vec4 posProjectorSpace = u_projectorViewMat * vec4(p.position, 1.0);

	// coordinate of gBuffer covered by particle 
	vec4 posClipSpace = u_projectorProjectionMat * posProjectorSpace;
	posClipSpace = posClipSpace / posClipSpace.w;
	vec2 uv = posClipSpace.xy * 0.5 + 0.5;

	// distance from projector to covered pixel in gBuffer
	float sceneDist = texture2D( u_sceneDepth, uv ).r;
	vec3 particleToProjector = p.position - u_projectorPos;
	float particleDepth = length(particleToProjector);
	float wallDist = (sceneDist - particleDepth);

	// return vec3(particleDepth );
	// if particle is within support radius of the pixel it covers:
	if ( wallDist < 0.0 ) { 
		vec3 sceneNormal = texture2D( u_sceneNormals, uv ).rgb;
		sceneNormal = -normalize(sceneNormal);
		p.position = p.position + (wallDist) * sceneNormal;
		p.velocity -= (1.0 + (0.0001 * abs(wallDist) / (dT * length(p.velocity)))) * dot(p.velocity, sceneNormal) * sceneNormal;
		p.velocity *= 0.99;
	}

	return p;

}

vec3 getCollisionForce( Particle p ) {
	vec4 posProjectorSpace = u_projectorViewMat * vec4(p.position, 1.0);

	// coordinate of gBuffer covered by particle 
	vec4 posClipSpace = u_projectorProjectionMat * posProjectorSpace;
	posClipSpace = posClipSpace / posClipSpace.w;
	vec2 uv = posClipSpace.xy * 0.5 + 0.5;

	// distance from projector to covered pixel in gBuffer
	float sceneDist = texture2D( u_sceneDepth, uv ).r;
	vec3 particleToProjector = p.position - u_projectorPos;
	float particleDepth = length(particleToProjector);
	float wallDist = (sceneDist - particleDepth);
	wallDist = max(wallDist, -u_h);

	// return vec3(particleDepth );
	// if particle is within support radius of the pixel it covers:
	if ( wallDist < u_h ) { //TODO fuks wit me
		vec3 sceneNormal = texture2D( u_sceneNormals, uv ).rgb;
		sceneNormal = normalize(sceneNormal);
		return  0.02 * ( pow( wallDist / u_h, 2.0) ) * sceneNormal / dT2;
	}

	return vec3(0.0);
}

vec4 getVoxel( vec3 position ) {
	vec2 voxelUV = getVoxelUV( position );
	return texture2D( u_voxelGrid, voxelUV);
}

//---------------------------------------------------------------MAIN:

void main() {

	Particle particle = lookupParticle( v_texCoord );
	vec2 uv = getVoxelUV( particle.position );//TEMP
	vec3 forces = vec3(0.0, 0.0, 0.0);
	//Get pressure and viscosity forces
		forces += assembleForces( particle );
		// forces += getCollisionForce( particle );
	// Apply gravity
		forces += vec3(0.0, -9.8, 0.0);
	//Collide with floor/walls
		// forces +=  getBoundaryForces( particle.position );
	particle.velocity = particle.velocity + forces;
	// if( length(particle.velocity) > )
	particle.position = particle.position + particle.velocity * dT2;
	particle = applyCollisions( particle );

	gl_FragData[0] = vec4( particle.position, 1.0 );
	gl_FragData[1] = vec4( particle.velocity, 1.0 );
	gl_FragData[2] = vec4( particle.density , 0.0, 1.0);
	// gl_FragData[2] = voxelData;

}