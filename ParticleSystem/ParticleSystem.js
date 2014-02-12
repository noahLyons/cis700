

//-------------------------------------------------------CONSTANTS/FIELDS:

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

var INITIAL_DRAWSIZE = 0.8;
var INITIAL_ALPHA = 0.04;
var INITIAL_PARTICLES = 1024;
var INITIAL_MASS_MULTIPLIER = 1.0;
var INITIAL_DRAG = 1.01;
var INITIAL_INTERACTIONS = 2;

var SEC3ENGINE = SEC3ENGINE || {};

SEC3ENGINE.createParticleSystem = function(count,massMultiplier) {
//-----------------------------------------------------------CONSTRUCTORS:

	var textureSideLength = count;
	var maxParticles =  textureSideLength * textureSideLength;

	var frameTurn = true;
	var srcIndex, destIndex;
	var positionTextures = [];
	var velocityTextures = [];	

	var velocities = [];
	var accelerations = []; 
	var startPositions = [];
	var textureMemoryLocation = [];

	var systemCycles = 0.0;
	var maxAcceleration = 0.05;
	var maxVelocity = 2.0;
	var minVelocity = -0.0014;
	var massMultiplier = massMultiplier;
	var renderProgram;
	var stepProgram;
	var newObj = {};

	newObj.maxParticles = maxParticles;
	newObj.textureSideLength = textureSideLength;
	newObj.massMultiplier = massMultiplier;
	
	
//----------------------------------------------------------------METHODS:

	
		
	var getStartingVelocity = function() {

	    var theta = Math.random() * Math.PI * 2.0;
	    var phi = (Math.random() * ((Math.PI * 1.0)));// - (Math.PI / 4)));
	    var x = maxVelocity * Math.sin(phi)*Math.cos(theta);
	    var z = maxVelocity * Math.cos(phi);
	    var y = maxVelocity * Math.sin(phi)*Math.sin(theta);
	    x = 2.0 * ( Math.random() - 0.5);
	    y = 2.0 * ( Math.random() - 0.5);
	    z = 2.0 * (Math.random() - 0.5);

	    var result = vec3.fromValues(x,y,z);
	    vec3.normalize(result,result);
	    return result;
	};

	var getRandomVec3 = function() {
		var x = (Math.random() - 0.5) * maxAcceleration;
		var y = (Math.random() - 0.5) * maxAcceleration;
		var z = (Math.random() - 0.5) * maxAcceleration;
		return vec3.fromValues(x,y,z);
	};

	var init = function() {

		var i, max_parts = maxParticles;

    	for(i = 0; i < max_parts; i++) {

       		var startingVelocity = getStartingVelocity();
       		
       		var particle = new Particle(startingVelocity);
       		
       		velocities.push(0.0);
       		velocities.push(0.0);
       		velocities.push(0.0);
       		velocities.push(1.0);

       		startPositions.push(particle.v0[0]);
       		startPositions.push(particle.v0[1]);
       		startPositions.push(particle.v0[2]);
       		startPositions.push(Math.random());

       		var xIndex = Math.floor(i % textureSideLength) / textureSideLength ;
	        var yIndex = i / maxParticles; 

       		textureMemoryLocation.push(xIndex);
       		textureMemoryLocation.push(yIndex);
       	}
    };

    var createBuffer = function(itemSize, numItems, content, location) {

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

    var initBuffers = function() {

	    // create attribute bufferf
	    indexBuffer = createBuffer(2, //item size
	                               maxParticles, //num items
	                               textureMemoryLocation, //data
	                               renderProgram.particleIndexAttribute); //location
	                   


	    var test = SEC3ENGINE.geometry.fullScreenQuad();
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
	    fboPositions.width = textureSideLength;
	    fboPositions.height = textureSideLength;

	    var ext = SEC3ENGINE.extensions.drawBuffers(gl);

	    ext.drawBuffersWEBGL([
	        ext.COLOR_ATTACHMENT0_WEBGL,
	        ext.COLOR_ATTACHMENT1_WEBGL,
	    ]);
	  
	};

	var generateTexture = function(values) {

	    var texture = gl.createTexture();

	    gl.bindTexture(gl.TEXTURE_2D, texture);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
	                    textureSideLength, textureSideLength, 
	                    0, gl.RGBA, gl.FLOAT, new Float32Array(values));
	    gl.bindTexture(gl.TEXTURE_2D, null);
	    return texture;
	};

	var initShaders = function(self) {

	    SEC3ENGINE.extensions.drawBuffers(gl);
	    // Create shader programs, one to move particles and one to render

	    renderProgram = SEC3ENGINE.createShaderProgram();
	    renderProgram.loadShader(gl, "Sec3Engine/shader/nBodyRender.vert", "Sec3Engine/shader/nBodyRender.frag");
	    renderProgram.addCallback( function() {
	        renderProgram.particleIndexAttribute = gl.getAttribLocation(renderProgram.ref(), "aParticleIndex");
	        renderProgram.mvMatrixUniform = gl.getUniformLocation(renderProgram.ref(), "uMVMatrix");
	        renderProgram.uParticlePositionsrender = gl.getUniformLocation(renderProgram.ref(), "uParticlePositions");
	        renderProgram.uAlpha = gl.getUniformLocation(renderProgram.ref(), "uAlpha");
	        renderProgram.uSize = gl.getUniformLocation(renderProgram.ref(), "uSize");
	        renderProgram.uSpriteTex = gl.getUniformLocation(renderProgram.ref(), "uSpriteTex");
	        gl.useProgram(renderProgram.ref());
    		gl.uniformMatrix4fv(renderProgram.mvMatrixUniform, false, SEC3ENGINE.currentCamera.getViewTransform());
   	        gl.uniform1f(renderProgram.uAlpha, INITIAL_ALPHA);
	        gl.uniform1f(renderProgram.uSize, INITIAL_DRAWSIZE);
	        self.renderProgram = renderProgram;
	    });

	    SEC3ENGINE.registerAsyncObj(gl, renderProgram);
	    
	  	    
	    stepProgram = SEC3ENGINE.createShaderProgram();
	    stepProgram.loadShader(gl, "Sec3Engine/shader/nBodyUpdate.vert", "Sec3Engine/shader/nBodyUpdate.frag");
	    stepProgram.addCallback( function() {
	        gl.useProgram(stepProgram.ref());
	        stepProgram.aVeretexPosition = gl.getAttribLocation(stepProgram.ref(),"aVertexPosition");
	        stepProgram.uParticlePositionssave = gl.getUniformLocation(stepProgram.ref(), "uParticlePositions");
	        stepProgram.uParticleVelocitiessave = gl.getUniformLocation(stepProgram.ref(), "uParticleVelocities");
	        stepProgram.uMassMultiplier = gl.getUniformLocation(stepProgram.ref(), "uMassMultiplier");
	        stepProgram.uAttractor = gl.getUniformLocation(stepProgram.ref(), "uAttractor");
	        stepProgram.uDrag = gl.getUniformLocation(stepProgram.ref(), "uDrag");
	        stepProgram.uInteractions = gl.getUniformLocation(stepProgram.ref(), "uInteractions");
	        initBuffers();
	        gl.uniform1f(stepProgram.uMassMultiplier, massMultiplier);
	        gl.uniform1f(stepProgram.uDrag, INITIAL_DRAG);
	        gl.uniform1f(stepProgram.uInteractions, INITIAL_INTERACTIONS);
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

	var draw = function() {
		// Determine from which position particle info will be read and written
	    swapSrcDestIndices();

	    //--------------------------------UPDATE PARTICLE POSITIONS:

	    gl.useProgram(stepProgram.ref());
	    gl.bindFramebuffer(gl.FRAMEBUFFER, fboPositions); 
	    gl.viewport(0, 0, textureSideLength, textureSideLength);
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
	    gl.uniform1i(stepProgram.uParticlePositionssave, 0);

	    gl.activeTexture(gl.TEXTURE1)
	    gl.bindTexture(gl.TEXTURE_2D, velocityTextures[srcIndex]);
	    gl.uniform1i(stepProgram.uParticleVelocitiessave, 1);
	      
	    // disble depth testing and update the state in texture memory
	    gl.disable(gl.DEPTH_TEST);
	    gl.disable(gl.BLEND);


	    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
	    gl.vertexAttribPointer(stepProgram.aVertexPosition, 2, gl.FLOAT, false, 0, 0); 
	    gl.enableVertexAttribArray(stepProgram.aVertexPosition);

	    gl.uniform3f(stepProgram.uAttractor, interactor.attractor[0], interactor.attractor[1], interactor.attractor[2]);

	    gl.drawArrays(gl.TRIANGLES, 0, 6); 
	    
	    //-------------------------------------------DRAW PARTICLES:
	    
	    gl.useProgram(renderProgram.ref());
	    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)

	    gl.activeTexture(gl.TEXTURE0);
	    gl.bindTexture(gl.TEXTURE_2D, positionTextures[srcIndex]);
	    gl.uniform1i(renderProgram.uParticlePositionsrender, 0);

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
	    gl.drawArrays(gl.POINTS, 0, maxParticles); 

	    systemCycles++; 
	};

	var restart = function() {
		positionTextures = [];
		velocityTextures = [];	

		velocities = [];
		accelerations = []; 
		startPositions = [];
		textureMemoryLocation = [];

		init();
		initBuffers();
	};

	newObj.getStartingVelocity = getStartingVelocity;
	newObj.getRandomVec3 = getRandomVec3;
	newObj.init = init;
	newObj.initShaders = initShaders;
	newObj.initBuffers = initBuffers;
	newObj.generateTexture = generateTexture;
	newObj.createBuffer = createBuffer;
	newObj.draw = draw;
	newObj.restart = restart;

	newObj.init(); //TODO kill
	newObj.initShaders(newObj);

	return newObj
};