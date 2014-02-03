var Particle = [];

(function(){

//--------------------------------------------------CONSTANTS/FIELDS:


//------------------------------------------------------CONSTRUCTORS:

	function particle(initialVelocity) {

		this.position = [0,0,0];
		this.acceleration = [0,-9.8,0];
		this.v0 = initialVelocity;
		this.life = 0.0;
		this.lifeSpan = Math.random() * 10;
		this.output = vec3.create();
	}
	
//-----------------------------------------------------------METHODS:

	particle.prototype = {
		
		update : function() {

			this.life += 0.016;
			if(this.position[1] <= -1) this.position[1] = -1;
			else {
				vec3.scale(this.position,this.v0,this.life);
				var time = this.life * this.life;
				time *= 0.5;
				vec3.scale(this.output,this.acceleration,time);
				vec3.add(this.position,this.position,this.output);
			}
			if(this.life >= this.lifeSpan){
				this.life = 0;
				this.position[0] = 0;
				this.position[1] = 0;
				this.position[2] = 0;
			} 
		}
	}
	Particle = particle;
})();