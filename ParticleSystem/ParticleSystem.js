var ParticleSystem = [];

(function(){

//-------------------------------------------------------CONSTANTS/FIELDS:

	

//-----------------------------------------------------------CONSTRUCTORS:

	function particleSystem(maxVelocity) {

		this.rowLength = 512;
		this.maxParticles = this.rowLength * this.rowLength;
		
		this.particles = [];
		this.velocities = [];
		this.textureMemoryLocation = [];

		this.maxVelocity = 1.0;
		this.minVelocity = -1.0;

		this.init();
	}
	
//----------------------------------------------------------------METHODS:

	particleSystem.prototype = {
		
		getStartingVelocity : function() {

		    var theta = Math.random() * Math.PI;
		    var phi = 2 * (Math.random() * Math.PI - Math.PI / 2);
		    var x = Math.cos(phi)*Math.cos(theta);
		    var y = Math.sin(phi);
		    var z = Math.cos(phi)*Math.sin(theta);
		    return vec3.fromValues(x,y,z);
		},

		init : function() {

			var i, max_parts = this.maxParticles;

	    	for(i = 0; i < max_parts; i++) {

	       		var startingVelocity = this.getStartingVelocity();

	       		
	       		var particle = new Particle(startingVelocity);

	       		this.velocities.push(particle.v0[0]);
	       		this.velocities.push(particle.v0[1]);
	       		this.velocities.push(particle.v0[2]);
	       		
	       		var xIndex = Math.floor(i % this.rowLength) / this.rowLength ;
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