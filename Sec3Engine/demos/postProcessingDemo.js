

//--------------------------------------------------------------------------GLOBALS:
//Global variables
//Bad practice, but let's just leave them here
var gl;    //GL context object
var persp; //perspective matrix
var view;  //viewing matrix
var norml; //normal matrix

var camera; //camera object
var interactor; //camera interactor

var quad_vertexVBO;
var quad_indexVBO;
var quad_texcoordVBO;

var model_vertexVBOs = [];   //buffer object for loaded model (vertex)
var model_indexVBOs = [];    //buffer object for loaded model (index)
var model_normalVBOs = [];   //buffer object for loaded model (normal)
var model_texcoordVBOs = []; //buffer object for loaded model (texture)

var passProg;           //shader program passing data to FBO
var renderQuadProg;     //shader program showing the FBO buffers
var blurProg;
var downsampleProg;
var dofProg;

var fbo;    //Framebuffer object storing data for postprocessing effects
var lowResFBO; //Framebuffer object for storing unprocessed image
var workingFBO;

var zFar = 30;
var zNear = 0.1;
var texToDisplay = 1;
var secondPass;

var SIGMA_START = 2.0;
//--------------------------------------------------------------------------METHODS:

/*
 * Creates shader programs and sets uniforms
 */
var createShaders = function() {
    //----------------------------------------------------FIRST PASS:
    //Create a shader program for output scene data to FB
    passProg = CIS700WEBGLCORE.createShaderProgram();
    //Load the shader source asynchronously
    passProg.loadShader( gl, 
                         "/../shader/deferredRenderPass1.vert", 
                         "/../shader/deferredRenderPass1.frag" );
    
    passProg.addCallback( function() {
        gl.useProgram( passProg.ref() );
        //query the locations of shader parameters
        passProg.aVertexPosLoc = gl.getAttribLocation( passProg.ref(), "a_pos" );
        passProg.aVertexNormalLoc = gl.getAttribLocation( passProg.ref(), "a_normal" );
        passProg.aVertexTexcoordLoc = gl.getAttribLocation( passProg.ref(), "a_texcoord" );

        passProg.uPerspLoc = gl.getUniformLocation( passProg.ref(), "u_projection" );
        passProg.uModelViewLoc = gl.getUniformLocation( passProg.ref(), "u_modelview" );
        passProg.uMVPLoc = gl.getUniformLocation( passProg.ref(), "u_mvp" );
        passProg.uNormalMatLoc = gl.getUniformLocation( passProg.ref(), "u_normalMat");
        passProg.uSamplerLoc = gl.getUniformLocation( passProg.ref(), "u_sampler");
    } );

    //Register the asynchronously-requested resources with the engine core
    //asynchronously-requested resources are loaded using AJAX 
    CIS700WEBGLCORE.registerAsyncObj( gl, passProg );

    //----------------------------------------------------SECOND PASS:
    //Create a shader program for displaying FBO contents
    renderQuadProg = CIS700WEBGLCORE.createShaderProgram();
    renderQuadProg.loadShader( gl, 
                               "/../shader/deferredRenderPass2.vert", 
                               "/../shader/deferredRenderPass2.frag" );

    renderQuadProg.addCallback( function(){
        //query the locations of shader parameters
        renderQuadProg.aVertexPosLoc = gl.getAttribLocation( renderQuadProg.ref(), "a_pos" );
        renderQuadProg.aVertexTexcoordLoc = gl.getAttribLocation( renderQuadProg.ref(), "a_texcoord" );

        renderQuadProg.uPosSamplerLoc = gl.getUniformLocation( renderQuadProg.ref(), "u_positionTex");
        renderQuadProg.uNormalSamplerLoc = gl.getUniformLocation( renderQuadProg.ref(), "u_normalTex");
        renderQuadProg.uColorSamplerLoc = gl.getUniformLocation( renderQuadProg.ref(), "u_colorTex");
        renderQuadProg.uDepthSamplerLoc = gl.getUniformLocation( renderQuadProg.ref(), "u_depthTex");

        renderQuadProg.uZNearLoc = gl.getUniformLocation( renderQuadProg.ref(), "u_zNear" );
        renderQuadProg.uZFarLoc = gl.getUniformLocation( renderQuadProg.ref(), "u_zFar" );
        renderQuadProg.uDisplayTypeLoc = gl.getUniformLocation( renderQuadProg.ref(), "u_displayType" );

        secondPass = renderQuadProg;
    } );
    CIS700WEBGLCORE.registerAsyncObj( gl, renderQuadProg );

    //---------------------------------------------------FINAL PASS:

    finalPassProg = CIS700WEBGLCORE.createShaderProgram();
    finalPassProg.loadShader( gl, 
                               "/../shader/finalPass.vert", 
                               "/../shader/finalPass.frag" );

    finalPassProg.addCallback( function(){
        //query the locations of shader parameters
        finalPassProg.aVertexPosLoc = gl.getAttribLocation( finalPassProg.ref(), "a_pos" );
        finalPassProg.aVertexTexcoordLoc = gl.getAttribLocation( finalPassProg.ref(), "a_texcoord" );
        
        finalPassProg.uFinalImageLoc = gl.getUniformLocation( finalPassProg.ref(), "u_colorTex");

    } );
    CIS700WEBGLCORE.registerAsyncObj( gl, finalPassProg );

    //----------------------------------------------------BLUR PASS:
    //Create a shader program for displaying FBO contents
    blurProg = CIS700WEBGLCORE.createShaderProgram();
    blurProg.loadShader( gl, 
                         "/../shader/texture.vert", 
                         "/../shader/gaussianBlur.frag" );

    blurProg.addCallback( function(){
        //query the locations of shader parameters
        blurProg.aVertexPosLoc = gl.getAttribLocation( blurProg.ref(), "a_pos" );
        blurProg.aVertexTexcoordLoc = gl.getAttribLocation( blurProg.ref(), "a_texcoord");
        blurProg.uSourceLoc = gl.getUniformLocation( blurProg.ref(), "u_source");
        blurProg.uBlurDirectionLoc = gl.getUniformLocation( blurProg.ref(), "u_blurDirection");
        blurProg.uLilSigLoc = gl.getUniformLocation( blurProg.ref(), "u_lilSig");
        blurProg.uPixDimLoc = gl.getUniformLocation( blurProg.ref(), "u_pixDim");
        gl.useProgram(blurProg.ref());
        var width = CIS700WEBGLCORE.canvas.width;
        var height = CIS700WEBGLCORE.canvas.height;
        gl.uniform2fv(blurProg.uPixDimLoc, vec2.fromValues(1.0 / width, 1.0 / height));
        gl.uniform1f(blurProg.uLilSigLoc, 4.0);
        initUiButtons(); //TODO: awful : (
    } );

    CIS700WEBGLCORE.registerAsyncObj( gl, blurProg );

    //----------------------------------------------------DOWNSAMPLE PASS:
    //Create a shader program for displaying FBO contents
    downsampleProg = CIS700WEBGLCORE.createShaderProgram();
    downsampleProg.loadShader( gl, 
                         "/../shader/finalPass.vert", 
                         "/../shader/downSample.frag" );

    downsampleProg.addCallback( function(){
        //query the locations of shader parameters
        downsampleProg.aVertexPosLoc = gl.getAttribLocation( downsampleProg.ref(), "a_pos" );
        downsampleProg.aVertexTexcoordLoc = gl.getAttribLocation( downsampleProg.ref(), "a_texcoord");
        downsampleProg.uSourceLoc = gl.getUniformLocation( downsampleProg.ref(), "u_source");
        downsampleProg.uPixDimLoc = gl.getUniformLocation( downsampleProg.ref(), "u_pixDim");
        gl.useProgram(downsampleProg.ref());
        var width = CIS700WEBGLCORE.canvas.width;
        var height = CIS700WEBGLCORE.canvas.height;
        gl.uniform2fv(downsampleProg.uPixDimLoc, vec2.fromValues(1.0 / width, 1.0 / height));

    } );

    CIS700WEBGLCORE.registerAsyncObj( gl, downsampleProg );
}

var drawModel = function(){
    
    //update the model-view matrix
    var mvpMat = mat4.create();
    mat4.multiply( mvpMat, persp, camera.getViewTransform() );

    //update the normal matrix
    var nmlMat = mat4.create();
    mat4.invert( nmlMat, camera.getViewTransform() );
    mat4.transpose( nmlMat, nmlMat);

    gl.uniformMatrix4fv( passProg.uModelViewLoc, false, camera.getViewTransform());        
    gl.uniformMatrix4fv( passProg.uMVPLoc, false, mvpMat );        
    gl.uniformMatrix4fv( passProg.uNormalMatLoc, false, nmlMat );       

    //------------------DRAW MODEL:
    
    for ( var i = 0; i < model_vertexVBOs.length; ++i ){
        //Bind vertex pos buffer
        gl.bindBuffer( gl.ARRAY_BUFFER, model_vertexVBOs[i] );
        gl.vertexAttribPointer( passProg.aVertexPosLoc, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( passProg.aVertexPosLoc );

        //Bind vertex normal buffer
        gl.bindBuffer( gl.ARRAY_BUFFER, model_normalVBOs[i] );
        gl.vertexAttribPointer( passProg.aVertexNormalLoc, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( passProg.aVertexNormalLoc );

        //Bind vertex texcoord buffer
        gl.bindBuffer( gl.ARRAY_BUFFER, model_texcoordVBOs[i] );
        gl.vertexAttribPointer( passProg.aVertexTexcoordLoc, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( passProg.aVertexTexcoordLoc );
        
        if ( model_texcoordVBOs[i].texture ) {
            //Bind texture    
            gl.activeTexture( gl.TEXTURE0 );
            gl.bindTexture( gl.TEXTURE_2D, model_texcoordVBOs[i].texture );
            gl.uniform1i( passProg.uSamplerLoc, 0 );
        }

        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, model_indexVBOs[i] );
        gl.drawElements( gl.TRIANGLES, model_indexVBOs[i].numIndex, gl.UNSIGNED_SHORT, 0 );

        gl.bindBuffer( gl.ARRAY_BUFFER, null );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );    
    } 
};

function initUiButtons() {
    
    CIS700WEBGLCORE.ui = new UI("uiWrapper");

    var lilSigCallback = function(e) {

        var newSliderVal = e.target.value;
        gl.useProgram(blurProg.ref());
        gl.uniform1f(blurProg.uLilSigLoc, newSliderVal);

        return "Sigma: " + newSliderVal;
    };

    CIS700WEBGLCORE.ui.addSlider("Sigma: " + SIGMA_START,
                 lilSigCallback,
                 SIGMA_START,
                 0.1, 50.0,
                 0.1);
}

/*
 * Renders the geometry and output color, normal, depth information
 */
var deferredRenderPass1 = function(){

    gl.bindTexture( gl.TEXTURE_2D, null );
    fbo.bind(gl);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    gl.enable( gl.DEPTH_TEST );

    gl.useProgram( passProg.ref() );

    drawModel();

    fbo.unbind(gl);
}; 

/* 
 * Does post-processing effect using the data obtained in part 1 
 */
var deferredRenderPass2 = function() {

    workingFBO.bind(gl);

    gl.useProgram( renderQuadProg.ref() );
    gl.disable( gl.DEPTH_TEST );

    gl.uniform1f( renderQuadProg.uZNearLoc, zNear );
    gl.uniform1f( renderQuadProg.uZFarLoc, zFar );
    gl.uniform1i( renderQuadProg.uDisplayTypeLoc, texToDisplay );

    gl.activeTexture( gl.TEXTURE0 );  //position
    gl.bindTexture( gl.TEXTURE_2D, fbo.texture(0) );
    gl.uniform1i( renderQuadProg.uPosSamplerLoc, 0 );

    gl.activeTexture( gl.TEXTURE1 );  //normal
    gl.bindTexture( gl.TEXTURE_2D, fbo.texture(1) );
    gl.uniform1i( renderQuadProg.uNormalSamplerLoc, 1 );

    gl.activeTexture( gl.TEXTURE2 );  //Color
    gl.bindTexture( gl.TEXTURE_2D, fbo.texture(2) );
    gl.uniform1i( renderQuadProg.uColorSamplerLoc, 2 );

    gl.activeTexture( gl.TEXTURE3 );  //depth
    gl.bindTexture( gl.TEXTURE_2D, fbo.depthTexture() );
    gl.uniform1i( renderQuadProg.uDepthSamplerLoc, 3 );

    bindQuadBuffers(renderQuadProg);

    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );

    workingFBO.unbind(gl);
};


/*
 * Two passes, one to blur vertically and one to blur horizontally
 */
var blurPasses = function(sourceTexture) {
    var vertical = 1;
    var horizontal = 0;

    workingFBO.bind(gl);
    gl.useProgram( blurProg.ref() );
    gl.disable( gl.DEPTH_TEST );

     // first, texToDisplay texture is source
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture( gl.TEXTURE_2D, sourceTexture );
    gl.uniform1i( blurProg.uSourceLoc, 0 );
    // workingFBO slot 0 will be written to with the vertical blur
    // making a vertical smear (1 = Vertical Pass)
    gl.uniform1i( blurProg.uBlurDirectionLoc, vertical );
    // and draw!

    bindQuadBuffers(blurProg);

    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );
    
    // then, vertically blured texture is source (old dest)
    
    gl.bindTexture( gl.TEXTURE_2D, workingFBO.texture(0) );
    gl.uniform1i( blurProg.uSourceLoc, 0);

    gl.uniform1i( blurProg.uBlurDirectionLoc, horizontal );

    bindQuadBuffers(blurProg);
    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );
    workingFBO.unbind(gl);
   
};

var downsamplePass = function(hiResTex){

    gl.useProgram( downsampleProg.ref() );
    workingFBO.bind(gl);

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, hiResTex );
    gl.uniform1i( downsampleProg.uSourceLoc, 0 );

    gl.disable( gl.DEPTH_TEST );
    bindQuadBuffers(downsampleProg);

    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );

}

var finalPass = function(){

    gl.useProgram(finalPassProg.ref());
    gl.bindFramebuffer( gl.FRAMEBUFFER, null );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, workingFBO.texture(0));
    gl.uniform1i(finalPassProg.uFinalImageLoc, 0);

    gl.disable( gl.DEPTH_TEST );
    bindQuadBuffers(finalPassProg);

    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );
}

var myRender = function() {

    deferredRenderPass1();

    var finalImage;

    if (secondPass === renderQuadProg) {
        deferredRenderPass2();
    }
    else if (secondPass === blurProg) {
        blurPasses(fbo.texture(texToDisplay));
    }
    else if (secondPass === dofProg) {
        downsamplePass(fbo.texture(texToDisplay));
    }
    finalPass();
}

// Customized looping function
var myRenderLoop = function() {

    window.requestAnimationFrame( myRenderLoop );
    myRender();
};

var main = function( canvasId, messageId ){
    "use strict"

    setupScene(canvasId, messageId);

    loadObjects();

    setKeyInputs();
        //'1' = Attachment 1: vertex position
        //'2' = Attachment 2: vertex normal
        //'3' = Attachment 3: vertex color
        //'4' = Attachment 4: vertex depth 

    createScreenSizedQuad();

    createShaders();

    //Attach our custom rendering functions
    CIS700WEBGLCORE.render = myRender;
    CIS700WEBGLCORE.renderLoop = myRenderLoop;

    //Start rendering loop (when all resources are finished loading asynchronously)
    CIS700WEBGLCORE.run(gl);
    
};

//-----------------------------------------------------------STANDARD SETUP METHODS:

var createScreenSizedQuad = function() {

    quad_vertexVBO = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, quad_vertexVBO );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(screenQuad.vertices), gl.STATIC_DRAW );
 
    quad_texcoordVBO = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, quad_texcoordVBO );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(screenQuad.texcoords), gl.STATIC_DRAW );   
    gl.bindBuffer( gl.ARRAY_BUFFER, null );

    quad_indexVBO = gl.createBuffer();
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, quad_indexVBO );
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(screenQuad.indices), gl.STATIC_DRAW );
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );   
};

/*
 * Loads objects from obj files into the model_VBOs
 */
var loadObjects = function() {
    //Load a OBJ model from file
    var objLoader = CIS700WEBGLCORE.createOBJLoader();
    // objLoader.loadFromFile( gl, 'models/coke/coke.obj', 'models/coke/coke.mtl');
    // objLoader.loadFromFile( gl, 'models/buddha_new/buddha_scaled_.obj', 'models/buddha_new/buddha_new.mtl');
    objLoader.loadFromFile( gl, '/../models/dabrovic-sponza/sponza.obj', 
                                '/../models/dabrovic-sponza/sponza.mtl');
    
    //213412//What was this!?
    
    //Register a callback function that extracts vertex and normal 
    //and put it in our VBO
    objLoader.addCallback( function(){
         
        //There might be multiple geometry groups in the model
        for (var i = 0; i < objLoader.numGroups(); ++i) {

            model_vertexVBOs[i] = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, model_vertexVBOs[i] );
            gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( objLoader.vertices(i) ), gl.STATIC_DRAW );

            model_normalVBOs[i] = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, model_normalVBOs[i] );
            gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( objLoader.normals(i) ), gl.STATIC_DRAW ); 

            model_texcoordVBOs[i] = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, model_texcoordVBOs[i] );
            gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( objLoader.texcoords(i) ), gl.STATIC_DRAW ); 
            gl.bindBuffer( gl.ARRAY_BUFFER, null );

            if (objLoader.texture(i)) {

                model_texcoordVBOs[i].texture = objLoader.texture(i);    
            }
            

            model_indexVBOs[i] = gl.createBuffer();
            gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, model_indexVBOs[i] );
            gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array( objLoader.indices(i) ), gl.STATIC_DRAW );
            model_indexVBOs[i].numIndex = objLoader.indices(i).length;

            gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
        }
    });
    CIS700WEBGLCORE.registerAsyncObj( gl, objLoader );    
}

var setKeyInputs = function() {
    
    window.onkeydown = function(ev) {

        interactor.onKeyDown(ev);
        switch( ev.keyCode ){
          case 49: texToDisplay = 0; break;     //show position texture
          case 50: texToDisplay = 1; break;     //show normal texture
          case 51: texToDisplay = 2; break;     //show texture texture
          case 52: texToDisplay = 3; break;     //show depth texture

          case 53: secondPass = blurProg; break;
          case 54: secondPass = renderQuadProg; break;
          case 55: secondPass = dofProg; break;
        }
    }; 
}

/*
 * Sets up basics of scene; camera, viewport, projection matrix, fbo
 */
var setupScene = function(canvasId, messageId ) {
    var canvas;
    var msg;
    //----SETUP SCENE
    //get WebGL context
    canvas = document.getElementById( canvasId );
    CIS700WEBGLCORE.canvas = canvas;
    msg = document.getElementById( messageId );
    gl = CIS700WEBGLCORE.getWebGLContext( canvas, msg );
    if (! gl) {
        console.log("Bad GL Context!");
        return;
    }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.3, 0.3, 0.3, 1.0 );

    gl.enable( gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    //gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    //Setup camera
    view = mat4.create();
    mat4.identity( view );

    persp = mat4.create();

    //mat4.perspective use radiance
    mat4.perspective( persp, 60 * 3.1415926 / 180, 
                      canvas.width / canvas.height, zNear, zFar );
    //Create a camera, and attach it to the interactor
    camera = CIS700WEBGLCORE.createCamera(CAMERA_TRACKING_TYPE);
    camera.goHome( [-1, 4,0] ); //initial camera posiiton
    interactor = CIS700WEBGLCORE.CameraInteractor( camera, canvas );

    //Create a FBO
    fbo = CIS700WEBGLCORE.createFBO();
    if (! fbo.initialize( gl, canvas.width, canvas.height )) {
        console.log( "FBO initialization failed.");
        return;
    }

    lowResFBO = CIS700WEBGLCORE.createFBO();
    if (! lowResFBO.initialize( gl, canvas.width / 4, canvas.height / 4)) {
        console.log( "display FBO initialization failed.");
        return;
    }

    workingFBO = CIS700WEBGLCORE.createFBO();
    if (! workingFBO.initialize( gl, canvas.width, canvas.height )) {
        console.log( "workingFBO initialization failed.");
        return;
    }
};

//--------------------------------------------------------------------------HELPERS:

var bindQuadBuffers = function(program) {

    gl.bindBuffer( gl.ARRAY_BUFFER, quad_vertexVBO );
    gl.vertexAttribPointer( program.aVertexPosLoc, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( program.aVertexPosLoc );

    gl.bindBuffer( gl.ARRAY_BUFFER, quad_texcoordVBO );
    gl.vertexAttribPointer( program.aVertexTexcoordLoc, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( program.aVertexTexcoordLoc );

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, quad_indexVBO );  
}

var setActiveTexture = function(gl, texNum) {
    
    switch (texNum) {
        case 0:
            gl.activeTexture( gl.TEXTURE0 );
            break;
        case 1:
            gl.activeTexture( gl.TEXTURE1 );
            break;
        case 2:
            gl.activeTexture( gl.TEXTURE2 );
            break;
        case 3:
            gl.activeTexture( gl.TEXTURE3 );
            break;

    }
}
