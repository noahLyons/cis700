/*
	moveParticles()	
		-applyGravity()
		-applyViscosity()
		-save old pos
		-advance to new, predicted pos 
	relaxParticles() 
		-apply positional constraints:
			-adjustSprings
				-add/remove
				-change rest lengths
			-applySprings()
			-doubleDensityRelaxation()
				-collisions?
			-incompressibilityRelaxation()
		recomputeVelocities() 





		doubleDensityRelaxation() {
			//4.1
			-count number of particles within distance h to calc density
				-density = foreach neighbor { (1 - dist/h)^2 }
				-near-density = foreach neighbor { (1 - dist/h)^3 } //4.3
				-pressure = k(density - restDensity)
				-near-pressure = k-near * near-density //4.3
			-compare to rest density
				//4.2
				-if larger, push neighbors away
				-else, pull closer
		}
		incompressibilityRelaxation() {
			//4.3
			foreach neighbor {
				pressureDisplacement
				nearPressureDisplacement
				//something else
			}
	}
*/

var SEC3 = SEC3 || {};

SEC3.SPH = function(specs) {

//-----------------------------------------------------------------CONSTANTS/FIELDS:
	
	this.isSrcIndex0 = true;

	this.movementFBOs = [];
	// slot 0: position
	// slot 1: velocity
	
	this.systemFBO = {};
	// slot 0: indices

	this.textureResolution = SEC3.math.roundUpToPower( specs.numParticles, 2);
	this.textureSideLength = Math.sqrt( this.textureResolution );
	this.numParticles = specs.numParticles;

	this.RGBA = specs.RGBA;	
	this.particleSize = specs.particleSize;

	this.gravity = specs.gravity;
	this.pressureK = specs.pressureK;
	this.nearPressureK = specs.nearPressureK;

	this.initFBOs();
	this.initShaders();

};
//--------------------------------------------------------------------------METHODS:

SEC3.SPH.prototype = {

//------------------------------------------------------------------------PASSES YO:
	
	draw : function( scene, framebuffer ) {

		var width = framebuffer != null ? framebuffer.getWidth() : SEC3.canvas.width;
		var height = framebuffer != null ? framebuffer.getWidth() : SEC3.canvas.height;
		gl.useProgram(this.renderProgram.ref());
	    gl.viewport(0, 0, width, height );
	   
	    gl.activeTexture(gl.TEXTURE0);
	    gl.bindTexture(gl.TEXTURE_2D, this.movementFBOs[0].texture(0));
	    gl.uniform1i( this.renderProgram.uPosLoc, 0);
	   	   
	    gl.uniformMatrix4fv(this.renderProgram.uMVPLoc, false, scene.getCamera().getMVP());

	    if (framebuffer)  framebuffer.bind(gl);
	    else   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	   
	    gl.disable(gl.DEPTH_TEST);
	    gl.enable(gl.BLEND);
	    gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
	   	//TODO eliminate
	    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
	    gl.vertexAttribPointer(this.renderProgram.particleIndexAttribute, 2, gl.FLOAT, false, 0, 0); 
	    gl.enableVertexAttribArray(this.renderProgram.particleIndexAttribute); 

		gl.drawArrays( gl.POINTS, 0, this.numParticles );
	},

//----------------------------------------------------------------------------SETUP:

	genStartPositions : function() {

		var startPositions = [];
		
    	for(var i = 0; i < this.numParticles; i++) {

       		var position = this.getUniformPointInSphere(2.0);

       		startPositions.push(position[0]);
       		startPositions.push(position[1]);
       		startPositions.push(position[2]);
       		startPositions.push(Math.random());
       	}
       	return startPositions;
    },

    genStartVelocities : function() {

    	var startVelocities = [];
    	for( var i = 0; i < this.numParticles; i++ ) {
    		startVelocities.push( 0.0 );
    		startVelocities.push( 0.0 );
    		startVelocities.push( 0.0 );
    		startVelocities.push( 1.0 );
    	}
    	return startVelocities;
    },

    genParticleIndices : function() {

    	var indices = [];
    	var textureLength = this.textureSideLength;
    	for (var i = 0; i < this.numParticles; i++) {

       		var xIndex = Math.floor(i % textureLength) / textureLength;
	        var yIndex = i / this.numParticles; 
       		indices.push(xIndex);
       		indices.push(yIndex);
    	}
    	return indices;
    },

	getUniformPointInSphere : function(radius) {

		var radiusSquared = radius * radius;
		var squareLength = radiusSquared + 1;
		var x, y, z, vec;

		while(squareLength > radiusSquared) {
			x = (Math.random() - 0.5) * 2.0;
			y = (Math.random() - 0.5) * 2.0;
			z = (Math.random() - 0.5) * 2.0;
			vec = vec3.fromValues(x,y,z);
			vec3.scale(vec, vec, radius); 
			squareLength = vec3.dot(vec, vec);
		}
		return vec;
	},

	initFBOs : function() {

		var startPositions = this.genStartPositions();
		var indices = this.genParticleIndices();
		var startVelocities = this.genStartVelocities();

		var positionTextureA = SEC3.generateTexture(this.textureSideLength,
													this.textureSideLength,
													startPositions);
		var positionTextureB = SEC3.generateTexture(this.textureSideLength,
													this.textureSideLength);

		var velocityTextureA = SEC3.generateTexture(this.textureSideLength,
													this.textureSideLength,
													startVelocities);
		var velocityTextureB = SEC3.generateTexture(this.textureSideLength,
													this.textureSideLength);
		this.movementFBOs = [];

		var movementFBOa = SEC3.createFBO();
		movementFBOa.initialize( gl, this.textureSideLength,
								this.textureSideLength,
								2,
								[ positionTextureA, 
								velocityTextureA ]		);	
		this.movementFBOs.push(movementFBOa)

		var movementFBOb = SEC3.createFBO();
		movementFBOa.initialize( gl, this.textureSideLength,
								this.textureSideLength,
								2,
								[ positionTextureB, 
								velocityTextureB ]);	
		this.movementFBOs.push(movementFBOb)

		this.systemFBO = SEC3.createFBO
		this.systemFBO.initialize( gl, this.textureSideLength,
								  this.textureSideLength,
								  1 );
	},

	initShaders : function() {
		var indices = this.genParticleIndices();

		//-------------------------------------------------MOVE:
		// var moveProgram = SEC3.createShaderProgram();
		// moveProgram.loadShader(gl,
		// 					   "Sec3Engine/shader/moveSPH.vert",
		// 					   "Sec3Engine/shader/moveSPH.frag");
		// SEC3.registerAsyncObj( gl, moveProgram );
		// this.moveProgram = moveProgram;

		// //-------------------------------------------------RELAX:
		// var relaxProgram = SEC3.createShaderProgram();
		// relaxProgram.loadShader(gl, 
		// 						"Sec3Engine/shader/relaxSPH.vert",
		// 						"Sec3Engine/shader/relaxSPH.frag");
		// SEC3.registerAsyncObj( gl, relaxProgram );
		// this.relaxProgram = relaxProgram;

		// //-------------------------------------RECOMPUTE VELOCITY:
		// var recompVelocitiesProgram = SEC3.createShaderProgram();
		// recompVelocitiesProgram.loadShader(gl, 
		// 								   "Sec3Engine/shader/recompVelocitiesSPH.vert",
		// 						   		   "Sec3Engine/shader/recompVelocitiesSPH.frag");
		// SEC3.registerAsyncObj( gl, recompVelocitiesProgram );
		// this.recompVelocitiesProgram = recompVelocitiesProgram;

		//-------------------------------------------------RENDER:
		var renderProgram = SEC3.createShaderProgram();
		renderProgram.loadShader(gl, 
								 "Sec3Engine/shader/renderSPH.vert",
								 "Sec3Engine/shader/renderSPH.frag");
		renderProgram.addCallback( function() {
	        renderProgram.aIndexLoc = gl.getAttribLocation(renderProgram.ref(), "a_index");
	        renderProgram.uMVPLoc = gl.getUniformLocation(renderProgram.ref(), "u_MVP");
	        renderProgram.uPosLoc = gl.getUniformLocation(renderProgram.ref(), "u_pos");
	        gl.useProgram( renderProgram.ref() );
			indexBuffer = SEC3.createBuffer(2, //item size
	                          this.numParticles, //num items
	                          indices, //data
	                          renderProgram.aIndexLoc); //location

	    } );
		SEC3.registerAsyncObj( gl, renderProgram );
		this.renderProgram = renderProgram;
	}


};

