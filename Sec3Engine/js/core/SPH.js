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
	this.srcIndex = 0;
	this.destIndex = 1;

	this.movementFBOs = [];
	// slot 0: position
	// slot 1: velocity
	
	this.indexFBO = {};
	this.densityFBO = {};

	this.textureResolution = SEC3.math.roundUpToPower( specs.numParticles, 2);
	this.textureSideLength = Math.sqrt( this.textureResolution );
	this.numParticles = specs.numParticles;

	this.RGBA = specs.RGBA;	
	this.particleSize = specs.particleSize;

	this.h = specs.h;
	this.gravity = specs.gravity;
	this.pressureK = specs.pressureK;
	this.nearPressureK = specs.nearPressureK;

	this.ext = gl.getExtension("ANGLE_instanced_arrays"); // Vendor prefixes may apply!

	this.initFBOs();
	this.initShaders();


};
//--------------------------------------------------------------------------METHODS:

SEC3.SPH.prototype = {

//------------------------------------------------------------------------PASSES YO:

	draw : function( scene, framebuffer ) {

	    if (framebuffer)  framebuffer.bind(gl);
	    else   gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		var width = framebuffer != null ? framebuffer.getWidth() : SEC3.canvas.width;
		var height = framebuffer != null ? framebuffer.getWidth() : SEC3.canvas.height;
	    gl.viewport(0, 0, width, height );
	   
	   	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
	    gl.enable(gl.DEPTH_TEST);
	    gl.disable(gl.BLEND);
	    // gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
		gl.useProgram(this.renderProgram.ref());
	    gl.activeTexture(gl.TEXTURE0);
	    gl.bindTexture(gl.TEXTURE_2D, this.movementFBOs[this.srcIndex].texture(0));
	    gl.uniform1i( this.renderProgram.uPositionsLoc, 0);

	    gl.activeTexture(gl.TEXTURE1);
	    gl.bindTexture(gl.TEXTURE_2D, this.densityFBO.texture(0));
	    gl.uniform1i( this.renderProgram.uTestTexLoc, 1 );
	   	   
	    gl.uniformMatrix4fv(this.renderProgram.uMVPLoc, false, scene.getCamera().getMVP());

	   	//TODO eliminate
	    gl.bindBuffer(gl.ARRAY_BUFFER, this.renderProgram.indexBuffer);
	    gl.enableVertexAttribArray(this.renderProgram.aIndexLoc); 
	    gl.vertexAttribPointer(this.renderProgram.aIndexLoc, 2, gl.FLOAT, false, 0, 0); 
	    this.ext.vertexAttribDivisorANGLE(this.renderProgram.aIndexLoc, 1);

	    //----------------------------------------INSTANCE EXTENSION:

		// Bind the rest of the vertex attributes normally
		//----------------DRAW MODEL:

        gl.bindBuffer( gl.ARRAY_BUFFER, model_vertexVBOs[0] );
        gl.vertexAttribPointer( this.renderProgram.aGeometryVertsLoc, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( this.renderProgram.aGeometryVertsLoc );

         //Bind vertex normal buffer
        gl.bindBuffer( gl.ARRAY_BUFFER, model_normalVBOs[0] );
        gl.vertexAttribPointer( this.renderProgram.aGeometryNormalsLoc, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( this.renderProgram.aGeometryNormalsLoc );

        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, model_indexVBOs[0] );
		this.ext.drawElementsInstancedANGLE(gl.TRIANGLES, model_indexVBOs[0].numIndex, gl.UNSIGNED_SHORT, 0, this.numParticles);
        // gl.drawElements( gl.TRIANGLES, model_indexVBOs[i].numIndex, gl.UNSIGNED_SHORT, 0 );

        gl.bindBuffer( gl.ARRAY_BUFFER, null );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );    
    

		// gl.drawArrays( gl.POINTS, 0, this.numParticles );
		
		gl.flush();
		this.swapSrcDestIndices();
	},

	move : function( scene, framebuffer ) {

	    gl.useProgram( this.moveProgram.ref() );
	    SEC3.renderer.bindQuadBuffers( this.moveProgram );
	   	this.movementFBOs[this.destIndex].bind(gl);
	   	// gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	    gl.viewport(0, 0, this.textureSideLength, this.textureSideLength);
	    gl.disable(gl.DEPTH_TEST);
	    gl.disable(gl.BLEND);
	    
	    gl.activeTexture(gl.TEXTURE0);
	    gl.bindTexture(gl.TEXTURE_2D, this.movementFBOs[this.destIndex].texture(0));
	    gl.uniform1i(this.moveProgram.uPositionsLoc, 0);

	    gl.activeTexture(gl.TEXTURE1);
	    gl.bindTexture(gl.TEXTURE_2D, this.movementFBOs[this.srcIndex].texture(1));
	    gl.uniform1i(this.moveProgram.uVelocityLoc, 1);
	   	
	    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0); 
	    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    	gl.bindBuffer( gl.ARRAY_BUFFER, null );
	    // this.swapSrcDestIndices();
	},

	updateDensity : function () {

		gl.useProgram( this.densityProgram.ref() );
		SEC3.renderer.bindQuadBuffers( this.densityProgram );
		// gl.bindFramebuffer( gl.FRAMEBUFFER, null);
		this.densityFBO.bind(gl);
		gl.viewport(0, 0, this.textureSideLength, this.textureSideLength);
	    gl.disable(gl.DEPTH_TEST);
	    gl.disable(gl.BLEND);
	    
	    gl.uniform1f( this.densityProgram.uHLoc, this.h );

	    gl.activeTexture(gl.TEXTURE0);
	    gl.bindTexture(gl.TEXTURE_2D, this.movementFBOs[this.srcIndex].texture(0));
	    gl.uniform1i(this.densityProgram.uPositionsLoc, 0);

	    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0); 
	    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    	gl.bindBuffer( gl.ARRAY_BUFFER, null );
    	
	},

	updateVelocities : function () {

		gl.useProgram( this.velocityProgram.ref() );
		SEC3.renderer.bindQuadBuffers( this.velocityProgram );
		// gl.bindFramebuffer( gl.FRAMEBUFFER, null);
		this.movementFBOs[this.destIndex].bind(gl);
		gl.viewport(0, 0, this.textureSideLength, this.textureSideLength);
	    gl.disable(gl.DEPTH_TEST);
	    gl.disable(gl.BLEND);
	    
	    gl.uniform1f( this.velocityProgram.uHLoc, this.h );

	    gl.activeTexture(gl.TEXTURE0);
	    gl.bindTexture(gl.TEXTURE_2D, this.movementFBOs[this.srcIndex].texture(0));
	    gl.uniform1i(this.velocityProgram.uPositionsLoc, 0);

	    gl.activeTexture(gl.TEXTURE1);
	    gl.bindTexture(gl.TEXTURE_2D, this.movementFBOs[this.srcIndex].texture(1));
	    gl.uniform1i(this.velocityProgram.uVelocityLoc, 1);

	    gl.activeTexture(gl.TEXTURE2);
	    gl.bindTexture(gl.TEXTURE_2D, this.densityFBO.texture(0));
	    gl.uniform1i(this.velocityProgram.uDensitiesLoc, 2);

	    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0); 
	    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    	gl.bindBuffer( gl.ARRAY_BUFFER, null );

	},

//----------------------------------------------------------------------------SETUP:

	genStartPositions : function() {

		var startPositions = [];
		
    	for(var i = 0; i < this.numParticles; i++) {

       		var position = this.getUniformPointInSphere(this.particleSize);

       		startPositions.push(position[0]);
       		startPositions.push(position[1]);
       		startPositions.push(position[2]);
       		startPositions.push( 1.0 );
       	}
       	return startPositions;
    },

    genCubeStartPositions : function () {

    	var scale = 1/ 60; //TODO slider
    	var width = 16;
    	var height = 16;
    	var depth = 16;

		var startPositions = [];
    	for ( var i = 0; i < width; i++) {
    		for ( var j = 0; j < height; j++ ) {
    			for ( var k = 0; k < depth; k++ ) {
    				startPositions.push(i * scale);
    				startPositions.push(j * scale);
    				startPositions.push(k * scale);
    				startPositions.push( 1.0 );
    			}
    		}
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

		var startPositions = this.genCubeStartPositions();
		var indices = this.genParticleIndices();
		var startVelocities = this.genStartVelocities();

		var positionTextureA = SEC3.generateTexture(this.textureSideLength,
													this.textureSideLength,
													startPositions);
		var positionTextureB = SEC3.generateTexture(this.textureSideLength,
													this.textureSideLength
													);

		var velocityTextureA = SEC3.generateTexture(this.textureSideLength,
													this.textureSideLength,
													startVelocities);
		var velocityTextureB = SEC3.generateTexture(this.textureSideLength,
													this.textureSideLength
													);
		this.movementFBOs = [];

		var movementFBOa = SEC3.createFBO();
		movementFBOa.initialize( gl, this.textureSideLength,
								this.textureSideLength,
								2,
								[ positionTextureA, 
								velocityTextureA ]		);	
		this.movementFBOs.push(movementFBOa)

		var movementFBOb = SEC3.createFBO();
		movementFBOb.initialize( gl, this.textureSideLength,
								this.textureSideLength,
								2,
								[ positionTextureB, 
								velocityTextureB ]);	
		this.movementFBOs.push(movementFBOb)

		this.indexFBO = SEC3.createFBO();
		this.indexFBO.initialize( gl, this.textureSideLength,
								  this.textureSideLength,
								  1 );

		this.densityFBO = SEC3.createFBO();
		this.densityFBO.initialize( gl, this.textureSideLength,
								  this.textureSideLength,
								  1 );
	},

	initShaders : function() {
		var indices = this.genParticleIndices();
		var self = this;
		// -------------------------------------------------MOVE:
		var moveProgram = SEC3.createShaderProgram();
		moveProgram.loadShader(gl,
							   "Sec3Engine/shader/moveSPH.vert",
							   "Sec3Engine/shader/moveSPH.frag");
		moveProgram.addCallback( function() {
			moveProgram.aVertexPosLoc = gl.getAttribLocation( moveProgram.ref(), "a_pos" );
	        moveProgram.aVertexTexcoordLoc = gl.getAttribLocation( moveProgram.ref(), "a_texCoord" );
	        moveProgram.uPositionsLoc = gl.getUniformLocation( moveProgram.ref(), "u_positions" );
	        moveProgram.uVelocityLoc = gl.getUniformLocation( moveProgram.ref(), "u_velocity" );
	        moveProgram.uGravityLoc = gl.getUniformLocation( moveProgram.ref(), "u_gravity" );
	        moveProgram.uHLoc = gl.getUniformLocation( moveProgram.ref(), "h" );
	        gl.useProgram( moveProgram.ref() );
	        gl.uniform1f( moveProgram.uGravityLoc, self.gravity );

		} );
		SEC3.registerAsyncObj( gl, moveProgram );
		this.moveProgram = moveProgram;

		// //-------------------------------------------------UPDATE DENSITIES:
		var densityProgram = SEC3.createShaderProgram();
		densityProgram.loadShader(gl, 
								"Sec3Engine/shader/densitySPH.vert",
								"Sec3Engine/shader/densitySPH.frag");
		densityProgram.addCallback( function() {
			densityProgram.aVertexPosLoc = gl.getAttribLocation( densityProgram.ref(), "a_pos" );
	        densityProgram.aVertexTexcoordLoc = gl.getAttribLocation( densityProgram.ref(), "a_texCoord" );
	        densityProgram.uPositionsLoc = gl.getUniformLocation( densityProgram.ref(), "u_positions" );
	        densityProgram.uHLoc = gl.getUniformLocation( densityProgram.ref(), "h" );
	        // densityProgram.uInvTextureLengthLoc = gl.getUniformLocation( densityProgram.ref(), "u_invTextureLength" );	        
	        // gl.useProgram( densityProgram.ref() );
	        // gl.uniform1f( densityProgram.uInvTextureLengthLoc, self.textureSideLength );

		} );
		SEC3.registerAsyncObj( gl, densityProgram );
		this.densityProgram = densityProgram;

		// //-------------------------------------RECOMPUTE VELOCITY:
		var velocityProgram = SEC3.createShaderProgram();
		velocityProgram.loadShader(gl, 
										   "Sec3Engine/shader/densitySPH.vert",
								   		   "Sec3Engine/shader/velocitySPH.frag");
		velocityProgram.addCallback( function() {
			velocityProgram.aVertexPosLoc = gl.getAttribLocation( velocityProgram.ref(), "a_pos" );
	        velocityProgram.aVertexTexcoordLoc = gl.getAttribLocation( velocityProgram.ref(), "a_texCoord" );
	        velocityProgram.uPositionsLoc = gl.getUniformLocation( velocityProgram.ref(), "u_positions" );
	        velocityProgram.uVelocityLoc = gl.getUniformLocation( velocityProgram.ref(), "u_velocity" );
	        velocityProgram.uDensitiesLoc = gl.getUniformLocation( velocityProgram.ref(), "u_densities" );
	        // densityProgram.uInvTextureLengthLoc = gl.getUniformLocation( densityProgram.ref(), "u_invTextureLength" );	        
	        // gl.useProgram( densityProgram.ref() );
	        // gl.uniform1f( densityProgram.uInvTextureLengthLoc, self.textureSideLength );

		} );
		SEC3.registerAsyncObj( gl, velocityProgram );
		this.velocityProgram = velocityProgram;

		//-------------------------------------------------RENDER:
		var renderProgram = SEC3.createShaderProgram();
		renderProgram.loadShader(gl, 
								 "Sec3Engine/shader/renderSPH.vert",
								 "Sec3Engine/shader/renderSPH.frag");
		renderProgram.addCallback( function() {
	        renderProgram.aIndexLoc = gl.getAttribLocation(renderProgram.ref(), "a_index");
	        renderProgram.aGeometryVertsLoc = gl.getAttribLocation(renderProgram.ref(), "a_GeometryVerts");
	        renderProgram.aGeometryNormalsLoc = gl.getAttribLocation(renderProgram.ref(), "a_GeometryNormals");

	        renderProgram.uMVPLoc = gl.getUniformLocation(renderProgram.ref(), "u_MVP");
	        renderProgram.uPositionsLoc = gl.getUniformLocation(renderProgram.ref(), "u_positions");
	        renderProgram.uTestTexLoc = gl.getUniformLocation(renderProgram.ref(), "u_testTex");	        
	        gl.useProgram( renderProgram.ref() );
			renderProgram.indexBuffer = SEC3.createBuffer(2, //item size
	                          self.numParticles, //num items
	                          indices, //data
	                          renderProgram.aIndexLoc); //location

	    } );
		SEC3.registerAsyncObj( gl, renderProgram );
		this.renderProgram = renderProgram;
	},

//--------------------------------------------------------------------------HELPERS:
	
	/*
	 * Updates/toggles globals srcIndex and destIndex
	 */
	swapSrcDestIndices : function() {

	    this.isSrcIndex0 = ! this.isSrcIndex0;

	    if (this.isSrcIndex0) {
	        this.srcIndex = 0;
	        this.destIndex = 1;
	    }
	    else {
	        this.srcIndex = 1;
	        this.destIndex = 0;
	    }
	}
};

