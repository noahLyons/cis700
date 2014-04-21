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
	this.gridTextureWidth = specs.gridTextureWidth;
	this.gridTextureHeight = specs.gridTextureHeight;


	this.RGBA = specs.RGBA;	
	this.particleSize = specs.particleSize;

	this.stepsPerFrame = specs.stepsPerFrame;
	this.h = specs.h;
	this.gravity = specs.gravity;
	this.pressureK = specs.pressureK;
	this.restDensity = specs.restDensity;
	this.viscosityK = specs.viscosityK;
	this.restPressure = specs.restPressure;
	this.grid = {};

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
	    gl.bindTexture(gl.TEXTURE_2D, this.movementFBOs[this.destIndex].texture(0));
	    gl.uniform1i( this.renderProgram.uPositionsLoc, 0);

	    gl.activeTexture(gl.TEXTURE1);
	    gl.bindTexture(gl.TEXTURE_2D, this.movementFBOs[this.destIndex].texture(2));
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
		
		
		
	},

	updateBuckets : function () {

		gl.useProgram( this.bucketProgram.ref() );
		this.bucketFBO.bind(gl);
		gl.viewport(0, 0, this.gridTextureWidth, this.gridTextureHeight );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.renderProgram.indexBuffer );
		gl.vertexAttribPointer(this.bucketProgram.aIndexLoc, 2, gl.FLOAT, false, 0, 0); 
	    gl.enableVertexAttribArray(this.bucketProgram.aIndexLoc);

		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, this.indexFBO.texture(0) );
		gl.uniform1i( this.bucketProgram.uPositionsLoc, 0 );

		gl.uniform1f( this.bucketProgram.uTextureLengthLoc, this.textureSideLength );
		gl.uniform2f( this.bucketProgram.uGridTexDimsLoc, this.gridTextureWidth, this.gridTextureHeight);
		gl.uniform3f( this.bucketProgram.uGridDimsLoc, this.grid.xSpan, this.grid.ySpan, this.grid.zSpan );
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

		//Pass 1
		gl.disable( gl.BLEND );
		gl.enable( gl.DEPTH_TEST );
		gl.depthFunc( gl.LESS );
		gl.colorMask( false, true, true, true );
		gl.drawArrays( gl.POINTS, 0, this.numParticles );

		//Pass 2
		gl.depthFunc( gl.GREATER );
		gl.colorMask( true, false, true, true );
		gl.enable( gl.STENCIL_TEST );
		gl.stencilFunc(gl.GREATER, 1, 0x00 );
		gl.stencilOp( gl.INCR, gl.INCR, gl.INCR );
		gl.clearStencil( 1 );
		gl.drawArrays( gl.POINTS, 0, this.numParticles );

		//Pass 3
		gl.colorMask( true, true, false, true );
		gl.clearStencil( 1 );
		gl.drawArrays( gl.POINTS, 0, this.numParticles );

		//Pass 4
		gl.colorMask( true, true, true, false );
		gl.clearStencil( 1 );
		gl.drawArrays( gl.POINTS, 0, this.numParticles );

		gl.disable(gl.STENCIL_TEST);
		this.bucketFBO.unbind(gl);

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
	    
	   	gl.uniform2f( this.velocityProgram.uGridTexDimsLoc, this.gridTextureWidth, this.gridTextureHeight);
		gl.uniform3f( this.velocityProgram.uGridDimsLoc, this.grid.xSpan, this.grid.ySpan, this.grid.zSpan );
	    gl.uniform1f( this.velocityProgram.uRestDensityLoc, this.restDensity);
	    gl.uniform1f( this.velocityProgram.uViscosityKLoc, this.viscosityK);
	    gl.uniform1f( this.velocityProgram.uRestPressureLoc, this.restPressure);
	    gl.uniform1f( this.velocityProgram.uHLoc, this.h );
	    gl.uniform1f( this.velocityProgram.uKLoc, this.pressureK );
	    gl.uniform1f( this.velocityProgram.uStepsLoc, this.stepsPerFrame );
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
    	this.swapSrcDestIndices();
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

    	var scale = 1/ 40; //TODO slider
    	var width = 16;
    	var height = 64;
    	var depth = 16;

		var startPositions = [];
    	for ( var i = 0; i < width; i++) {
    		for ( var j = 0; j < height; j++ ) {
    			for ( var k = 0; k < depth; k++ ) {
    				startPositions.push(i * scale + 0.1);
    				startPositions.push(j * scale + 0.1);
    				startPositions.push(k * scale + 0.1);
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
    		startVelocities.push( -0.0 );
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

    genGridTexture : function() {

    	var xSpan = 16;
    	var ySpan = 16;
    	var zSpan = 16;
    	var sqrtY = Math.sqrt(ySpan);
    	this.grid.xSpan = xSpan;
    	this.grid.ySpan = ySpan;
    	this.grid.zSpan = zSpan;

    	this.gridTextureWidth = xSpan * sqrtY;
    	this.gridTextureHeight = zSpan * sqrtY;

    	
    	
    	var gridTexture = SEC3.generateTexture(this.gridTextureWidth, this.gridTextureHeight);
    	return gridTexture;
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
													this.textureSideLength,
													startPositions);

		var velocityTextureA = SEC3.generateTexture(this.textureSideLength,
													this.textureSideLength,
													startVelocities);
		var velocityTextureB = SEC3.generateTexture(this.textureSideLength,
													this.textureSideLength,
													startVelocities);


		this.movementFBOs = [];

		var movementFBOa = SEC3.createFBO();
		movementFBOa.initialize( gl, this.textureSideLength,
								this.textureSideLength,
								3,
								[ positionTextureA, 
								velocityTextureA]		);	
		this.movementFBOs.push(movementFBOa)

		var movementFBOb = SEC3.createFBO();
		movementFBOb.initialize( gl, this.textureSideLength,
								this.textureSideLength,
								3,
								[ positionTextureB, 
								velocityTextureB]);	
		this.movementFBOs.push(movementFBOb)

		this.indexFBO = SEC3.createFBO();
		this.indexFBO.initialize( gl, this.textureSideLength,
								  this.textureSideLength,
								  1 );

		this.densityFBO = SEC3.createFBO();
		this.densityFBO.initialize( gl, this.textureSideLength,
								  this.textureSideLength,
								  1 );

		var gridTex = this.genGridTexture();
		this.bucketFBO = SEC3.createFBO();
		this.bucketFBO.initialize( gl, this.gridTextureWidth,
								this.gridTextureHeight,
								1 );
		// this.bucketFBO.addStencil(gl);

	},

	initShaders : function() {
		var indices = this.genParticleIndices();
		var self = this;
		
		//--------------------------------------------------BUILD BUCKETS:)
		var bucketProgram = SEC3.createShaderProgram();
		bucketProgram.loadShader(gl,
								 "Sec3Engine/shader/bucketBuilderSPH.vert",
								 "Sec3Engine/shader/bucketBuilderSPH.frag");
		bucketProgram.addCallback( function() {
			bucketProgram.aIndexLoc = gl.getAttribLocation( bucketProgram.ref(), "a_index");
			bucketProgram.uPositionsLoc = gl.getUniformLocation( bucketProgram.ref(), "u_positions");
			bucketProgram.uTextureLengthLoc = gl.getUniformLocation( bucketProgram.ref(), "u_textureLength");
			bucketProgram.uGridDimsLoc = gl.getUniformLocation( bucketProgram.ref(), "u_gridDims");
			bucketProgram.uGridTexDimsLoc = gl.getUniformLocation( bucketProgram.ref(), "u_gridTexDims");

		})
		SEC3.registerAsyncObj( gl, bucketProgram );
		this.bucketProgram = bucketProgram;
		//-------------------------------------------------UPDATE DENSITIES:
		var densityProgram = SEC3.createShaderProgram();
		densityProgram.loadShader(gl, 
								"Sec3Engine/shader/densitySPH.vert",
								"Sec3Engine/shader/densitySPH.frag");
		densityProgram.addCallback( function() {
			densityProgram.aVertexPosLoc = gl.getAttribLocation( densityProgram.ref(), "a_pos" );
	        densityProgram.aVertexTexcoordLoc = gl.getAttribLocation( densityProgram.ref(), "a_texCoord" );
	        densityProgram.uPositionsLoc = gl.getUniformLocation( densityProgram.ref(), "u_positions" );
	        densityProgram.uHLoc = gl.getUniformLocation( densityProgram.ref(), "u_h" );
	        // densityProgram.uInvTextureLengthLoc = gl.getUniformLocation( densityProgram.ref(), "u_invTextureLength" );	        
	        // gl.useProgram( densityProgram.ref() );
	        // gl.uniform1f( densityProgram.uInvTextureLengthLoc, self.textureSideLength );

		} );
		SEC3.registerAsyncObj( gl, densityProgram );
		this.densityProgram = densityProgram;

		//-------------------------------------RECOMPUTE VELOCITY:
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
			velocityProgram.uHLoc = gl.getUniformLocation( velocityProgram.ref(), "u_h" );
			velocityProgram.uKLoc = gl.getUniformLocation( velocityProgram.ref(), "u_k");
			velocityProgram.uRestDensityLoc = gl.getUniformLocation( velocityProgram.ref(), "u_restDensity");			
			velocityProgram.uRestPressureLoc = gl.getUniformLocation( velocityProgram.ref(), "u_restPressure");			
			velocityProgram.uStepsLoc = gl.getUniformLocation( velocityProgram.ref(), "u_steps" );
			velocityProgram.uViscosityKLoc = gl.getUniformLocation( velocityProgram.ref(), "u_kViscosity");
			velocityProgram.uGridDimsLoc = gl.getUniformLocation( velocityProgram.ref(), "u_gridDims");
			velocityProgram.uGridTexDimsLoc = gl.getUniformLocation( velocityProgram.ref(), "u_gridTexDims");

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


