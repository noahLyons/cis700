//http://learningwebgl.com/blog/?p=28  source!

//-------------------------------------------------------CONSTANTS/FIELDS:
var canvas;
var CHOMP_DISTANCE = 0.5;
var SCALE_FACTOR = 3.8;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var gl;
var particlePositionBuffer;
var model;
var system;
var positionBufferA;
var positionTextureA;
var BframeBuffer;
var Btexture;
var counter;
var textureSize;
var framebuffers = [];
var textures = [];
var swap = true;
var systemCycles = 0;
//--------------------------------------------------------------FUNCTIONS:

function drawScene() {
    systemCycles++;
    requestAnimationFrame(drawScene);
    //Determine which texture will be read from and which will be written to
    var srcIndex, destIndex;   
    if(frameTurn){
        srcIndex = 0;
        destIndex = 1;
    }
    else{
        srcIndex = 1;
        destIndex = 0;
    }
    
    gl.useProgram(saveProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboSave); 
    gl.viewport(0, 0, rowLength, rowLength);
    //set the texture to which the fboSave will save updated state
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[destIndex], 0); 

    //set the texture to read last state from
   // gl.activeTexture(gl.TEXTURE0);
    gl.uniform1f(saveProgram.uTime, systemCycles);
    gl.bindTexture(gl.TEXTURE_2D, textures[srcIndex]);
    gl.uniform1i(saveProgram.uSamplerReadsave, textures[srcIndex]);
      
    // disble depth testing and update the state in texture memory
    gl.disable(gl.DEPTH_TEST);
    gl.enableVertexAttribArray(saveProgram.vertexVelocities); 
    gl.enableVertexAttribArray(saveProgram.vertexIndexAttribute); 
   
    gl.drawArrays(gl.POINTS, 0, system.Max_Particles); 
    
    //debug info about the texture memory (too slow for production)
    /*
    var pixels = new Uint8Array( rowLength * rowLength * 4);
    gl.readPixels(0,0,rowLength,rowLength,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    */

    gl.useProgram(renderProgram);
    gl.viewport(0,0, gl.viewportWidth, gl.viewportHeight)
    //update the texture to read newly written state
    //gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[destIndex]);   
    gl.uniform1i(renderProgram.uSamplerReadrender, textures[destIndex]);

    //bind the default frame buffer, enable depth testing and draw particles to the screen
    gl.enable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null); //bind the default frame buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   // gl.enableVertexAttribArray(renderProgram.vertexVelocities); 
    gl.enableVertexAttribArray(renderProgram.vertexIndexAttribute); 
    gl.drawArrays(gl.POINTS, 0, system.Max_Particles); 

    frameTurn = ! frameTurn;
}
function setTexture(texture){
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
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
        ext = gl.getExtension("WEBGL_draw_buffers"); 
        if(! ext){
            alert("no Extension noob LOL");
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
function createProgram(fragName, vertName){
    var fragmentShader = getShader(gl, fragName);
    var vertexShader = getShader(gl, vertName);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (! gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("failed to initialize shaders");
    }
    return shaderProgram;
}
function initShaders() {

    renderProgram = createProgram("fragment-render","vertex-render");
    
    gl.useProgram(renderProgram);

    renderProgram.vertexIndexAttribute = gl.getAttribLocation(renderProgram,"aVertexIndex");

    renderProgram.pMatrixUniform = gl.getUniformLocation(renderProgram, "uPMatrix");

    renderProgram.mvMatrixUniform = gl.getUniformLocation(renderProgram,  "uMVMatrix");

    renderProgram.uSamplerReadrender = gl.getUniformLocation(renderProgram, "uSamplerRead");

   // renderProgram.resolutionUniform = gl.getUniformLocation(renderProgram, "uResolution");

    //////////////////////////////////////////////////////////////////

    saveProgram = createProgram("fragment-save","vertex-save");
    
    gl.useProgram(saveProgram);

    saveProgram.vertexVelocities = gl.getAttribLocation(saveProgram,"aVertexVelocities");
    
    saveProgram.vertexIndexAttribute = gl.getAttribLocation(saveProgram,"aVertexIndex");
       
    saveProgram.uSamplerReadsave = gl.getUniformLocation(saveProgram, "uSamplerRead");
    
    saveProgram.uTime = gl.getUniformLocation(saveProgram, "uTime");
//    saveProgram.resolutionUniform = gl.getUniformLocation(saveProgram, "uResolution");
   
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
  //  gl.uniform1f(renderProgram.resolutionUniform, mySystem.Max_Particles);
    // gl.uniform1f(saveProgram.resolutionUniform, mySystem.Max_Particles);

    var indices = []; // array that will hold the index of each particle
    var particleVelocities = []; // declare array that will hold current xyz velocity + life
    var i, numParticles;
    numParticles = mySystem.Max_Particles;
    rowLength = Math.floor(Math.sqrt(mySystem.Max_Particles));

    for (i = 0; i < numParticles; i++ ) { // and fill it
        var xindex = 2.0 * ((Math.floor(i % rowLength)) / rowLength ) -1.0;
        var yindex = 2.0 * (i / numParticles) -1.0; //i +  (Math.floor(i % rowLength) -1.0);
        //xindex = yindex;
        var particle = mySystem.particles[i];
        particleVelocities.push(particle.v0[0]);
        particleVelocities.push(particle.v0[1]);
        particleVelocities.push(particle.v0[2]);
        indices.push(xindex);
        indices.push(yindex);
    }

    createBuffer(3, //item size
                 mySystem.Max_Particles, //num items
                 particleVelocities, //data
                 renderProgram.vertexVelocities,saveProgram.vertexVelocities); //location

    createBuffer(2, //item size
                 mySystem.Max_Particles, //num items
                 indices, //data
                 renderProgram.vertexIndexAttribute,saveProgram.vertexIndexAttribute); //location

    
    textures = [];
   // textures.push(generateTexture());
    textures.push(generateTexture());
    textures.push(generateTexture());

    fboSave = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,fboSave);
    fboSave.width = rowLength;
    fboSave.height = rowLength;
  
}

function generateTexture(){
    /*var colors = [1.0,0.0,0.0,1.0,
                  0.0,1.0,0.0,1.0,
                  0.5,0.0,0.0,1.0,
                  0.0,0.0,1.0,1.0];
    */
    var texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                    rowLength,
                    rowLength, 0, gl.RGBA, gl.FLOAT, null);//new Float32Array(colors));
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

function initTextures() {

    tearTexture = gl.createTexture();
    headTexture = gl.createTexture();
    jawTexture = gl.createTexture();

    tearImage = new Image();
    headImage = new Image();
    jawImage = new Image();

    tearImage.onload = function() { handleTextureLoaded(tearImage, tearTexture); }
    headImage.onload = function() { handleTextureLoaded(headImage, headTexture); }
    jawImage.onload = function() { handleTextureLoaded(jawImage, jawTexture); }

    tearImage.src = "tear.png";
    headImage.src = "head.png";
    jawImage.src = "jaw.png";
}


function setMatrixUniforms() {
    gl.useProgram(renderProgram);
    gl.uniformMatrix4fv(renderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(renderProgram.mvMatrixUniform, false, mvMatrix);
}

function webGLStart() {
    frameTurn = true;

    canvas = document.getElementById("glcanvas");
    initGL(canvas);
    initShaders();
    system = new ParticleSystem();
    textureSize = system.Max_Particles;
    initBuffers(system);
   // initTextures();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    

    // This is work for a Camera class!
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    mat4.perspective(pMatrix, Math.PI / 4, 
                     gl.viewportWidth / gl.viewportHeight, 
                     0.1, 100.0);
    mat4.lookAt(mvMatrix, 
                vec3.fromValues(0,0,7),
                vec3.fromValues(0,0,0),
                vec3.fromValues(0,1,0));
    mat4.mul(pMatrix, pMatrix, mvMatrix);
    setMatrixUniforms();
    drawScene();
}