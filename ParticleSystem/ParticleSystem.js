var ParticleSystem = [];

(function(){

//-------------------------------------------------------CONSTANTS/FIELDS:

	

//-----------------------------------------------------------CONSTRUCTORS:

	function particleSystem(maxVelocity) {

		this.textureSideLength = 128;
		this.maxParticles = this.textureSideLength * this.textureSideLength;
		
		this.particles = [];
		this.velocities = [];
		this.accelerations = []; 
		this.startPositions = [];
		this.textureMemoryLocation = [];
		this.maxAcceleration = 0.05;
		this.maxVelocity = 2.0;
		this.minVelocity = -0.0014;

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