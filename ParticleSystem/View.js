
//----------------------------------------------------------------GLOBALS:

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



function drawScene() {

    requestAnimationFrame(drawScene);
    // Determine from which position particle info will be read and written
    swapSrcDestIndices();


    gl.useProgram(saveProgram);
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

    //gl.enableVertexAttribArray(saveProgram.vertexAccelerations); 
   // gl.enableVertexAttribArray(saveProgram.vertexVelocities); 
    gl.enableVertexAttribArray(saveProgram.particleIndexAttribute); 
   
    gl.drawArrays(gl.POINTS, 0, system.maxParticles); 
    


    gl.useProgram(renderProgram);
    gl.viewport(0,0, gl.viewportWidth, gl.viewportHeight)

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, positionTextures[srcIndex]);
    gl.uniform1i(renderProgram.uParticlePositionsrender, 0);

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, velocityTextures[srcIndex]);
    gl.uniform1i(renderProgram.uParticleVelocitiesrender, 1);

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


/*
 * gl - canvas context
 * id - DOM id of the shader
 */
function getShader(gl, id) {

    var shader;
    var shaderScript = document.getElementById(id);
    var str = "";
    var k = shaderScript.firstChild;

    if (! shaderScript)   { return null; }

    while (k) {

        if (k.nodeType == 3)   { str += k.textContent; }
        k = k.nextSibling;
    }

    if (shaderScript.type == "x-shader/x-fragment") {

        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } 
    else if (shaderScript.type == "x-shader/x-vertex") {

        shader = gl.createShader(gl.VERTEX_SHADER);
    } 
    else   { return null; }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {

        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function handleTextureLoaded(image, texture) {

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function initGL(canvas) {


    try {
        gl = canvas.getContext("experimental-webgl");
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
    renderProgram = createProgram("fragment-render","vertex-render");
    saveProgram = createProgram("fragment-save","vertex-save");
    
    gl.useProgram(renderProgram);
    

    //renderProgram.vertexVelocities = gl.getAttribLocation(saveProgram,"aVertexVelocities");
    renderProgram.particleIndexAttribute = gl.getAttribLocation(renderProgram, "aParticleIndex");
    renderProgram.pMatrixUniform = gl.getUniformLocation(renderProgram, "uPMatrix");
    renderProgram.mvMatrixUniform = gl.getUniformLocation(renderProgram, "uMVMatrix");
    renderProgram.uParticlePositionsrender = gl.getUniformLocation(renderProgram, "uParticlePositions");
    renderProgram.uParticleVelocitiesrender = gl.getUniformLocation(saveProgram, "uParticleVelocities");   
    
    gl.useProgram(saveProgram);
    //saveProgram.vertexAccelerations = gl.getAttribLocation(saveProgram,"aVertexAccelerations");
    //saveProgram.vertexVelocities = gl.getAttribLocation(saveProgram,"aVertexVelocities");
    saveProgram.particleIndexAttribute = gl.getAttribLocation(saveProgram,"aParticleIndex");
    saveProgram.uParticlePositionssave = gl.getUniformLocation(saveProgram, "uParticlePositions");
    saveProgram.uParticleVelocitiessave = gl.getUniformLocation(saveProgram, "uParticleVelocities");
    saveProgram.uTime = gl.getUniformLocation(saveProgram, "uTime");
    saveProgram.uTextureSideLength = gl.getUniformLocation(saveProgram, "uTextureSideLength");

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
    //initialize uniforms
    setMatrixUniforms();
    gl.uniform1i(saveProgram.uTextureSideLength, mySystem.textureSideLength);

    //create attribute buffers
    /*
    createBuffer(3, //item size
                 mySystem.maxParticles, //num items
                 mySystem.accelerations, //data
                 renderProgram.vertexAccelerations,
                 saveProgram.vertexAccelerations); //location
*/
    /*
    createBuffer(3, //item size
                 mySystem.maxParticles, //num items
                 mySystem.velocities, //data
                 renderProgram.vertexVelocities,
                 saveProgram.vertexVelocities); //location
*/
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

    gl.useProgram(renderProgram);
    gl.uniformMatrix4fv(renderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(renderProgram.mvMatrixUniform, false, mvMatrix);
}

function setTexture(texture) {

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
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
function initSystem(count) {
    system = new ParticleSystem(count);
    textureSize = system.maxParticles;
    initBuffers(system);
}
function webGLStart() {

    frameTurn = true;

    canvas = document.getElementById("glcanvas");
    var particleCountSlider = document.getElementById("particleCount");
    particleCountSlider.addEventListener("input", function(e){
        var count = e.target.value;
        count = Math.pow(2,count);
        var label = document.getElementById("particleCountid");
        label.innerText = Math.pow(count,2) + " Particles";
        initSystem(count);

    } );
    initGL(canvas);
    initShaders();
    initSystem(128);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // This is work for a Camera class
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    mat4.perspective(pMatrix, Math.PI / 4, 
                     gl.viewportWidth / gl.viewportHeight, 
                     0.1, 100.0);
    mat4.lookAt(mvMatrix, 
                vec3.fromValues(0,0,2),
                vec3.fromValues(0,0,0),
                vec3.fromValues(0,1,0));
    mat4.mul(pMatrix, pMatrix, mvMatrix);
    setMatrixUniforms();
    drawScene();
}