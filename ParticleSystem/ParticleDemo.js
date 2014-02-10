
//----------------------------------------------------------------GLOBALS:

var INITIAL_PARTICLES = 128;
var INITIAL_MASS_MULTIPLIER = 1.0;
var canvas;
var gl;
var system;
var textureSize;
var positionTextures = [];
var systemCycles = 0.0;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var srcIndex, destIndex;
var positionTextures = [];
var velocityTextures = [];
//--------------------------------------------------------------FUNCTIONS:

function renderLoop() {
    requestAnimationFrame(renderLoop);
    drawScene();
}
function drawScene() {


    // Determine from which position particle info will be read and written
    swapSrcDestIndices();


    gl.useProgram(saveProgram.ref());
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboPositions); 
    gl.viewport(0, 0, system.textureSideLength, system.textureSideLength);
    // set the texture to which the fboPositions will save updated state
    gl.framebufferTexture2D(gl.FRAMEBUFFER, 
                            ext.COLOR_ATTACHMENT0_WEBGL, 
                            gl.TEXTURE_2D, 
                            positionTextures[destIndex], 
                            0); 
    gl.framebufferTexture2D(gl.FRAMEBUFFER, 
                            ext.COLOR_ATTACHMENT1_WEBGL, 
                            gl.TEXTURE_2D, 
                            velocityTextures[destIndex], 
                            0); 

    gl.uniform1f(saveProgram.uTime,(systemCycles * 0.014));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, positionTextures[srcIndex]);
    gl.uniform1i(saveProgram.uParticlePositionssave, 0);

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, velocityTextures[srcIndex]);
    gl.uniform1i(saveProgram.uParticleVelocitiessave, 1);
      
    // disble depth testing and update the state in texture memory
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    //gl.enableVertexAttribArray(saveProgram.ref().vertexAccelerations); 
   // gl.enableVertexAttribArray(saveProgram.ref().vertexVelocities); 
    gl.enableVertexAttribArray(saveProgram.particleIndexAttribute); 
   
    gl.drawArrays(gl.POINTS, 0, system.maxParticles); 
    


    gl.useProgram(renderProgram.ref());
    gl.viewport(0,0, gl.viewportWidth, gl.viewportHeight)

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, positionTextures[srcIndex]);
    gl.uniform1i(renderProgram.uParticlePositionsrender, 0);

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, velocityTextures[srcIndex]);
    gl.uniform1i(renderProgram.uParticleVelocitiesrender, 1);
    gl.uniformMatrix4fv(renderProgram.mvMatrixUniform, false, camera.getViewTransform());
    //bind the default frame buffer, disable depth testing and enable alpha blending
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null); //bind the default frame buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //enable particle index and draw particles to the screen
    gl.enableVertexAttribArray(renderProgram.particleIndexAttribute); 
    gl.drawArrays(gl.POINTS, 0, system.maxParticles); 

    systemCycles++; 


   // mat4.rotate(mvMatrix, mvMatrix, Math.PI/200.0, [1, 1, 0]);
    // setMatrixUniforms();   
}





function initGL(canvas) {
    var msg;
    //get WebGL context
    msg = document.getElementById("message");

    gl = SEC3ENGINE.getWebGLContext( canvas, msg );
    if( !gl ){
        return;
    }
    try {
        //extension to use floating point values in positionTextures
        gl.getExtension("OES_texture_float");  
        //extension allowing us to write to more than one buffer per render Pass
        ext = gl.getExtension("WEBGL_draw_buffers");
        if(! ext){
            alert("sorry, your browser does not support multiple draw buffers");
        }

        gl.viewportWidth = canvas.width;    
        gl.viewportHeight = canvas.height;
    } 
    catch (e) {

        alert("Error finding canvas context");
    }
    if (! gl) {

        alert("Could not initialise WebGL, sorry :-(");
    }
}

function createProgram(fragName, vertName) {

    var fragmentShader = getShader(gl, fragName);
    var vertexShader = getShader(gl, vertName);
    var shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);

    gl.linkProgram(shaderProgram);

    if (! gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {

        alert("failed to initialize shaders");
    }
    return shaderProgram;
}

function initShaders() {

    // Create shader programs, one to move particles and one to render


    renderProgram = SEC3ENGINE.createShaderProgram();
    renderProgram.loadShader(gl, "Sec3Engine/shader/nBodyRender.vert", "Sec3Engine/shader/nBodyRender.frag");
    renderProgram.addCallback( function(){
    renderProgram.particleIndexAttribute = gl.getAttribLocation(renderProgram.ref(), "aParticleIndex");
    renderProgram.pMatrixUniform = gl.getUniformLocation(renderProgram.ref(), "uPMatrix");
    renderProgram.mvMatrixUniform = gl.getUniformLocation(renderProgram.ref(), "uMVMatrix");
    renderProgram.uParticlePositionsrender = gl.getUniformLocation(renderProgram.ref(), "uParticlePositions");
    renderProgram.uParticleVelocitiesrender = gl.getUniformLocation(renderProgram.ref(), "uParticleVelocities");   
        
    });

    SEC3ENGINE.registerAsyncObj(gl, renderProgram);
    

    //renderProgram.vertexVelocities = gl.getAttribLocation(saveProgram,"aVertexVelocities");
    
    saveProgram = SEC3ENGINE.createShaderProgram();
    saveProgram.loadShader(gl, "Sec3Engine/shader/nBodyUpdate.vert", "Sec3Engine/shader/nBodyUpdate.frag");
    saveProgram.addCallback( function(){
        gl.useProgram(saveProgram.ref());
        //saveProgram.vertexAccelerations = gl.getAttribLocation(saveProgram,"aVertexAccelerations");
        //saveProgram.vertexVelocities = gl.getAttribLocation(saveProgram,"aVertexVelocities");
        saveProgram.particleIndexAttribute = gl.getAttribLocation(saveProgram.ref(),"aParticleIndex");
        saveProgram.uParticlePositionssave = gl.getUniformLocation(saveProgram.ref(), "uParticlePositions");
        saveProgram.uParticleVelocitiessave = gl.getUniformLocation(saveProgram.ref(), "uParticleVelocities");
        saveProgram.uTime = gl.getUniformLocation(saveProgram.ref(), "uTime");
        saveProgram.uMassMultiplier = gl.getUniformLocation(saveProgram.ref(), "uMassMultiplier");
    });

    SEC3ENGINE.registerAsyncObj( gl, saveProgram );
}

/*
 * Boolean useVetexShader 
 */
function createBuffer(itemSize, numItems, content, locationRender, locationSave) {

    var newBuffer = gl.createBuffer();  
    newBuffer.itemSize = itemSize;
    newBuffer.numItems = numItems;
    gl.bindBuffer(gl.ARRAY_BUFFER, newBuffer);
    var vert32Array = new Float32Array(content);
    gl.bufferData(gl.ARRAY_BUFFER, vert32Array, gl.STATIC_DRAW);
    gl.vertexAttribPointer(locationRender, itemSize, gl.FLOAT, false, 0, 0);  
    gl.vertexAttribPointer(locationSave, itemSize, gl.FLOAT, false, 0, 0);
   // gl.enableVertexAttribArray(locationSave);   
}
 
function initBuffers(mySystem) {

    // initialize uniforms
    setMatrixUniforms();
    gl.useProgram(saveProgram.ref());
    gl.uniform1f(saveProgram.uMassMultiplier, mySystem.massMultiplier);

    // create attribute bufferf
    createBuffer(2, //item size
                 mySystem.maxParticles, //num items
                 mySystem.textureMemoryLocation, //data
                 renderProgram.particleIndexAttribute,
                 saveProgram.particleIndexAttribute); //location
    
    positionTextures.length = 0;
    positionTextures.push(generateTexture(system.startPositions));
    positionTextures.push(generateTexture(system.startPositions));

    velocityTextures.length = 0;
    velocityTextures.push(generateTexture(system.velocities));
    velocityTextures.push(generateTexture(system.velocities));

    fboPositions = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,fboPositions);
    fboPositions.width = mySystem.textureSideLength;
    fboPositions.height = mySystem.textureSideLength;

    ext.drawBuffersWEBGL([
        ext.COLOR_ATTACHMENT0_WEBGL,
        ext.COLOR_ATTACHMENT1_WEBGL,
    ]);
  
}
// creates an RGBA texture of particles x particles dimesnsions
// and fills it with values 
function generateTexture(values){


    var texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                    system.textureSideLength, system.textureSideLength, 
                    0, gl.RGBA, gl.FLOAT, new Float32Array(values));
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

function setMatrixUniforms() {

    gl.useProgram(renderProgram.ref());
    gl.uniformMatrix4fv(renderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(renderProgram.mvMatrixUniform, false, camera.getViewTransform());
}


/*
 * Updates/toggles globals srcIndex and destIndex
 */
function swapSrcDestIndices() {

    frameTurn = ! frameTurn;

    if (frameTurn) {
        srcIndex = 0;
        destIndex = 1;
    }
    else {
        srcIndex = 1;
        destIndex = 0;
    }
}

function initSystem(count, massMultiplier) {
    system = new ParticleSystem(count, massMultiplier);
    textureSize = system.maxParticles;
    initBuffers(system);
}

function initUiButtons() {

    var ui = new UI("uiWrapper");
    
    //-----PARTICLE COUNT
    var countCallback = function(e) {

        var newSliderVal = e.target.value;
        // calc 
        var textureEdgeLength = Math.pow(2, newSliderVal);
        // 
        initSystem(textureEdgeLength, system.massMultiplier);
        
        // Return new label for slider
        return Math.pow(textureEdgeLength, 2) + " Particles";
    };

    ui.addSlider(INITIAL_PARTICLES + " Particles ", 
                 countCallback, 
                 Math.log(INITIAL_PARTICLES), // value (power of 2)
                 6, 10, // min, max
                 1); // step
    //-----

    //-----PARTICLE MASS RANGE
    var massCallback = function(e) {

        var newSliderVal = e.target.value;
        gl.useProgram(saveProgram.ref());
        gl.uniform1f(saveProgram.uMassMultiplier, newSliderVal);
        system.massMultiplier = newSliderVal;
        return "Mass multiplier: " + newSliderVal;
    }

    ui.addSlider("Mass multiplier: " + INITIAL_MASS_MULTIPLIER,
                 massCallback,
                 1,
                 1, 100,
                 1);
}



function webGLStart() {

    canvas = document.getElementById("glcanvas");

    frameTurn = true;

    camera = SEC3ENGINE.createCamera(CAMERA_TRACKING_TYPE);
    camera.goHome([0, 0, 4]);
    interactor = SEC3ENGINE.CameraInteractor(camera, canvas);

    initGL(canvas);
    initShaders();
    initSystem(INITIAL_PARTICLES, INITIAL_MASS_MULTIPLIER);

    initUiButtons();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);


    // This is work for a Camera class
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    mat4.perspective(pMatrix, Math.PI / 4, 
                     gl.viewportWidth / gl.viewportHeight, 
                     0.1, 100.0);
    setMatrixUniforms();

    SEC3ENGINE.render = drawScene;
    SEC3ENGINE.renderLoop = renderLoop;
    SEC3ENGINE.run(gl);
}