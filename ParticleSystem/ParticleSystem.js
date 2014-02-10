var ParticleSystem = [];

(function(){

//-------------------------------------------------------CONSTANTS/FIELDS:

	/*


float duration; 		 The duration of the particle system in seconds
emissionRate			// The rate of emission.
enableEmission			When set to false, the particle system will not emit particles.
gravityModifier			Scale being applied to the gravity defined by Physics.gravity.
isPaused				Is the particle system paused right now ?
isPlaying				Is the particle system playing right now ?
isStopped				Is the particle system stopped right now ?
loop					Is the particle system looping?
maxParticles			The maximum number of particles to emit.
particleCount			The current number of particles (Read Only).
playbackSpeed			The playback speed of the particle system. 1 is normal playback speed.
playOnAwake				If set to true, the particle system will automatically start playing on startup.
randomSeed				Random seed used for the particle system emission. If set to 0, it will be assigned a random value on awake.
safeCollisionEventSize	Safe array size for use with ParticleSystem.GetCollisionEvents.
simulationSpace			This selects the space in which to simulate particles. It can be either world or local space.
startColor				The initial color of particles when emitted.
startDelay				Start delay in seconds.
startLifetime			The total lifetime in seconds that particles will have when emitted. When using curves, this values acts as a scale on the curve. This value is set in the particle when it is create by the particle system.
startRotation			The initial rotation of particles when emitted. When using curves, this values acts as a scale on the curve.
startSize				The initial size of particles when emitted. When using curves, this values acts as a scale on the curve.
startSpeed				The initial speed of particles when emitted. When using curves, this values acts as a scale on the curve.
time					Playback position in seconds.


	*/

//-----------------------------------------------------------CONSTRUCTORS:

	function particleSystem(count,massMultiplier) {

		this.textureSideLength = count;
		this.maxParticles = this.textureSideLength * this.textureSideLength;
		
		this.particles = [];
		this.velocities = [];
		this.accelerations = []; 
		this.startPositions = [];
		this.textureMemoryLocation = [];
		this.maxAcceleration = 0.05;
		this.maxVelocity = 2.0;
		this.minVelocity = -0.0014;
		this.massMultiplier = massMultiplier;
		this.init();
	}
	
//----------------------------------------------------------------METHODS:

	particleSystem.prototype = {
		
		getStartingVelocity : function() {

		    var theta = Math.random() * Math.PI * 2.0;
		    var phi = (Math.random() * ((Math.PI * 1.0)));// - (Math.PI / 4)));
		    var x = this.maxVelocity * Math.sin(phi)*Math.cos(theta);
		    var z = this.maxVelocity * Math.cos(phi);
		    var y = this.maxVelocity * Math.sin(phi)*Math.sin(theta);
		    x = 2.0 * ( Math.random() - 0.5);
		    y = 2.0 * ( Math.random() - 0.5);
		    z = 2.0 * (Math.random() - 0.5);

		    var result = vec3.fromValues(x,y,z);
		    vec3.normalize(result,result);
		    return result;
		},
		getRandomVec3 : function() {
			var x = (Math.random() - 0.5) * this.maxAcceleration;
			var y = (Math.random() - 0.5) * this.maxAcceleration;
			var z = (Math.random() - 0.5) * this.maxAcceleration;
			return vec3.fromValues(x,y,z);
		},

		init : function() {

			var i, max_parts = this.maxParticles;

	    	for(i = 0; i < max_parts; i++) {

	       		var startingVelocity = this.getStartingVelocity();
	       		var startingAcceleration = this.getRandomVec3();
	       		
	       		var particle = new Particle(startingVelocity);

	       		this.accelerations.push(startingAcceleration[0]);
	       		this.accelerations.push(startingAcceleration[1]);
	       		this.accelerations.push(startingAcceleration[2]);
	       		

	       		this.velocities.push(0.0);
	       		this.velocities.push(0.0);
	       		this.velocities.push(0.0);
	       		this.velocities.push(1.0);

	       		this.startPositions.push(particle.v0[0]);
	       		this.startPositions.push(particle.v0[1]);
	       		this.startPositions.push(particle.v0[2]);
	       		this.startPositions.push(Math.random());

	       		var xIndex = Math.floor(i % this.textureSideLength) / this.textureSideLength ;
		        var yIndex = i / this.maxParticles; 

	       		this.textureMemoryLocation.push(xIndex);
	       		this.textureMemoryLocation.push(yIndex);
	       	}
	    },
	
		update : function(time) {
			var i, il;
			for(i = 0, il = this.maxParticles; i < il; i++){
				this.particles[i].update();
			}
		}
	}
	ParticleSystem = particleSystem;
})();