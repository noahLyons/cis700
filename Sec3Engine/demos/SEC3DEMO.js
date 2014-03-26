

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

var passProg;           //shader program passing data to FBO
var renderQuadProg;     //shader program showing the FBO buffers
var blurProg;
var downsampleProg;
var dofProg;
var showShadowMap;

var fbo;    //Framebuffer object storing data for postprocessing effects
var lowResFBO; //Framebuffer object for storing unprocessed image
var workingFBO;

var demo = (function () {

    var demo = [];
    demo.zFar = 30.1;
    demo.zNear = 0.4;
    demo.selectedLight = 0;
    demo.MAX_LIGHTS = 8;
    demo.MAX_CASCADES = 6;

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
    passProg = SEC3.createShaderProgram();
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
        passProg.uShadowMapLoc = gl.getUniformLocation( passProg.ref(), "u_shadowMap");
        passProg.uSamplerLoc = gl.getUniformLocation( passProg.ref(), "u_sampler");
        passProg.uMLPLoc = gl.getUniformLocation( passProg.ref(), "u_mlp");
        passProg.uModelLightLoc = gl.getUniformLocation( passProg.ref(), "u_modelLight");
    } );

    //Register the asynchronously-requested resources with the engine core
    //asynchronously-requested resources are loaded using AJAX 
    SEC3.registerAsyncObj( gl, passProg );

    //----------------------------------------------------SECOND PASS:
    //Create a shader program for displaying FBO contents
    renderQuadProg = SEC3.createShaderProgram();
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

        gl.useProgram( renderQuadProg.ref() );
        gl.uniform1f( renderQuadProg.uZNearLoc, demo.zNear );
        gl.uniform1f( renderQuadProg.uZFarLoc, demo.zFar );

    } );
    SEC3.registerAsyncObj( gl, renderQuadProg );

    //---------------------------------------------------FINAL PASS:

    finalPassProg = SEC3.createShaderProgram();
    finalPassProg.loadShader( gl, 
                               "/../shader/finalPass.vert", 
                               "/../shader/finalPass.frag" );

    finalPassProg.addCallback( function(){
        //query the locations of shader parameters
        finalPassProg.aVertexPosLoc = gl.getAttribLocation( finalPassProg.ref(), "a_pos" );
        finalPassProg.aVertexTexcoordLoc = gl.getAttribLocation( finalPassProg.ref(), "a_texcoord" );
        
        finalPassProg.uFinalImageLoc = gl.getUniformLocation( finalPassProg.ref(), "u_colorTex");

    } );
    SEC3.registerAsyncObj( gl, finalPassProg );

    //----------------------------------------------------BLUR PASS:
    //Create a shader program for displaying FBO contents
    blurProg = SEC3.createShaderProgram();
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
                         "/../shader/finalPass.vert", 
                         "/../shader/downSample.frag" );

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
                         "/../shader/finalPass.vert", 
                         "/../shader/dofDownSample.frag" );

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
                            "/../shader/finalPass.vert",
                            "/../shader/dofComp.frag");

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
                               "/../shader/finalPass.vert",
                               "/../shader/dofCalcCoc.frag");

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

var updateShadowMaps = function(light){

    for( var ii = 0; ii < light.numCascades; ii++ ) {
        drawShadowMap(light, ii);
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
    var pMat = light.cascadeMatrices[index];
    var resolution = shadowFbo.getWidth();

    gl.bindTexture( gl.TEXTURE_2D, null );
    shadowFbo.bind(gl);
   
    gl.viewport(0, 0, resolution, resolution );
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT );
    // gl.colorMask(false,false,false,false);
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

    // gl.colorMask(true,true,true,true);

    shadowFbo.unbind(gl);
    // gl.cullFace(gl.BACK);
};

var drawModel = function(scene, index){
    

    if(index === undefined ){
        index = 0;
    }

    //update the model-view matrix
    var mvpMat = mat4.create();
    mat4.multiply( mvpMat, camera.getProjectionMat(), camera.getViewTransform() );
    gl.uniform3fv( renderWithCascadesProg.uCPosLoc, camera.getPosition());
    gl.uniformMatrix4fv( renderWithCascadesProg.uMVPLoc, false, mvpMat ); 


    //update the normal matrix
    var nmlMat = mat4.create();
    mat4.invert( nmlMat, camera.getViewTransform() );
    mat4.transpose( nmlMat, nmlMat);


    var textureUnit = 0;
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

    //------------------DRAW MODEL:
    
    for ( var i = 0; i < model_vertexVBOs.length; ++i ){
        //Bind vertex pos buffer
        gl.bindBuffer( gl.ARRAY_BUFFER, model_vertexVBOs[i] );
        gl.vertexAttribPointer( renderWithCascadesProg.aVertexPosLoc, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( renderWithCascadesProg.aVertexPosLoc );

        //Bind vertex normal buffer
        gl.bindBuffer( gl.ARRAY_BUFFER, model_normalVBOs[i] );
        gl.vertexAttribPointer( renderWithCascadesProg.aVertexNormalLoc, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( renderWithCascadesProg.aVertexNormalLoc );

        //Bind vertex texcoord buffer
        gl.bindBuffer( gl.ARRAY_BUFFER, model_texcoordVBOs[i] );
        gl.vertexAttribPointer( renderWithCascadesProg.aVertexTexcoordLoc, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( renderWithCascadesProg.aVertexTexcoordLoc );
        
        if ( model_texcoordVBOs[i].texture ) {
            //Bind texture    
            gl.activeTexture( gl.TEXTURE0 + textureUnit );
            gl.bindTexture( gl.TEXTURE_2D, model_texcoordVBOs[i].texture );
            gl.uniform1i( renderWithCascadesProg.uSamplerLoc, textureUnit );
        }
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, model_indexVBOs[i] );
        gl.drawElements( gl.TRIANGLES, model_indexVBOs[i].numIndex, gl.UNSIGNED_SHORT, 0 );
    }


    gl.bindBuffer( gl.ARRAY_BUFFER, null );
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );    
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


/*
 * Renders the geometry and output color, normal, depth information
 */
var deferredRenderPass1 = function(scene, index){

    index = index || 0;
    //Render the scene into the shadowMap from the light view
    // drawShadowMap(light, index);
    for(var i = 0; i < scene.getNumLights(); i++ ) {
        
        updateShadowMaps(scene.getLight(i));
        
    }
    // blurPasses(shadowFBO.texture(0), shadowFBO, demo.blurSigma);
    //Now render from the camera


    gl.bindTexture( gl.TEXTURE_2D, null );
    fbo.bind(gl);
    gl.viewport(0, 0, SEC3.canvas.width, SEC3.canvas.height );
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    gl.enable( gl.DEPTH_TEST );

    gl.useProgram( renderWithCascadesProg.ref() );

    drawModel(scene, index);
    fbo.unbind(gl);

}; 

/* 
 * Does post-processing effect using the data obtained in part 1 
 */
var deferredRenderPass2 = function(framebuffer) {

    framebuffer.bind(gl);

    gl.viewport(0, 0, framebuffer.getWidth(), framebuffer.getHeight() )
    gl.useProgram( renderQuadProg.ref() );
    gl.disable( gl.DEPTH_TEST );

    gl.uniform1i( renderQuadProg.uDisplayTypeLoc, demo.texToDisplay );

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
    gl.bindTexture( gl.TEXTURE_2D, fbo.texture(3) );
    gl.uniform1i( renderQuadProg.uDepthSamplerLoc, 3 );

    bindQuadBuffers(renderQuadProg);

    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );

    framebuffer.unbind(gl);
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
    gl.useProgram(finalPassProg.ref());
    
    if(framebuffer) {
        gl.viewport( 0, 0, framebuffer.getWidth(), framebuffer.getHeight());
    }
    else {
        gl.viewport( 0, 0, SEC3.canvas.width, SEC3.canvas.height );
    }
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(finalPassProg.uFinalImageLoc, 0);

    gl.disable( gl.DEPTH_TEST );
    bindQuadBuffers(finalPassProg);

    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );


    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );
};

var moveLight = function(light) {
    elCounter++;
    if(elCounter % 500 < 250) {
        // light.changeAzimuth(0.14);
        light.changeElevation(0.125);
        // light.changeElevation(1.5);        
        // light.moveUp(0.02);
    }
    else {
        // light.changeAzimuth(-0.14);
        light.changeElevation(-0.125);
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

    deferredRenderPass1(scene, demo.selectedLight );

    if ( demo.secondPass === renderQuadProg) {
        deferredRenderPass2(workingFBO);
        finalPass(workingFBO.texture(0));
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
        demo.secondPass = renderQuadProg;
        
        SEC3.setup = true;
    }

    window.requestAnimationFrame( myRenderLoop );
    myRender();
};

var main = function( canvasId, messageId ){
    "use strict"

    setupScene(canvasId, messageId);

    setKeyInputs();
        //'1' = Attachment 1: vertex position
        //'2' = Attachment 2: vertex normal
        //'3' = Attachment 3: vertex color
        //'4' = Attachment 4: vertex depth 

    createScreenSizedQuad();

    createShaders();

    //Attach our custom rendering functions
    SEC3.render = myRender;
    SEC3.renderLoop = myRenderLoop;

    //Start rendering loop (when all resources are finished loading asynchronously)
    SEC3.run(gl);
    
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
    var objLoader = SEC3.createOBJLoader(scene);
    // objLoader.loadFromFile( gl, 'models/coke/coke.obj', 'models/coke/coke.mtl');
    // objLoader.loadFromFile( gl, '/../models/buddha_new/buddha_scaled_.obj', '/../models/buddha_new/buddha_scaled_.mtl');
    // objLoader.loadFromFile( gl, '/../models/dabrovic-sponza/sponza3.obj', '/../models/dabrovic-sponza/sponza.mtl');
    objLoader.loadFromFile( gl, '/../models/cubeworld/cubeworld.obj', '/../models/cubeworld/cubeworld.mtl');
    
       
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
          case 54: demo.secondPass = renderQuadProg; break;
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
    buildShadowMapProg.dispose(gl);
    buildShadowMapProg = SEC3.ShaderCreator.buildShadowMapPrograms(gl, scene);
    renderWithCascadesProg.dispose(gl);
    renderWithCascadesProg = SEC3.ShaderCreator.renderCascShadowProg(gl, scene);
    SEC3.run(gl);
}

/*
 * Creates a light at a random position within camera's view frustum
 */
var addLight = function() {

    var viewBounds = scene.getCamera().getFrustumBounds();
    var xPos = SEC3.math.randomRange(-15, 15);
    var yPos = SEC3.math.randomRange(0, 15);
    var zPos = SEC3.math.randomRange(-15, 15);
    // var xPos = SEC3.math.randomRange(viewBounds[0], viewBounds[3]);
    // var yPos = SEC3.math.randomRange(0, viewBounds[4]);
    // var zPos = SEC3.math.randomRange(viewBounds[2], viewBounds[5]);
    var azimuth = Math.random() * 360;
    var elevation = Math.random() * -180;

    var nextLight = new SEC3.SpotLight();
    nextLight.goHome ( [xPos, yPos, zPos] ); 
    nextLight.setAzimuth(azimuth );    
    nextLight.setElevation( elevation );
    nextLight.setPerspective(25, 1.0, demo.zNear, demo.zFar);
    nextLight.setupCascades( 1, 512, gl, scene );
    scene.addLight(nextLight);


}

var setupLights = function() {

    scene.clearLights();
    var radius = 0.5 * scene.getBoundingRadius();
    radius = radius || 20.0;

    for(var i = 1; i < scene.getNumLights(); i++ ) {
        var xPos = ((Math.random() - 0.5 ) * 2.0) * 8.0;
        var yPos = Math.random() * 10.0 + 8;
        var zPos = ((Math.random() - 0.5 ) * 2.0) * 2.0;
        var azimuth = Math.random() * 360;

        var nextLight = new SEC3.SpotLight();
        nextLight.goHome ( [xPos, yPos, zPos] ); 
        nextLight.setAzimuth(azimuth );    
        nextLight.setElevation( -70.0 );
        nextLight.setPerspective(25, 1.0, demo.zNear, demo.zFar);
        nextLight.setupCascades( 1, 512, gl );
        scene.addLight(nextLight);

    }
  
    demo.cascadeToDisplay = 0.0;
    lightAngle = 0.0;
    elCounter = 125;

    buildShadowMapProg = SEC3.ShaderCreator.buildShadowMapPrograms(gl, scene);
    renderWithCascadesProg = SEC3.ShaderCreator.renderCascShadowProg(gl, scene);
};

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
    gl.clearColor( 0.3, 0.3, 0.3, 1.0 );


    gl.enable( gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    scene = new SEC3.Scene();

    //Setup camera
    view = mat4.create();
    camera = new SEC3.Camera();
    camera.goHome( [0.0, 2.0, 0.0] ); //initial camera posiiton
    camera.setAzimuth( 0.0 );
    interactor = SEC3.CameraInteractor( camera, canvas );
    camera.setPerspective( 60, canvas.width / canvas.height, demo.zNear, demo.zFar );

    scene.setCamera(camera);

    var nextLight = new SEC3.DiLight();
    nextLight.goHome ( [ 0, 20, 0] ); 
    nextLight.setAzimuth( 45 );    
    nextLight.setElevation( -90.0 );
    nextLight.setOrtho( 20, 20, demo.zNear, demo.zFar );
    nextLight.setupCascades( 1, 1024, gl, scene );
    scene.addLight(nextLight);
    demo.cascadeToDisplay = 0.0;
    lightAngle = 0.0;
    elCounter = 125;

    // setupLights();
    loadObjects();

    //Create a FBO
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
