
/*

	float duration; 		 The duration of the particle system in seconds
	emissionRate			// The rate of emission.
	enableEmission			When set to false, the particle system will not emit particles.
	gravityModifier			Scale being applied to the gravity defined by Physics.gravity.
	isPaused				Is the particle system paused right now ?
	isPlaying				Is the particle system playing right now ?
	isStopped				Is the particle system stopped right now ?
	maxParticles			The maximum number of particles to emit.
	particleCount			The current number of particles (Read Only).
	randomSeed				Random seed used for the particle system emission. If set to 0, it will be assigned a random value on awake.
	startColor				The initial color of particles when emitted.
	startDelay				Start delay in seconds.
	startLifetime			The total lifetime in seconds that particles will have when emitted. When using curves, values acts as a scale on the curve. This value is set in the particle when it is create by the particle system.
	startRotation			The initial rotation of particles when emitted. When using curves, values acts as a scale on the curve.
	startSize				The initial size of particles when emitted. When using curves, values acts as a scale on the curve.
	startSpeed				The initial speed of particles when emitted. When using curves, values acts as a scale on the curve.
	time					Playback position in seconds.

*/

var SEC3ENGINE = SEC3ENGINE || {};

SEC3ENGINE.createParticleSystem = function(specs) {

//-------------------------------------------------------CONSTANTS/FIELDS:
	
	var frameTurn = true;
	var srcIndex, destIndex;
	var positionTextures = [];
	var velocityTextures = [];	

	var velocities = [];
	var accelerations = []; // TODO kill
	var startPositions = [];
	var textureMemoryLocation = [];

	var systemCycles = 0.0;

	var maxVelocity = 2.0;
	var minVelocity = -0.0014;
	var renderProgram;
	var stepProgram;

	var self = {};
	
//----------------------------------------------------------------METHODS:
	
	var draw = function() { // PUBLIC
		// Determine from which position particle info will be read and written
	    swapSrcDestIndices();


	    stepParticles();
	    renderParticles();

	    systemCycles++; // TODO time?
	};
	
	/*
	 * Updates locations and velocities of all particles in system
	 */
	var stepParticles = function () {

	    // disble depth testing and update the state in texture memory
	    gl.disable(gl.DEPTH_TEST);
	    gl.disable(gl.BLEND);
	    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);

	    gl.useProgram(stepProgram.ref());
	    gl.bindFramebuffer(gl.FRAMEBUFFER, fboPositions); 
	    gl.viewport(0, 0, self.textureSideLength, self.textureSideLength);
	    // set the texture to which the fboPositions will save updated state
	    gl.framebufferTexture2D(gl.FRAMEBUFFER, 
	                            SEC3ENGINE.extensions.drawBuffers(gl).COLOR_ATTACHMENT0_WEBGL, 
	                            gl.TEXTURE_2D, 
	                            positionTextures[destIndex], 
	                            0); 
	    gl.framebufferTexture2D(gl.FRAMEBUFFER, 
	                            SEC3ENGINE.extensions.drawBuffers(gl).COLOR_ATTACHMENT1_WEBGL, 
	                            gl.TEXTURE_2D, 
	                            velocityTextures[destIndex], 
	                            0); 

	    gl.activeTexture(gl.TEXTURE0);
	    gl.bindTexture(gl.TEXTURE_2D, positionTextures[srcIndex]);
	    gl.uniform1i(stepProgram.uParticlePositions, 0);

	    gl.activeTexture(gl.TEXTURE1)
	    gl.bindTexture(gl.TEXTURE_2D, velocityTextures[srcIndex]);
	    gl.uniform1i(stepProgram.uParticleVelocities, 1);

	    gl.vertexAttribPointer(stepProgram.aVertexPosition, 2, gl.FLOAT, false, 0, 0); 
	    gl.enableVertexAttribArray(stepProgram.aVertexPosition);

	    gl.uniform3f(stepProgram.uAttractor, interactor.attractor[0], interactor.attractor[1], interactor.attractor[2]);

	    gl.drawArrays(gl.TRIANGLES, 0, 6); 
	}

	/*
	 * Draws all particles in system
	 */
	var renderParticles = function () {

	    gl.useProgram(renderProgram.ref());
	    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)

	    gl.activeTexture(gl.TEXTURE0);
	    gl.bindTexture(gl.TEXTURE_2D, positionTextures[srcIndex]);
	    gl.uniform1i(renderProgram.uParticlePositions, 0);

	    gl.activeTexture(gl.TEXTURE1);
	    gl.bindTexture(gl.TEXTURE_2D, spriteTex.tex);
	    gl.uniform1i(renderProgram.uSpriteTex, 1);
	   
	    gl.uniformMatrix4fv(renderProgram.mvMatrixUniform, false, camera.getViewTransform());
	    //bind the default frame buffer, disable depth testing and enable alpha blending
	    gl.disable(gl.DEPTH_TEST);
	    gl.enable(gl.BLEND);
	    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	    gl.bindFramebuffer(gl.FRAMEBUFFER, null); //bind the default frame buffer
	    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	    //enable particle index and draw particles to the screen
	    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
	    gl.vertexAttribPointer(renderProgram.particleIndexAttribute, 2, gl.FLOAT, false, 0, 0); 
	    gl.enableVertexAttribArray(renderProgram.particleIndexAttribute); 
	    gl.drawArrays(gl.POINTS, 0, self.maxParticles); 
	}


    var createBuffer = function(itemSize, numItems, content, location) {
    	// TODO move to webgl-util.js
	    var newBuffer = gl.createBuffer();  
	    newBuffer.itemSize = itemSize;
	    newBuffer.numItems = numItems;
	    gl.bindBuffer(gl.ARRAY_BUFFER, newBuffer);
	    var vert32Array = new Float32Array(content);
	    gl.bufferData(gl.ARRAY_BUFFER, vert32Array, gl.STATIC_DRAW);
	    gl.vertexAttribPointer(location, itemSize, gl.FLOAT, false, 0, 0);  
	    gl.bindBuffer(gl.ARRAY_BUFFER, null);
	    return newBuffer;
	};

	var init = function() {

		var len = SEC3ENGINE.math.roundUpToPower(Math.sqrt(specs.maxParticles), 2);
		self.textureSideLength = len;
		self.maxParticles = len * len;
		self.gravityModifier = specs.gravityModifier;

		self.activeBodies = specs.activeBodies;
		self.particleSize = specs.particleSize;
		self.damping = specs.damping;
		self.RGBA = specs.RGBA;		
    };

    var initBuffers = function() {

	    // create attribute buffer
	    indexBuffer = createBuffer(2, //item size
	                               self.maxParticles, //num items
	                               textureMemoryLocation, //data
	                               renderProgram.particleIndexAttribute); //location
	    // create fullScreen Quad buffer
	    quadBuffer = createBuffer(2, 
	                 6,
	                 SEC3ENGINE.geometry.fullScreenQuad(),
	                 stepProgram.aVeretexPosition);
	    
	    positionTextures.length = 0;
	    positionTextures.push(generateTexture(startPositions));
	    positionTextures.push(generateTexture(startPositions));

	    velocityTextures.length = 0;
	    velocityTextures.push(generateTexture(velocities));
	    velocityTextures.push(generateTexture(velocities));

	    fboPositions = gl.createFramebuffer();
	    gl.bindFramebuffer(gl.FRAMEBUFFER,fboPositions);
	    fboPositions.width = self.textureSideLength;
	    fboPositions.height = self.textureSideLength;

	    var ext = SEC3ENGINE.extensions.drawBuffers(gl);

	    ext.drawBuffersWEBGL([
	        ext.COLOR_ATTACHMENT0_WEBGL,
	        ext.COLOR_ATTACHMENT1_WEBGL,
	    ]);
	  
	};

	var generateTexture = function(values) { // TODO must change for emitter

	    var texture = gl.createTexture();

	    gl.bindTexture(gl.TEXTURE_2D, texture);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
	                    self.textureSideLength, self.textureSideLength, 
	                    0, gl.RGBA, gl.FLOAT, new Float32Array(values)); //TODO will initialize empty array

	    gl.bindTexture(gl.TEXTURE_2D, null);
	    return texture;
	};

	var initShaders = function() {

	    SEC3ENGINE.extensions.drawBuffers(gl);

	    renderProgram = SEC3ENGINE.createShaderProgram();
	    renderProgram.loadShader(gl, "Sec3Engine/shader/nBodyRender.vert", "Sec3Engine/shader/nBodyRender.frag");
	    renderProgram.addCallback( function() {
	        renderProgram.particleIndexAttribute = gl.getAttribLocation(renderProgram.ref(), "aParticleIndex");
	        renderProgram.mvMatrixUniform = gl.getUniformLocation(renderProgram.ref(), "uMVMatrix");
	        renderProgram.uParticlePositions = gl.getUniformLocation(renderProgram.ref(), "uParticlePositions");
	        renderProgram.uAlpha = gl.getUniformLocation(renderProgram.ref(), "uAlpha");
	        renderProgram.uSize = gl.getUniformLocation(renderProgram.ref(), "uSize");
	        renderProgram.uSpriteTex = gl.getUniformLocation(renderProgram.ref(), "uSpriteTex");
	        gl.useProgram(renderProgram.ref());
    		gl.uniformMatrix4fv(renderProgram.mvMatrixUniform, false, SEC3ENGINE.currentCamera.getViewTransform());
   	        gl.uniform1f(renderProgram.uAlpha, self.RGBA[3]);
	        gl.uniform1f(renderProgram.uSize, self.particleSize);
	        self.renderProgram = renderProgram;
	    });

	    SEC3ENGINE.registerAsyncObj(gl, renderProgram);

	    stepProgram = SEC3ENGINE.createShaderProgram();
	    stepProgram.loadShader(gl, "Sec3Engine/shader/nBodyUpdate.vert", "Sec3Engine/shader/nBodyUpdate.frag");
	    stepProgram.addCallback( function() {
	        gl.useProgram(stepProgram.ref());
	        stepProgram.aVeretexPosition = gl.getAttribLocation(stepProgram.ref(),"aVertexPosition");
	        stepProgram.uParticlePositions = gl.getUniformLocation(stepProgram.ref(), "uParticlePositions");
	        stepProgram.uParticleVelocities = gl.getUniformLocation(stepProgram.ref(), "uParticleVelocities");
	        stepProgram.uGravityModifier = gl.getUniformLocation(stepProgram.ref(), "uGravityModifier");
	        stepProgram.uAttractor = gl.getUniformLocation(stepProgram.ref(), "uAttractor");
	        stepProgram.uDamping = gl.getUniformLocation(stepProgram.ref(), "uDamping");
	        stepProgram.uInteractions = gl.getUniformLocation(stepProgram.ref(), "uInteractions");
	        initBuffers();
	        gl.uniform1f(stepProgram.uGravityModifier, self.gravityModifier);
	        gl.uniform1f(stepProgram.uDamping, self.damping);
	        gl.uniform1f(stepProgram.uInteractions, self.activeBodies);
			self.stepProgram = stepProgram;
	    });

	    SEC3ENGINE.registerAsyncObj( gl, stepProgram );
	};

	/*
	 * Updates/toggles globals srcIndex and destIndex
	 */
	var swapSrcDestIndices = function() {

	    frameTurn = ! frameTurn;

	    if (frameTurn) {
	        srcIndex = 0;
	        destIndex = 1;
	    }
	    else {
	        srcIndex = 1;
	        destIndex = 0;
	    }
	};

	var restart = function() { // PUBLIC

		positionTextures = [];
		velocityTextures = [];	
		velocities = [];
		accelerations = []; 
		startPositions = [];
		textureMemoryLocation = [];

		createParticlesInSphere();
		initBuffers();
	};

	//------------------FOR PARTICLE DEMO:
		
	var getStartingVelocity = function() {

	    var theta = Math.random() * Math.PI * 2.0;
	    var phi = (Math.random() * ((Math.PI * 1.0)));// - (Math.PI / 4)));
	    var x = maxVelocity * Math.sin(phi)*Math.cos(theta);
	    var z = maxVelocity * Math.cos(phi);
	    var y = maxVelocity * Math.sin(phi)*Math.sin(theta);

	    x = 2.0 * ( Math.random() - 0.5);
	    y = 2.0 * ( Math.random() - 0.5);
	    z = 2.0 * ( Math.random() - 0.5);

	    var result = vec3.fromValues(x,y,z);
	    vec3.normalize(result,result);
	    return result;
	};

	var getRandomVec3 = function() {

		var x = (Math.random() - 0.5) * 0.5;
		var y = (Math.random() - 0.5) * 0.5;
		var z = (Math.random() - 0.5) * 0.5;

		return vec3.fromValues(x,y,z);

	};

    var createParticlesInSphere = function() {

		var i, max_parts = self.maxParticles;

    	for(i = 0; i < max_parts; i++) {

       		var startingVelocity = getStartingVelocity();

       		velocities.push(0.0);
       		velocities.push(0.0);
       		velocities.push(0.0);
       		velocities.push(1.0);

       		startPositions.push(startingVelocity[0]);
       		startPositions.push(startingVelocity[1]);
       		startPositions.push(startingVelocity[2]);
       		startPositions.push(Math.random());

       		var xIndex = Math.floor(i % self.textureSideLength) / self.textureSideLength ;
	        var yIndex = i / self.maxParticles; 

       		textureMemoryLocation.push(xIndex);
       		textureMemoryLocation.push(yIndex);
       	}
    };

	//------------------

	// Assign public methods
	self.restart = restart;
	self.draw = draw;


	// run setup
	init(); 
	createParticlesInSphere();
	initShaders();

	return self;
};
	

	