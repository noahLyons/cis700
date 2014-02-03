
//----------------------------------------------------------------GLOBALS:

var canvas;
var gl;
var system;
var textureSize;
var textures = [];
var systemCycles = 0;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var srcIndex, destIndex;

//--------------------------------------------------------------FUNCTIONS:



function drawScene() {

    requestAnimationFrame(drawScene);
    // Determine from which textures particle info will be read and written
    swapSrcDestIndices();


    gl.useProgram(saveProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboPositions); 
    gl.viewport(0, 0, system.rowLength, system.rowLength);
    // set the texture to which the fboPositions will save updated state
    gl.framebufferTexture2D(gl.FRAMEBUFFER, 
                            gl.COLOR_ATTACHMENT0, 
                            gl.TEXTURE_2D, 
                            textures[destIndex], 
                            0); 

    gl.uniform1f(saveProgram.uTime, systemCycles % 200.0);
    gl.uniform1i(saveProgram.uParticleStartPositionssave, textures[srcIndex]);
    gl.bindTexture(gl.TEXTURE_2D, textures[srcIndex]);
      
    // disble depth testing and update the state in texture memory
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.enableVertexAttribArray(saveProgram.vertexVelocities); 
    gl.enableVertexAttribArray(saveProgram.particleIndexAttribute); 
   
    gl.drawArrays(gl.POINTS, 0, system.maxParticles); 
    


    gl.useProgram(renderProgram);
    gl.viewport(0,0, gl.viewportWidth, gl.viewportHeight)

    gl.bindTexture(gl.TEXTURE_2D, textures[destIndex]);   
    gl.uniform1i(renderProgram.uParticleStartPositionsrender, textures[destIndex]);

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
        //extension to use floating point values in textures
        gl.getExtension("OES_texture_float");  
        //extension allowing us to write to more than one buffer per render Pass
        
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
    
    renderProgram.vertexVelocities = gl.getAttribLocation(saveProgram,"aVertexVelocities");
    renderProgram.particleIndexAttribute = gl.getAttribLocation(renderProgram, "aParticleIndex");
    renderProgram.pMatrixUniform = gl.getUniformLocation(renderProgram, "uPMatrix");
    renderProgram.mvMatrixUniform = gl.getUniformLocation(renderProgram, "uMVMatrix");
    renderProgram.uParticleStartPositionsrender = gl.getUniformLocation(renderProgram, "uParticleStartPositions");
    
    gl.useProgram(saveProgram);
    saveProgram.vertexVelocities = gl.getAttribLocation(saveProgram,"aVertexVelocities");
    saveProgram.particleIndexAttribute = gl.getAttribLocation(saveProgram,"aParticleIndex");
    saveProgram.uParticleStartPositionssave = gl.getUniformLocation(saveProgram, "uParticleStartPositions");
    saveProgram.uTime = gl.getUniformLocation(saveProgram, "uTime");

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

    setMatrixUniforms();

    createBuffer(3, //item size
                 mySystem.maxParticles, //num items
                 mySystem.velocities, //data
                 renderProgram.vertexVelocities,
                 saveProgram.vertexVelocities); //location

    createBuffer(2, //item size
                 mySystem.maxParticles, //num items
                 mySystem.textureMemoryLocation, //data
                 renderProgram.particleIndexAttribute,
                 saveProgram.particleIndexAttribute); //location

    
    textures = [];
    textures.push(generateTexture());
    textures.push(generateTexture());

    fboPositions = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,fboPositions);
    fboPositions.width = mySystem.rowLength;
    fboPositions.height = mySystem.rowLength;
  
}

function generateTexture(){


    var texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                    system.rowLength, system.rowLength, 
                    0, gl.RGBA, gl.FLOAT, new Float32Array(system.startPositions));
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

function webGLStart() {

    frameTurn = true;

    canvas = document.getElementById("glcanvas");
    initGL(canvas);
    initShaders();
    system = new ParticleSystem();
    textureSize = system.maxParticles;
    initBuffers(system);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // This is work for a Camera class
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    mat4.perspective(pMatrix, Math.PI / 4, 
                     gl.viewportWidth / gl.viewportHeight, 
                     0.1, 100.0);
    mat4.lookAt(mvMatrix, 
                vec3.fromValues(0,0,0.1),
                vec3.fromValues(0,0,0),
                vec3.fromValues(0,1,0));
    mat4.mul(pMatrix, pMatrix, mvMatrix);
    setMatrixUniforms();
    drawScene();
}