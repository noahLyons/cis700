var ParticleSystem = [];

(function(){

//--------------------------------------------------CONSTANTS/FIELDS:

	

//------------------------------------------------------CONSTRUCTORS:

	function particleSystem(maxVelocity){
		var half = 512;
		this.Max_Particles = half * half;
		this.particles = [];
		this.maxVelocity = 1.0;
		this.minVelocity = -1.0;
		this.init();
	    
	}
	
//-----------------------------------------------------------METHODS:

	particleSystem.prototype = {
		 getStartingVelocity : function(maxVelocity){
		    var theta = Math.random() * Math.PI;
		    var phi = 2 * (Math.random() * Math.PI - Math.PI / 2);
		    var x = Math.cos(phi)*Math.cos(theta);
		    var y = Math.sin(phi);
		    var z = Math.cos(phi)*Math.sin(theta);
		    return vec3.fromValues(x,y,z);
		},

		init : function(){
			var i, il;

	    	for(i = 0, il = this.Max_Particles; i < il; i++){
	       		var random = this.getStartingVelocity(Math.random() * this.maxVelocity);
	       		this.particles.push(new Particle(random));
	       	}
	    },
	
		update : function(time){
			var i, il;
			for(i = 0, il = this.Max_Particles; i < il; i++){
				this.particles[i].update();
			}
		}

	}

	ParticleSystem = particleSystem;
})();