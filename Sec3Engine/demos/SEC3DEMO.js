

//--------------------------------------------------------------------------GLOBALS:
//Global variables
//Bad practice, but let's just leave them here
var gl;    //GL context object
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

var fillGProg;           //shader program passing data to FBO
var bufferRenderProg;     //shader program showing the FBO buffers
var blurProg;
var downsampleProg;
var dofProg;
var showShadowMap;

var fbo;    //Framebuffer object storing data for postprocessing effects
var lowResFBO; //Framebuffer object for storing unprocessed image
var workingFBO;

var demo = (function () {

    var demo = [];
    demo.zFar = 30.0;
    demo.zNear = 0.4;
    demo.selectedLight = 0;
    demo.MAX_LIGHTS = 8;
    demo.MAX_CASCADES = 6;
    demo.AMBIENT_INTENSITY = 0.05;

    demo.texToDisplay = 2;
    demo.secondPass;

    demo.nearSlope = -6.6;
    demo.nearIntercept = 1.39;

    demo.farSlope = 0.8;
    demo.farIntercept = -0.25

    demo.blurSigma = 2.0;

    demo.SMALL_BLUR = 1.8;
    demo.MEDIUM_BLUR = 3.4;
    demo.LARGE_BLUR = 11.6;

    demo.SHADOWMAP_SIZE = 1024.0;
    demo.FAR_CASCADE_SIZE = 256;
    demo.NEAR_CASCADE_SIZE = 1024;
    return demo;

})();



//--------------------------------------------------------------------------METHODS:

/*
 * Creates shader programs and sets uniforms
 */
var createShaders = function() {
    //----------------------------------------------------FIRST PASS:
    //Create a shader program for output scene data to FB
    fillGProg = SEC3.createShaderProgram();
    //Load the shader source asynchronously
    fillGProg.loadShader( gl, 
                         "Sec3Engine/shader/deferredRenderPass1.vert", 
                         "Sec3Engine/shader/deferredRenderPass1.frag" );
    
    fillGProg.addCallback( function() {
        gl.useProgram( fillGProg.ref() );
        //query the locations of shader parameters
        fillGProg.aVertexPosLoc = gl.getAttribLocation( fillGProg.ref(), "a_pos" );
        fillGProg.aVertexNormalLoc = gl.getAttribLocation( fillGProg.ref(), "a_normal" );
        fillGProg.aVertexTexcoordLoc = gl.getAttribLocation( fillGProg.ref(), "a_texcoord" );

        fillGProg.uPerspLoc = gl.getUniformLocation( fillGProg.ref(), "u_projection" );
        fillGProg.uModelViewLoc = gl.getUniformLocation( fillGProg.ref(), "u_modelview" );
        fillGProg.uMVPLoc = gl.getUniformLocation( fillGProg.ref(), "u_mvp" );
        fillGProg.uNormalMatLoc = gl.getUniformLocation( fillGProg.ref(), "u_normalMat");
        fillGProg.uSamplerLoc = gl.getUniformLocation( fillGProg.ref(), "u_sampler");

    } );

    //Register the asynchronously-requested resources with the engine core
    //asynchronously-requested resources are loaded using AJAX 
    SEC3.registerAsyncObj( gl, fillGProg );

    //----------------------------------------------------BLEND ADDITIVE:
    //Create a shader program for output scene data to FB
    blendAdditiveProg = SEC3.createShaderProgram();
    //Load the shader source asynchronously
    blendAdditiveProg.loadShader( gl, 
                         "Sec3Engine/shader/deferredRenderPass2.vert", 
                         "Sec3Engine/shader/blendAdditive.frag" );
    
    blendAdditiveProg.addCallback( function() {
        gl.useProgram( blendAdditiveProg.ref() );
        //query the locations of shader parameters
        blendAdditiveProg.aVertexPosLoc = gl.getAttribLocation( blendAdditiveProg.ref(), "a_pos" );
        blendAdditiveProg.aVertexTexcoordLoc = gl.getAttribLocation( blendAdditiveProg.ref(), "a_texcoord" );
        
        blendAdditiveProg.uTexture1Loc = gl.getUniformLocation( blendAdditiveProg.ref(), "u_texture1");
        blendAdditiveProg.uWeight1Loc = gl.getUniformLocation( blendAdditiveProg.ref(), "u_weight1");
        blendAdditiveProg.uTexture2Loc = gl.getUniformLocation( blendAdditiveProg.ref(), "u_texture2");
        blendAdditiveProg.uWeight2Loc = gl.getUniformLocation( blendAdditiveProg.ref(), "u_weight2");        
    } );

    //Register the asynchronously-requested resources with the engine core
    //asynchronously-requested resources are loaded using AJAX 
    SEC3.registerAsyncObj( gl, blendAdditiveProg );

    //----------------------------------------------------Render contents of fbo:
    //Create a shader program for displaying FBO contents
    bufferRenderProg = SEC3.createShaderProgram();
    bufferRenderProg.loadShader( gl, 
                               "Sec3Engine/shader/bufferRender.vert", 
                               "Sec3Engine/shader/bufferRender.frag" );

    bufferRenderProg.addCallback( function(){
        //query the locations of shader parameters
        bufferRenderProg.aVertexPosLoc = gl.getAttribLocation( bufferRenderProg.ref(), "a_pos" );
        bufferRenderProg.aVertexTexcoordLoc = gl.getAttribLocation( bufferRenderProg.ref(), "a_texcoord" );

        bufferRenderProg.uPosSamplerLoc = gl.getUniformLocation( bufferRenderProg.ref(), "u_positionTex");
        bufferRenderProg.uNormalSamplerLoc = gl.getUniformLocation( bufferRenderProg.ref(), "u_normalTex");
        bufferRenderProg.uColorSamplerLoc = gl.getUniformLocation( bufferRenderProg.ref(), "u_colorTex");
        bufferRenderProg.uDepthSamplerLoc = gl.getUniformLocation( bufferRenderProg.ref(), "u_depthTex");

        bufferRenderProg.uZNearLoc = gl.getUniformLocation( bufferRenderProg.ref(), "u_zNear" );
        bufferRenderProg.uZFarLoc = gl.getUniformLocation( bufferRenderProg.ref(), "u_zFar" );
        bufferRenderProg.uDisplayTypeLoc = gl.getUniformLocation( bufferRenderProg.ref(), "u_displayType" );

        gl.useProgram( bufferRenderProg.ref() );
        gl.uniform1f( bufferRenderProg.uZNearLoc, demo.zNear );
        gl.uniform1f( bufferRenderProg.uZFarLoc, demo.zFar );

    } );
    SEC3.registerAsyncObj( gl, bufferRenderProg );

    //----------------------------------------------------Deferred Render:
    //Create a shader program for displaying FBO contents
    deferredRenderProg = SEC3.createShaderProgram();
    deferredRenderProg.loadShader( gl, 
                               "Sec3Engine/shader/deferredRenderPass2.vert", 
                               "Sec3Engine/shader/deferredRenderPass2.frag" );

    deferredRenderProg.addCallback( function(){
        //query the locations of shader parameters
        deferredRenderProg.aVertexPosLoc = gl.getAttribLocation( deferredRenderProg.ref(), "a_pos" );
        deferredRenderProg.aVertexTexcoordLoc = gl.getAttribLocation( deferredRenderProg.ref(), "a_texcoord" );
        deferredRenderProg.aVertexEyeRayLoc = gl.getAttribLocation( deferredRenderProg.ref(), "a_eyeRay" );        

        deferredRenderProg.uPosSamplerLoc = gl.getUniformLocation( deferredRenderProg.ref(), "u_positionTex");
        deferredRenderProg.uNormalSamplerLoc = gl.getUniformLocation( deferredRenderProg.ref(), "u_normalTex");
        deferredRenderProg.uColorSamplerLoc = gl.getUniformLocation( deferredRenderProg.ref(), "u_colorTex");
        deferredRenderProg.uDepthSamplerLoc = gl.getUniformLocation( deferredRenderProg.ref(), "u_depthTex");
        deferredRenderProg.uShadowMapLoc = gl.getUniformLocation( deferredRenderProg.ref(), "u_shadowMap");
        deferredRenderProg.uMLPLoc = gl.getUniformLocation( deferredRenderProg.ref(), "u_mlp");
        deferredRenderProg.uLPosLoc = gl.getUniformLocation( deferredRenderProg.ref(), "u_lPos");
        deferredRenderProg.uCPosLoc = gl.getUniformLocation( deferredRenderProg.ref(), "u_cPos");

        deferredRenderProg.uZNearLoc = gl.getUniformLocation( deferredRenderProg.ref(), "u_zNear" );
        deferredRenderProg.uZFarLoc = gl.getUniformLocation( deferredRenderProg.ref(), "u_zFar" );
        deferredRenderProg.uShadowMapResLoc = gl.getUniformLocation( deferredRenderProg.ref(), "u_shadowMapRes" );

        gl.useProgram( deferredRenderProg.ref() );
        gl.uniform1f( deferredRenderProg.uZNearLoc, demo.zNear );
        gl.uniform1f( deferredRenderProg.uZFarLoc, demo.zFar );

    } );
    SEC3.registerAsyncObj( gl, deferredRenderProg );

    //----------------------------------------------------DEBUG VIEW Deferred Render:
    //Create a shader program for displaying FBO contents
    debugGProg = SEC3.createShaderProgram();
    debugGProg.loadShader( gl, 
                               "Sec3Engine/shader/deferredRenderPass2.vert", 
                               "Sec3Engine/shader/debugGBuffer.frag" );

    debugGProg.addCallback( function(){
        //query the locations of shader parameters
        debugGProg.aVertexPosLoc = gl.getAttribLocation( debugGProg.ref(), "a_pos" );
        debugGProg.aVertexTexcoordLoc = gl.getAttribLocation( debugGProg.ref(), "a_texcoord" );

        debugGProg.uPosSamplerLoc = gl.getUniformLocation( debugGProg.ref(), "u_positionTex");
        debugGProg.uNormalSamplerLoc = gl.getUniformLocation( debugGProg.ref(), "u_normalTex");
        debugGProg.uColorSamplerLoc = gl.getUniformLocation( debugGProg.ref(), "u_colorTex");
        debugGProg.uDepthSamplerLoc = gl.getUniformLocation( debugGProg.ref(), "u_depthTex");
       
        debugGProg.uZNearLoc = gl.getUniformLocation( debugGProg.ref(), "u_zNear" );
        debugGProg.uZFarLoc = gl.getUniformLocation( debugGProg.ref(), "u_zFar" );
       
        gl.useProgram( debugGProg.ref() );
        gl.uniform1f( debugGProg.uZNearLoc, demo.zNear );
        gl.uniform1f( debugGProg.uZFarLoc, demo.zFar );

    } );
    SEC3.registerAsyncObj( gl, debugGProg );

    //---------------------------------------------------FINAL PASS:

    finalfillGProg = SEC3.createShaderProgram();
    finalfillGProg.loadShader( gl, 
                               "Sec3Engine/shader/finalPass.vert", 
                               "Sec3Engine/shader/finalPass.frag" );

    finalfillGProg.addCallback( function(){
        //query the locations of shader parameters
        finalfillGProg.aVertexPosLoc = gl.getAttribLocation( finalfillGProg.ref(), "a_pos" );
        finalfillGProg.aVertexTexcoordLoc = gl.getAttribLocation( finalfillGProg.ref(), "a_texcoord" );
        
        finalfillGProg.uFinalImageLoc = gl.getUniformLocation( finalfillGProg.ref(), "u_colorTex");

    } );
    SEC3.registerAsyncObj( gl, finalfillGProg );

    //----------------------------------------------------BLUR PASS:
    //Create a shader program for displaying FBO contents
    blurProg = SEC3.createShaderProgram();
    blurProg.loadShader( gl, 
                         "Sec3Engine/shader/texture.vert", 
                         "Sec3Engine/shader/gaussianBlur.frag" );

    blurProg.addCallback( function(){
        //query the locations of shader parameters
        blurProg.aVertexPosLoc = gl.getAttribLocation( blurProg.ref(), "a_pos" );
        blurProg.aVertexTexcoordLoc = gl.getAttribLocation( blurProg.ref(), "a_texcoord");
        blurProg.uSourceLoc = gl.getUniformLocation( blurProg.ref(), "u_source");
        blurProg.uBlurDirectionLoc = gl.getUniformLocation( blurProg.ref(), "u_blurDirection");
        blurProg.uLilSigLoc = gl.getUniformLocation( blurProg.ref(), "u_lilSig");
        blurProg.uPixDimLoc = gl.getUniformLocation( blurProg.ref(), "u_pixDim");
        gl.useProgram(blurProg.ref());
        var width = SEC3.canvas.width;
        var height = SEC3.canvas.height;
        gl.uniform2fv(blurProg.uPixDimLoc, vec2.fromValues(1.0 / width, 1.0 / height));
        gl.uniform1f(blurProg.uLilSigLoc, 4.0);
    } );

    SEC3.registerAsyncObj( gl, blurProg );

    //----------------------------------------------------DOWNSAMPLE PASS:
    //Create a shader program for displaying FBO contents
    downsampleProg = SEC3.createShaderProgram();
    downsampleProg.loadShader( gl, 
                         "Sec3Engine/shader/finalPass.vert", 
                         "Sec3Engine/shader/downSample.frag" );

    downsampleProg.addCallback( function(){
        //query the locations of shader parameters
        downsampleProg.aVertexPosLoc = gl.getAttribLocation( downsampleProg.ref(), "a_pos" );
        downsampleProg.aVertexTexcoordLoc = gl.getAttribLocation( downsampleProg.ref(), "a_texcoord");
        downsampleProg.uSourceLoc = gl.getUniformLocation( downsampleProg.ref(), "u_source");
        downsampleProg.uPixDimLoc = gl.getUniformLocation( downsampleProg.ref(), "u_pixDim");
        downsampleProg.uWriteSlotLoc = gl.getUniformLocation( downsampleProg.ref(), "u_writeSlot");
        gl.useProgram(downsampleProg.ref());
        var width = SEC3.canvas.width;
        var height = SEC3.canvas.height;
        gl.uniform2fv(downsampleProg.uPixDimLoc, vec2.fromValues(1.0 / width, 1.0 / height));

    } );

    SEC3.registerAsyncObj( gl, downsampleProg );

    //-------------------------------------------------DOFDOWNSAMPLE PASS:
  
    dofDownsampleProg = SEC3.createShaderProgram();
    dofDownsampleProg.loadShader( gl, 
                         "Sec3Engine/shader/finalPass.vert", 
                         "Sec3Engine/shader/dofDownSample.frag" );

    dofDownsampleProg.addCallback( function(){
        //query the locations of shader parameters
        dofDownsampleProg.aVertexPosLoc = gl.getAttribLocation( dofDownsampleProg.ref(), "a_pos" );
        dofDownsampleProg.aVertexTexcoordLoc = gl.getAttribLocation( dofDownsampleProg.ref(), "a_texcoord");
        dofDownsampleProg.uSourceLoc = gl.getUniformLocation( dofDownsampleProg.ref(), "u_source");
        dofDownsampleProg.uDepthLoc = gl.getUniformLocation( dofDownsampleProg.ref(), "u_depth");
        dofDownsampleProg.uPixDimLoc = gl.getUniformLocation( dofDownsampleProg.ref(), "u_pixDim");
        dofDownsampleProg.uNearLoc = gl.getUniformLocation( dofDownsampleProg.ref(), "u_near");
        dofDownsampleProg.uFarLoc = gl.getUniformLocation( dofDownsampleProg.ref(), "u_far");
        dofDownsampleProg.uDofEqLoc = gl.getUniformLocation( dofDownsampleProg.ref(), "u_dofEq");
        gl.useProgram(dofDownsampleProg.ref());
        var width = SEC3.canvas.width;
        var height = SEC3.canvas.height;
        gl.uniform2fv(dofDownsampleProg.uPixDimLoc, vec2.fromValues(1.0 / width, 1.0 / height));
        gl.uniform1f( dofDownsampleProg.uNearLoc, demo.zNear );
        gl.uniform1f( dofDownsampleProg.uFarLoc, demo.zFar );
        gl.uniform2fv( dofDownsampleProg.uDofEqLoc, vec2.fromValues(demo.nearSlope, demo.nearIntercept));
    } );

    SEC3.registerAsyncObj( gl, dofDownsampleProg );

    //-----------------------------------------------DOFCOMP PASS:
    
    dofCompProg = SEC3.createShaderProgram();
    dofCompProg.loadShader( gl,
                            "Sec3Engine/shader/finalPass.vert",
                            "Sec3Engine/shader/dofComp.frag");

    dofCompProg.addCallback( function(){

        dofCompProg.aVertexPosLoc = gl.getAttribLocation( dofCompProg.ref(), "a_pos" );
        dofCompProg.aVertexTexcoordLoc = gl.getAttribLocation( dofCompProg.ref(), "a_texcoord" );
        dofCompProg.uBlurredForegroundLoc = gl.getUniformLocation( dofCompProg.ref(), "u_blurredForeground" );
        dofCompProg.uUnalteredImageLoc = gl.getUniformLocation( dofCompProg.ref(), "u_unalteredImage" );
        dofCompProg.uDownsampledLoc = gl.getUniformLocation( dofCompProg.ref(), "u_downsampled" );
        dofCompProg.uSmallBlurLoc = gl.getUniformLocation( dofCompProg.ref(), "u_smallBlur" );
        dofCompProg.uDepthLoc = gl.getUniformLocation( dofCompProg.ref(), "u_depth" );
        dofCompProg.uFarEqLoc = gl.getUniformLocation( dofCompProg.ref(), "u_farEq" );
        dofCompProg.uZNearLoc = gl.getUniformLocation( dofCompProg.ref(), "u_near" );
        dofCompProg.uZFarLoc = gl.getUniformLocation( dofCompProg.ref(), "u_far" );

    } );

    SEC3.registerAsyncObj( gl, dofCompProg );

     //-----------------------------------------------DOFCOMP PASS:

    dofCalcCocProg = SEC3.createShaderProgram();
    dofCalcCocProg.loadShader( gl,
                               "Sec3Engine/shader/finalPass.vert",
                               "Sec3Engine/shader/dofCalcCoc.frag");

    dofCalcCocProg.addCallback( function(){

        dofCalcCocProg.aVertexPosLoc = gl.getAttribLocation( dofCalcCocProg.ref(), "a_pos" );
        dofCalcCocProg.aVertexTexcoordLoc = gl.getAttribLocation( dofCalcCocProg.ref(), "a_texcoord");
        dofCalcCocProg.uDownsampledLoc = gl.getUniformLocation( dofCalcCocProg.ref(), "u_downsampled" ); 
        dofCalcCocProg.uBlurredForegroundLoc = gl.getUniformLocation( dofCalcCocProg.ref(), "u_blurredForeground" );
    });

    SEC3.registerAsyncObj( gl, dofCalcCocProg );

    buildShadowMapProg = SEC3.ShaderCreator.buildShadowMapPrograms(gl, scene);
    renderWithCascadesProg = SEC3.ShaderCreator.renderCascShadowProg(gl, scene);
    
};

var updateShadowMaps = function(scene){

    var light;

    for(var i = 0; i < scene.getNumLights(); i++ ) {
            
        light = scene.getLight(i);
        
        for( var ii = 0; ii < light.numCascades; ii++ ) {
            drawShadowMap(light, ii);
        }
    }
};

/*
 *  light to render from wich, cascade index
 */
var drawShadowMap = function(light, index){

    if(index === undefined ){
        index = 0;
    }

    var shadowFbo = light.cascadeFramebuffers[index];
    var lMat = light.getViewTransform();
    // var pMat = light.getProjectionMat();
    var pMat = light.cascadeMatrices[index];
    var resolution = shadowFbo.getWidth();

    gl.bindTexture( gl.TEXTURE_2D, null );
    shadowFbo.bind(gl);
   
    gl.viewport(0, 0, resolution, resolution );
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT );
    if ( demo.secondPass === buildShadowMapProg) {
         gl.colorMask(false,false,false,false);
    }
    gl.enable( gl.DEPTH_TEST );
    // gl.cullFace(gl.BACK);
    gl.useProgram(buildShadowMapProg.ref());
    var mlpMat = mat4.create();
    mat4.multiply( mlpMat, pMat, lMat );
    gl.uniformMatrix4fv( buildShadowMapProg.uMLPLoc, false, mlpMat );

    //----------------DRAW MODEL:

    for ( var i = 0; i < model_vertexVBOs.length; ++i ){
        //Bind vertex pos buffer
        gl.bindBuffer( gl.ARRAY_BUFFER, model_vertexVBOs[i] );
        gl.vertexAttribPointer( buildShadowMapProg.aVertexPosLoc, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( buildShadowMapProg.aVertexPosLoc );

        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, model_indexVBOs[i] );
        gl.drawElements( gl.TRIANGLES, model_indexVBOs[i].numIndex, gl.UNSIGNED_SHORT, 0 );

        gl.bindBuffer( gl.ARRAY_BUFFER, null );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );    
    }
    if ( demo.secondPass === buildShadowMapProg) {
        gl.colorMask(true,true,true,true);
    }
    shadowFbo.unbind(gl);
    // gl.cullFace(gl.BACK);
};

var drawModel = function (program, textureOffset) {

    textureOffset = textureOffset || 0;

    //update the normal matrix
    var nmlMat = mat4.create();
    mat4.invert( nmlMat, camera.getViewTransform() );
    mat4.transpose( nmlMat, nmlMat);
    gl.uniformMatrix4fv( program.uNormalMatLoc, false, nmlMat)

    //------------------DRAW MODEL:
    
    for ( var i = 0; i < model_vertexVBOs.length; ++i ){
        //Bind vertex pos buffer
        gl.bindBuffer( gl.ARRAY_BUFFER, model_vertexVBOs[i] );
        gl.vertexAttribPointer( program.aVertexPosLoc, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( program.aVertexPosLoc );

        //Bind vertex normal buffer
        gl.bindBuffer( gl.ARRAY_BUFFER, model_normalVBOs[i] );
        gl.vertexAttribPointer( program.aVertexNormalLoc, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( program.aVertexNormalLoc );

        //Bind vertex texcoord buffer
        gl.bindBuffer( gl.ARRAY_BUFFER, model_texcoordVBOs[i] );
        gl.vertexAttribPointer( program.aVertexTexcoordLoc, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( program.aVertexTexcoordLoc );
        
        if ( model_texcoordVBOs[i].texture ) {
            //Bind texture    
            gl.activeTexture( gl.TEXTURE0 + textureOffset );
            gl.bindTexture( gl.TEXTURE_2D, model_texcoordVBOs[i].texture );
            gl.uniform1i( program.uSamplerLoc, textureOffset );
        }
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, model_indexVBOs[i] );
        gl.drawElements( gl.TRIANGLES, model_indexVBOs[i].numIndex, gl.UNSIGNED_SHORT, 0 );
    }
};

function initDofButtons() {

    SEC3.ui = SEC3.ui || new UI("uiWrapper");

    var slopeCallback = function(e) {

        var newSliderVal = e.target.value;
        gl.useProgram(dofDownsampleProg.ref());
        demo.nearSlope = newSliderVal;
        gl.uniform2fv(dofDownsampleProg.uDofEqLoc, vec2.fromValues( demo.nearSlope, demo.nearIntercept ));

        return demo.nearSlope + " :Near slope";
    };

    SEC3.ui.addSlider( demo.nearSlope + " :Near slope" ,
                 slopeCallback,
                 demo.nearSlope,
                 -10.0, -1.0,
                 0.01);

    var interceptCallback = function(e) {

        var newSliderVal = e.target.value;
        gl.useProgram(dofDownsampleProg.ref());
        demo.nearIntercept = newSliderVal;
        gl.uniform2fv(dofDownsampleProg.uDofEqLoc, vec2.fromValues( demo.nearSlope, demo.nearIntercept ));

        return demo.nearIntercept + " :Near intercept";
    };

    SEC3.ui.addSlider( demo.nearIntercept + " :Near intercept",
                 interceptCallback,
                 demo.nearIntercept,
                 1.0, 3.0,
                 0.01);

    var largeBlurrCallback = function(e) {

        demo.LARGE_BLUR = e.target.value;
        return demo.LARGE_BLUR + " :Large blur";
    }
    SEC3.ui.addSlider( demo.LARGE_BLUR + " :Large blur",
                                 largeBlurrCallback,
                                 demo.LARGE_BLUR,
                                 2.0, 16.0,
                                 0.1);

    var mediumBlurrCallback = function(e) {

        demo.MEDIUM_BLUR = e.target.value;
        return demo.MEDIUM_BLUR + " :Medium blur";
    }
    SEC3.ui.addSlider( demo.MEDIUM_BLUR + " :Medium blur",
                                 mediumBlurrCallback,
                                 demo.MEDIUM_BLUR,
                                 1.0, 8.0,
                                 0.1);

    var smallBlurrCallback = function(e) {

        demo.SMALL_BLUR = e.target.value;
        return demo.SMALL_BLUR + " :Small blur";
    }
    SEC3.ui.addSlider( demo.SMALL_BLUR + " :Small blur",
                                 smallBlurrCallback,
                                 demo.SMALL_BLUR,
                                 0.0, 3.0,
                                 0.1);
};

var fillGPass = function( program, framebuffer ) {

    gl.useProgram( program.ref() );
    framebuffer.bind(gl);
    gl.viewport( 0, 0, framebuffer.getWidth(), framebuffer.getHeight() );
    gl.enable( gl.DEPTH_TEST );
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
     //update the model-view matrix
    var mvpMat = mat4.create();
    mat4.multiply( mvpMat, camera.getProjectionMat(), camera.getViewTransform() );
    gl.uniformMatrix4fv( program.uModelViewLoc, false, camera.getViewTransform());
    gl.uniformMatrix4fv( program.uMVPLoc, false, mvpMat ); 

    drawModel( program );
    framebuffer.unbind(gl);
    gl.useProgram( null );
};

var deferredRenderSpotLight = function( light, textureUnit ) {

    // var lightPersp = light.getProjectionMat();
    var mlpMat = mat4.create();
    mat4.multiply( mlpMat, light.getProjectionMat(), light.getViewTransform() );
    gl.uniformMatrix4fv( deferredRenderProg.uMLPLoc, false, mlpMat);
    gl.uniform3fv( deferredRenderProg.uLPosLoc, light.getPosition());
    gl.uniform1f( deferredRenderProg.uShadowMapResLoc, light.cascadeFramebuffers[0].getWidth() );
    // var invModelView = camera.getViewTransform();
    // mat4.invert( invModelView, invModelView );
    // mat4.multiply( mlpMat, mlpMat, camera.matrix ); // put light in camera space

    gl.activeTexture( gl.TEXTURE0 + textureUnit );
    gl.bindTexture( gl.TEXTURE_2D, light.cascadeFramebuffers[0].depthTexture() );
    gl.uniform1i( deferredRenderProg.uShadowMapLoc, textureUnit )
    

    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );
};


var bindGBufferTextures = function( program, gBuffer ) {

    gl.activeTexture( gl.TEXTURE0);  //position
    gl.bindTexture( gl.TEXTURE_2D, gBuffer.texture(0) );
    gl.uniform1i( program.uPosSamplerLoc, 0 );
    
    gl.activeTexture( gl.TEXTURE1);  //normal
    gl.bindTexture( gl.TEXTURE_2D, gBuffer.texture(1) );
    gl.uniform1i( program.uNormalSamplerLoc, 1 );
    
    gl.activeTexture( gl.TEXTURE2);  //Color
    gl.bindTexture( gl.TEXTURE_2D, gBuffer.texture(2) );
    gl.uniform1i( program.uColorSamplerLoc, 2 );
    
    gl.activeTexture( gl.TEXTURE3);  //depth
    gl.bindTexture( gl.TEXTURE_2D, gBuffer.texture(3) );
    gl.uniform1i( program.uDepthSamplerLoc, 3 );

};

var deferredRender = function(scene, gBuffer, framebuffer) {

    
    gl.useProgram( deferredRenderProg.ref() );

    // gl.uniform1i( deferredRenderProg.uDisplayTypeLoc, demo.texToDisplay );
    gl.uniform1f( deferredRenderProg.uZNearLoc, demo.zNear );
    gl.uniform1f( deferredRenderProg.uZFarLoc, demo.zFar );

    gl.uniform3fv( deferredRenderProg.uCPosLoc, scene.getCamera().getPosition() );
    bindGBufferTextures( deferredRenderProg, gBuffer );
    bindQuadBuffers(deferredRenderProg, scene.getCamera().getEyeRays());

    lightFBO.bind(gl);
    gl.viewport( 0, 0, lightFBO.getWidth(), lightFBO.getHeight() );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    gl.disable( gl.DEPTH_TEST );
    gl.enable( gl.BLEND );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE );

    for( var i = 0; i < scene.getNumLights(); i++ ){

        deferredRenderSpotLight( scene.getLight(i), 4 );
    }
    gl.disable( gl.BLEND );
  

    blendAdditive(gBuffer.texture(2), demo.AMBIENT_INTENSITY,
                  lightFBO.texture(0), 1.0, 
                  framebuffer );

    // debugFBO.bind(gl);
    // gl.viewport( 0, 0, debugFBO.getWidth(), debugFBO.getHeight() );
    // gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    // gl.disable( gl.BLEND );


    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );


};

/*
 * Renders the geometry and output color, normal, depth information
 */
var forwardRenderPass = function(scene, index){

    // blurPasses(shadowFBO.texture(0), shadowFBO, demo.blurSigma);
    //Now render from the camera

    gl.bindTexture( gl.TEXTURE_2D, null );
    fbo.bind(gl);
    gl.viewport(0, 0, SEC3.canvas.width, SEC3.canvas.height );
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    gl.enable( gl.DEPTH_TEST );

    gl.useProgram( renderWithCascadesProg.ref() );
    var textureUnit = 0;

    //update the model-view matrix
    var mvpMat = mat4.create();
    mat4.multiply( mvpMat, camera.getProjectionMat(), camera.getViewTransform() );
    gl.uniform3fv( renderWithCascadesProg.uCPosLoc, camera.getPosition());
    gl.uniformMatrix4fv( renderWithCascadesProg.uMVPLoc, false, mvpMat ); 

    //--------------------UPDATE LIGHT UNIFORMS:

    //for selected light
    var thisLight = scene.getLight(demo.selectedLight);
    gl.uniform1i( renderWithCascadesProg.uNumCascades, thisLight.numCascades);

    for( var i = 0; i < scene.getNumLights(); i++ ) { // for each light
        var light = scene.getLight(i);
        var lightLoc = renderWithCascadesProg.lights[i];
        var lightPersp = light.getProjectionMat();
        var mlpMat = mat4.create();
        mat4.multiply( mlpMat, lightPersp, light.getViewTransform() );
        gl.uniform3fv( lightLoc.uLPosLoc, light.getPosition());
        gl.uniformMatrix4fv( lightLoc.uModelLightLoc, false, light.getViewTransform());      
        gl.uniformMatrix4fv( lightLoc.uMLPLoc, false, mlpMat);

        for(var j = 0; j < light.numCascades; j++ ){ // for each cascade
            gl.activeTexture( gl.TEXTURE0 + textureUnit);
            gl.bindTexture( gl.TEXTURE_2D, light.cascadeFramebuffers[j].depthTexture());
            gl.uniform1i( lightLoc.uCascadeLocs[j], textureUnit);
            textureUnit++;
        }
    }

    drawModel(renderWithCascadesProg, textureUnit);
    fbo.unbind(gl);
}; 

/* 
 * Does post-processing effect using the data obtained in part 1 
 */
var bufferRender = function(framebuffer) {

    framebuffer.bind(gl);

    gl.viewport(0, 0, framebuffer.getWidth(), framebuffer.getHeight() )
    gl.useProgram( bufferRenderProg.ref() );
    gl.disable( gl.DEPTH_TEST );

    gl.uniform1i( bufferRenderProg.uDisplayTypeLoc, demo.texToDisplay );

    gl.activeTexture( gl.TEXTURE0 );  //position
    gl.bindTexture( gl.TEXTURE_2D, fbo.texture(0) );
    gl.uniform1i( bufferRenderProg.uPosSamplerLoc, 0 );

    gl.activeTexture( gl.TEXTURE1 );  //normal
    gl.bindTexture( gl.TEXTURE_2D, fbo.texture(1) );
    gl.uniform1i( bufferRenderProg.uNormalSamplerLoc, 1 );

    gl.activeTexture( gl.TEXTURE2 );  //Color
    gl.bindTexture( gl.TEXTURE_2D, fbo.texture(2) );
    gl.uniform1i( bufferRenderProg.uColorSamplerLoc, 2 );

    gl.activeTexture( gl.TEXTURE3 );  //depth
    gl.bindTexture( gl.TEXTURE_2D, fbo.depthTexture() );
    gl.uniform1i( bufferRenderProg.uDepthSamplerLoc, 3 );

    bindQuadBuffers(bufferRenderProg);

    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );

    framebuffer.unbind(gl);
};

var blendAdditive = function( texture1, weight1, texture2, weight2, destBuffer ) {

    destBuffer.bind(gl);
    gl.viewport( 0, 0, destBuffer.getWidth(), destBuffer.getHeight() );
    gl.disable( gl.DEPTH_TEST );
    gl.disable( gl.BLEND );
    gl.useProgram( blendAdditiveProg.ref() );
    gl.uniform1f( blendAdditiveProg.uWeight1Loc, weight1 );
    gl.uniform1f( blendAdditiveProg.uWeight2Loc, weight2 );    

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture1);
    gl.uniform1i( blendAdditiveProg.uTexture1Loc, 0);

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( gl.TEXTURE_2D, texture2);
    gl.uniform1i( blendAdditiveProg.uTexture2Loc, 1);
    
    bindQuadBuffers( blendAdditiveProg );
    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );
    destBuffer.unbind(gl);
    gl.useProgram( null );
};

/*
 * Two passes, one to blur vertically and one to blur horizontally
 */
var blurPasses = function(srcTex, framebuffer, sigma) {
    var vertical = 1;
    var horizontal = 0;

    framebuffer.bind(gl);

    gl.viewport( 0, 0, framebuffer.getWidth(), framebuffer.getHeight());

    gl.useProgram( blurProg.ref() );
    gl.uniform1f( blurProg.uLilSigLoc, sigma * sigma);
    
    gl.uniform2fv(blurProg.uPixDimLoc, vec2.fromValues(1.0 / framebuffer.getWidth(), 1.0 / framebuffer.getHeight()));

    gl.disable( gl.DEPTH_TEST );
    
     // first, texToDisplay texture is source
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture( gl.TEXTURE_2D, srcTex );
    gl.uniform1i( blurProg.uSourceLoc, 0 );
    // workingFBO slot 0 will be written to with the vertical blur
    // making a vertical smear (1 = Vertical Pass)
    gl.uniform1i( blurProg.uBlurDirectionLoc, vertical );
    // and draw!

    bindQuadBuffers(blurProg);

    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );
    
    // then, vertically blured texture is source (old dest)
    
    framebuffer.swapBuffers(0, 1, gl);

    framebuffer.bind(gl);

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, framebuffer.texture(1) );
    gl.uniform1i( blurProg.uSourceLoc, 0);

    gl.uniform1i( blurProg.uBlurDirectionLoc, horizontal );

    bindQuadBuffers(blurProg);
    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );
    // framebuffer.swapBuffers(0, 1, gl);
    
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    gl.bindBuffer( gl.ARRAY_BUFFER, null ); 
    
    framebuffer.unbind(gl);
   
};

var dofPass = function(){
   
    gl.useProgram( dofDownsampleProg.ref() );
    lowResFBO.bind(gl);
    gl.viewport( 0, 0, lowResFBO.getWidth(), lowResFBO.getHeight() );
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable( gl.DEPTH_TEST );
    gl.disable( gl.BLEND);
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, fbo.texture( demo.texToDisplay) );
    gl.uniform1i( dofDownsampleProg.uSourceLoc, 0);

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( gl.TEXTURE_2D, fbo.depthTexture() );
    gl.uniform1i( dofDownsampleProg.uDepthLoc, 1);

    gl.uniform2fv( dofDownsampleProg.uPixDimLoc, vec2.fromValues(1.0 / SEC3.canvas.width, 1.0 / SEC3.canvas.height) );
   
    bindQuadBuffers(dofDownsampleProg);

    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer( gl.ARRAY_BUFFER, null );
    // lowResFBO[0],[1]  both have downsampled color and coc

    lowResFBO.swapBuffers(0, 2, gl );
    lowResFBO.swapBuffers( 1, 3, gl );

    blurPasses(lowResFBO.texture(3), lowResFBO, demo.LARGE_BLUR); 
    lowResFBO.swapBuffers(0, 3, gl);
    // lowResFBO[3] now has large blurred downsampled color and coc
        
    //----------------------------------- Calculate Final Coc: 


    gl.useProgram( dofCalcCocProg.ref() );
    lowResFBO.bind(gl);
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture(gl.TEXTURE_2D, lowResFBO.texture(3));
    gl.uniform1i( dofCalcCocProg.uBlurredForegroundLoc, 0);

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( gl.TEXTURE_2D, lowResFBO.texture(2));
    gl.uniform1i( dofCalcCocProg.uDownsampledLoc, 1);

    
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, lowResFBO.getWidth(), lowResFBO.getHeight());
    bindQuadBuffers( dofCalcCocProg );

    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer( gl.ARRAY_BUFFER, null );
    // lowResFBO[0] now has downsampled color and proper coc

    //----------------------------------

    // lowResFBO.swapBuffers(1, 3, gl);
     lowResFBO.swapBuffers(0, 2, gl);
    // lowResFBO[2] has proper coc
    // lowResFBO[3] has blurred downsampled foreground

     blurPasses(lowResFBO.texture(2), lowResFBO, demo.MEDIUM_BLUR);
    // lowResFBO[0] has small blur on final near coc 

    blurPasses(fbo.texture( demo.texToDisplay), workingFBO, demo.SMALL_BLUR);
    workingFBO.swapBuffers(0, 1, gl);
    

    //-------------------------- 

    gl.useProgram( dofCompProg.ref() );

    workingFBO.bind(gl);
    gl.viewport( 0, 0, workingFBO.getWidth(), workingFBO.getHeight() );

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, lowResFBO.texture(3) );
    gl.uniform1i( dofCompProg.uBlurredForegroundLoc, 0 );

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( gl.TEXTURE_2D, lowResFBO.texture(0) );
    gl.uniform1i( dofCompProg.uDownsampledLoc, 1 );

    gl.activeTexture( gl.TEXTURE2 );
    gl.bindTexture( gl.TEXTURE_2D, workingFBO.texture(1) );
    gl.uniform1i( dofCompProg.uSmallBlurLoc, 2);

    gl.activeTexture( gl.TEXTURE3 );
    gl.bindTexture( gl.TEXTURE_2D, fbo.texture( demo.texToDisplay) );
    gl.uniform1i( dofCompProg.uUnalteredImageLoc, 3 );

    gl.activeTexture( gl.TEXTURE4 );
    gl.bindTexture( gl.TEXTURE_2D, fbo.depthTexture());
    gl.uniform1i( dofCompProg.uDepthLoc, 4 );

    gl.uniform2fv( dofCompProg.uFarEqLoc, vec2.fromValues( demo.farSlope, demo.farIntercept));
    gl.uniform1f( dofCompProg.uZNearLoc, demo.zNear);
    gl.uniform1f( dofCompProg.uZFarLoc, demo.zFar);

    bindQuadBuffers( dofCompProg );
    gl.disable(gl.DEPTH_TEST);
    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer( gl.ARRAY_BUFFER, null );
    workingFBO.unbind(gl);
    gl.disable(gl.BLEND);
};

var downsamplePass = function(hiResTex, writeSlot){

    gl.useProgram( downsampleProg.ref() );
    workingFBO.bind(gl);

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, hiResTex );
    gl.uniform1i( downsampleProg.uSourceLoc, 0 );

    gl.uniform1i( downsampleProg.uWriteSlotLoc, writeSlot);

    gl.disable( gl.DEPTH_TEST );
    bindQuadBuffers(downsampleProg);

    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );

};

var finalPass = function(texture, framebuffer){


    gl.bindFramebuffer(gl.FRAMEBUFFER, null); 
    gl.useProgram(finalfillGProg.ref());
    
    if(framebuffer) {
        gl.viewport( 0, 0, framebuffer.getWidth(), framebuffer.getHeight());
    }
    else {
        gl.viewport( 0, 0, SEC3.canvas.width, SEC3.canvas.height );
    }
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(finalfillGProg.uFinalImageLoc, 0);

    gl.disable( gl.DEPTH_TEST );
    bindQuadBuffers(finalfillGProg);

    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );


    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );
};

var moveLight = function(light) {
    elCounter++;
    if(elCounter % 200 == 1.0) particleSystem.restart();
    if(elCounter % 500 < 250) {
        // light.changeAzimuth(0.14);
        light.changeElevation(0.05);
        light.moveRight(0.01);        
        // light.changeElevation(1.5);        
        // light.moveUp(0.02);
    }
    else {
        // light.changeAzimuth(-0.14);
        light.changeElevation(-0.05);
        light.moveLeft(0.01);
        // light.changeElevation(1.5);                
        // light.moveDown(0.02);
    }
    light.update();
};

var myRender = function() {
    if(SEC3.isWaiting) {
        return;
    }
    var light = scene.getLight( demo.selectedLight );

    moveLight(light);
    var canvasResolution = [SEC3.canvas.width, SEC3.canvas.height];

    updateShadowMaps(scene);
    particleSystem.update();
    // forwardRenderPass(scene, demo.selectedLight );
    fillGPass( fillGProg, SEC3.gBuffer );
    deferredRender( scene, SEC3.gBuffer, workingFBO );

    if ( demo.secondPass === bufferRenderProg) {
        finalPass(workingFBO.texture(demo.texToDisplay));
    }
    else if ( demo.secondPass === blurProg) {
        blurPasses(fbo.texture( demo.texToDisplay),workingFBO, demo.blurSigma);
        finalPass(workingFBO.texture(0));
    }
    else if ( demo.secondPass === dofProg) {
        dofPass();
        finalPass(workingFBO.texture(0));
    }
    else if ( demo.secondPass === buildShadowMapProg) {
        finalPass(light.cascadeFramebuffers[demo.cascadeToDisplay].texture(0));
    }
};

// Customized looping function
var myRenderLoop = function() {

    if(!SEC3.setup) {
        
        initLightUi();
        initBlurButtons();
        initDofButtons();
        demo.secondPass = bufferRenderProg;
        
        SEC3.setup = true;
    }

    window.requestAnimationFrame( myRenderLoop );
    myRender();
    particleSystem.draw();
};

var main = function( canvasId, messageId ){
    "use strict"

    setupScene(canvasId, messageId);

    setKeyInputs();
        //'1' = Attachment 1: vertex position
        //'2' = Attachment 2: vertex normal
        //'3' = Attachment 3: vertex color
        //'4' = Attachment 4: vertex depth 

    createShaders();

    //Attach our custom rendering functions
    SEC3.render = myRender;
    SEC3.renderLoop = myRenderLoop;

    //Start rendering loop (when all resources are finished loading asynchronously)
    SEC3.run(gl);
    
};

//-----------------------------------------------------------STANDARD SETUP METHODS:


/*
 * Loads objects from obj files into the model_VBOs
 */
var loadObjects = function() {
    //Load a OBJ model from file
    var objLoader = SEC3.createOBJLoader(scene);
    // objLoader.loadFromFile( gl, 'models/coke/coke.obj', 'models/coke/coke.mtl');
    // objLoader.loadFromFile( gl, 'Sec3Engine/models/buddha_new/buddha_scaled_.obj', 'Sec3Engine/models/buddha_new/buddha_scaled_.mtl');
    objLoader.loadFromFile( gl, 'Sec3Engine/models/dabrovic-sponza/sponza.obj', 'Sec3Engine/models/dabrovic-sponza/sponza.mtl');
    // objLoader.loadFromFile( gl, 'Sec3Engine/models/cubeworld/cubeworld.obj', 'Sec3Engine/models/cubeworld/cubeworld.mtl');
    
       
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
    SEC3.registerAsyncObj( gl, objLoader );    
};

var setKeyInputs = function() {
    
    window.onkeydown = function(ev) {

        interactor.onKeyDown(ev);
        switch( ev.keyCode ){
          case 49: demo.texToDisplay = 0; break;     //show position texture
          case 50: demo.texToDisplay = 1; break;     //show normal texture
          case 51: demo.texToDisplay = 2; break;     //show texture texture
          case 52: demo.texToDisplay = 3; break;     //show depth texture

          case 53: demo.secondPass = blurProg; break;
          case 54: demo.secondPass = bufferRenderProg; break;
          case 55: demo.secondPass = dofProg; break;
          case 56: 
            demo.secondPass = buildShadowMapProg; 
            demo.cascadeToDisplay = Math.floor(( demo.cascadeToDisplay + 1 ) % (scene.getLight(demo.selectedLight).numCascades));
            break;

        }
    };
};

var initLightUi = function() {

    SEC3.ui = SEC3.ui || new UI("uiWrapper");


    var numCascadesCallback = function(e) {

        var newSliderVal = e.target.value;

        var light = scene.getLight(demo.selectedLight);
        light.setupCascades(newSliderVal, light.nearResolution, gl, scene);

        buildShadowMapProg.dispose(gl);
        buildShadowMapProg = SEC3.ShaderCreator.buildShadowMapPrograms(gl, scene);
        renderWithCascadesProg.dispose(gl);
        renderWithCascadesProg = SEC3.ShaderCreator.renderCascShadowProg(gl, scene);
        SEC3.run(gl);
        return newSliderVal + " :Cascades";
    };

    SEC3.ui.addSlider( scene.getLight(demo.selectedLight).numCascades + " :Cascades" ,
                 numCascadesCallback,
                 scene.getLight(demo.selectedLight).numCascades,
                 1, demo.MAX_CASCADES,
                 1);

    var numLightsCallback = function(e) {

        var newSliderVal = e.target.value;

        updateLightCount(newSliderVal);
       

        return newSliderVal + " :Lights";
    };

    SEC3.ui.addSlider( scene.getNumLights() + " :Lights" ,
                 numLightsCallback,
                 scene.getNumLights(),
                 1, demo.MAX_LIGHTS,
                 1);

    var selectedLightCallback = function(e) {

        var newSliderVal = e.target.value;

        demo.selectedLight = Math.min( newSliderVal, scene.getNumLights() - 1 );
        
        return ( demo.selectedLight + 1 ) + " :Selected light";
    };

    SEC3.ui.addSlider( (demo.selectedLight + 1) + " :Selected light" ,
                 selectedLightCallback,
                 demo.selectedLight,
                 0, demo.MAX_LIGHTS - 1,
                 1);
};

function initBlurButtons() {
    
    SEC3.ui = SEC3.ui || new UI("uiWrapper");

    var lilSigCallback = function(e) {

        var newSliderVal = e.target.value;
        demo.blurSigma = newSliderVal;
        var sigmaSquared = demo.blurSigma * demo.blurSigma;
        gl.useProgram(blurProg.ref());
        gl.uniform1f(blurProg.uLilSigLoc, sigmaSquared);

        return "Sigma: " + demo.blurSigma;
    };

    SEC3.ui.addSlider("Sigma: " + demo.blurSigma,
                 lilSigCallback,
                 demo.blurSigma * demo.blurSigma,
                 0.1, 40.0,
                 0.1);
};

var updateLightCount = function( newCount ) {

    var difference = newCount - scene.getNumLights();
    if( difference < 0 ) {
        while (difference < 0) {
            scene.popLight(gl);
            difference++;
        }
    }
    else if( difference > 0 ) {
        while ( difference > 0 ) {
            addLight();
            difference--;
        }
    }
    demo.selectedLight =  newCount - 1;
    // buildShadowMapProg.dispose(gl);
    // buildShadowMapProg = SEC3.ShaderCreator.buildShadowMapPrograms(gl, scene);
    // renderWithCascadesProg.dispose(gl);
    // renderWithCascadesProg = SEC3.ShaderCreator.renderCascShadowProg(gl, scene);
    // SEC3.run(gl);
}

/*
 * Creates a light at a random position within camera's view frustum
 */
var addLight = function() {

    var viewBounds = scene.getCamera().getFrustumBounds();
    var xPos = SEC3.math.randomRange(-10, 10);
    var yPos = SEC3.math.randomRange(4, 15);
    var zPos = SEC3.math.randomRange(-1, 1);
    // var xPos = SEC3.math.randomRange(viewBounds[0], viewBounds[3]);
    // var yPos = SEC3.math.randomRange(0, viewBounds[4]);
    // var zPos = SEC3.math.randomRange(viewBounds[2], viewBounds[5]);
    var azimuth = Math.random() * 360;
    var elevation = Math.random() * -90;

    var nextLight = new SEC3.SpotLight();
    nextLight.goHome ( [xPos, yPos, zPos] ); 
    nextLight.setAzimuth(azimuth );    
    nextLight.setElevation( elevation );
    nextLight.setPerspective(25, 1.0, demo.zNear, demo.zFar);
    nextLight.setupCascades( 1, 256, gl, scene );
    scene.addLight(nextLight);


}


/*
 * Sets up basics of scene; camera, viewport, projection matrix, fbo
 */
var setupScene = function(canvasId, messageId ) {
    var canvas;
    var msg;
    //----SETUP scene
    //get WebGL context
    canvas = document.getElementById( canvasId );
    SEC3.canvas = canvas;
    msg = document.getElementById( messageId );
    gl = SEC3.getWebGLContext( canvas, msg );
    if (! gl) {
        console.log("Bad GL Context!");
        return;
    }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    // gl.clearColor( 0.3, 0.3, 0.3, 1.0 );
    gl.clearColor( 0.0, 0.0, 0.0, 0.5);

    gl.enable( gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    scene = new SEC3.Scene();

    //Setup camera
    view = mat4.create();
    camera = new SEC3.Camera();
    camera.goHome( [-5.0, 7.0, 1.5] ); //initial camera posiiton
    camera.setAzimuth( 75.0 );
    camera.setElevation( 0.0 );
    interactor = SEC3.CameraInteractor( camera, canvas );
    camera.setPerspective( 60, canvas.width / canvas.height, demo.zNear, demo.zFar );

    scene.setCamera(camera);

    var nextLight = new SEC3.SpotLight();
    nextLight.goHome ( [ 0, 15, 0] ); 
    nextLight.setAzimuth( 90.0 );    
    nextLight.setElevation( -40.0 );
    nextLight.setPerspective( 30, 1, demo.zNear, demo.zFar );
    nextLight.setupCascades( 1, 1024, gl, scene );
    scene.addLight(nextLight);
    demo.cascadeToDisplay = 0.0;
    lightAngle = 0.0;
    elCounter = 125;

    loadObjects();

    var particleSpecs = {
        maxParticles : 1000000,
        emitters : [],
        gravityModifier : -3000.0,
        RGBA : [0.0, 0.2, 0.9, 0.1001],
        damping : 1.060,
        type : "nBody",
        activeBodies : 2,
        particleSize : 1.6,
        luminence : 150.0,
        scatterMultiply : 0.6,
        shadowMultiply : 0.1,
        scale : 14.0
        //TODO phi and theta?
    };
    particleSystem = SEC3.createParticleSystem(particleSpecs);

    //Create a FBO

    SEC3.gBuffer = SEC3.createFBO();
    if (! SEC3.gBuffer.initialize( gl, canvas.width, canvas.height )) {
        console.log( "FBO initialization failed.");
        return;
    }

    fbo = SEC3.createFBO();
    if (! fbo.initialize( gl, canvas.width, canvas.height )) {
        console.log( "FBO initialization failed.");
        return;
    }

    lowResFBO = SEC3.createFBO();
    if (! lowResFBO.initialize( gl, 512.0, 512.0 )) {
        console.log( "display FBO initialization failed.");
        return;
    }


    workingFBO = SEC3.createFBO();
    if (! workingFBO.initialize( gl, canvas.width, canvas.height )) {
        console.log( "workingFBO initialization failed.");
        return;
    }

    shadowFBO = SEC3.createFBO();
    if (! shadowFBO.initialize( gl, demo.SHADOWMAP_SIZE, demo.SHADOWMAP_SIZE, 2 )) {
        console.log( "shadowFBO initialization failed.");
        return;
    }

    debugFBO = SEC3.createFBO(); //TODO hide this stuff
    if (! debugFBO.initialize( gl, canvas.width, canvas.height, 4 )) {
        console.log( "debugFBO initialization failed.");
        return;
    }

    lightFBO = SEC3.createFBO(); //TODO hide this stuff
    if (! lightFBO.initialize( gl, canvas.width, canvas.height, 4 )) {
        console.log( "lightFBO initialization failed.");
        return;
    }

};

//--------------------------------------------------------------------------HELPERS:

var bindQuadBuffers = function(program, farPlaneVerts) {

    SEC3.renderer.bindQuadBuffers(program, farPlaneVerts);
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
