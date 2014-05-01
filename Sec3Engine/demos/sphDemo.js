var demo = (function () {

    var demo = [];
    demo.zFar = 30.0;
    demo.zNear = 0.6;
    demo.selectedLight = 0;
    demo.MAX_LIGHTS = 8;
    demo.MAX_CASCADES = 6;
    demo.AMBIENT_INTENSITY = 0.03;

    demo.texToDisplay = 2;
    demo.secondPass;

    demo.nearSlope = -6.6;
    demo.nearIntercept = 1.39;

    demo.farSlope = 1.4;
    demo.farIntercept = -0.28;

    demo.blurSigma = 2.0;

    demo.SMALL_BLUR = 1.8;
    demo.MEDIUM_BLUR = 3.4;
    demo.LARGE_BLUR = 11.6;

    demo.SHADOWMAP_SIZE = 1024.0;
    demo.FAR_CASCADE_SIZE = 256;
    demo.NEAR_CASCADE_SIZE = 1024;
    return demo;

})();

//--------------------------------------------GLOBALS:
var demo;

var gl;
var scene;
var sph;
var stats;

var model_vertexVBOs = [];   //buffer object for loaded model (vertex)
var model_indexVBOs = [];    //buffer object for loaded model (index)
var model_normalVBOs = [];   //buffer object for loaded model (normal)
var model_texcoordVBOs = []; //buffer object for loaded model (texture)

//--------------------------------------------FUNCTIONS:
var myRenderLoop = function() {
	window.requestAnimationFrame( myRenderLoop );
    
        stats.begin();
        myRender();
        stats.end();

};

var myRender = function() {
    //TODO getter / only call once
    if( ! demo.gBufferFilled ) {
        SEC3.renderer.fillGPass( sph.projectors[0].gBuffer, sph.projectors[0] );
        demo.gBufferFilled = true;
        // sph.updateBuckets();
        // SEC3.postFx.blurGaussian( sph.projectors[0].gBuffer.texture(1),  demo.blurFBO, 4.0 );
        // sph.projectors[0].gBuffer.setTexture( 1, demo.blurFBO.texture(0), gl);
    }
    SEC3.renderer.fillGPass( scene.gBuffer, scene.getCamera() );
    // SEC3.renderer.deferredRender( scene, scene.gBuffer );
    SEC3.postFx.finalPass( scene.gBuffer.texture(2));

    if( ! sph.paused ) {
        // bucketStats.begin();
        sph.updateBuckets();
        // bucketStats.end();
    
        // positionStats.begin();
        sph.updatePositions();
        // positionStats.end();

        sph.updateBuckets();

        // densityStats.begin();
        sph.updateDensity();
        // densityStats.end();

        // velocityStats.begin();
        sph.updateVelocities();
        // velocityStats.end();
    }

    if( sph.viewGrid ) {
        SEC3.postFx.finalPass(sph.bucketFBO.texture(0)); // TEMP
    }
    else if( sph.viewDepth ) {
        SEC3.postFx.finalPass( sph.projectors[0].gBuffer.texture(0) );
    }

    else if( sph.viewNormals ) {
        SEC3.postFx.finalPass( sph.projectors[0].gBuffer.texture(1));
         // SEC3.postFx.finalPass( demo.blurFBO.texture(0) );
    }
    else {
        sph.draw( scene, null );
    }
    
};

var main = function( canvasId, messageId ){
    initGL( canvasId, messageId );
    SEC3.renderer.init(); // TEMP
    SEC3.postFx.init(); // TEMP
	setupScene();
	SEC3.render = myRender;
	SEC3.renderLoop = myRenderLoop;
	SEC3.run(gl);

};

/*
 * Sets up basics of scene; camera, viewport, projection matrix, fbo
 */
var setupScene = function(){

    scene = new SEC3.Scene();

    initCamera();
    initLight();
    loadObjects();
    initParticleSystem();
    initFBOs();
    initUI();
};

var initLight = function() {
    var nextLight = new SEC3.SpotLight();
    nextLight.goHome ( [ 0, 6, 0] ); 
    nextLight.setAzimuth( 90.0 );    
    nextLight.setElevation( -60.0 );
    nextLight.setPerspective( 30, 1, 0.2, 10.0 );
    nextLight.setupCascades( 1, 512, gl, scene );
    scene.addLight(nextLight);
}

var initCamera = function() {

	var canvas = SEC3.canvas;
	var camera = new SEC3.Camera();
    camera.goHome( [0.0, 6.0, 10.0] ); //initial camera posiiton
    camera.setAzimuth( -30.0 );
    camera.setElevation( -30.0 );
    interactor = SEC3.CameraInteractor( camera, canvas );
    camera.setPerspective( 60, canvas.width / canvas.height, 0.1, 30.0 );
    scene.setCamera(camera);
    SEC3.canvas = canvas;

}

var initFBOs = function() {

    var canvas = SEC3.canvas;
    // var blurFBO = SEC3.createFBO();
    // blurFBO.initialize( gl, 2048, 2048 );
    // demo.blurFBO = blurFBO;
    var gBuffer = SEC3.createFBO();
    gBuffer.initialize( gl, SEC3.canvas.width, SEC3.canvas.height );
    scene.gBuffer = gBuffer;

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

    finalFBO = SEC3.createFBO();
    if (! finalFBO.initialize( gl, canvas.width, canvas.height )) {
        console.log( "finalFBO initialization failed.");
        return;
    }

    shadowFBO = SEC3.createFBO();
    if (! shadowFBO.initialize( gl, 512, 512, 2 )) {
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
}

var initGL = function(canvasId, messageId) {
    //get WebGL context
    var canvas = document.getElementById( canvasId );
    SEC3.canvas = canvas;
    var msg = document.getElementById( messageId );
    gl = SEC3.getWebGLContext( canvas, msg );
    if (! gl) {
        console.log("Bad GL Context!");
        return;
    }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    gl.clearColor( 0.4, 0.4, 0.4, 1.0);
    gl.depthFunc(gl.LESS);
}
var initParticleSystem = function() {

	var specs = {
        // numParticles : 4096,
		numParticles : 16384,
        // numParticles : 65536,
        // numParticles : 30276,
        // numParticles : 262144,
        // numParticles : 1048576,
        // numParticles : 4194304,
        // numParticles : 102144,
		RGBA : vec4.fromValues( 0.0, 0.0, 1.0, 1.0 ),
		particleSize : 1.0,
        stepsPerFrame : 1.0,
		gravity : 9.8,
		pressureK : 477,
        nearPressureK : 813,
        restDensity : 1.3,
        restPressure : 100.0,
        viscosityK : 12,
        viscosityLinearK : 0.5,
		h : 0.12,   
        mass : 0.001,
        surfaceTension : 0.0,
        maxVelocity : 10.0
	}

    var specsFast = {
        numParticles : 65536,
        // numParticles : 16384,
        RGBA : vec4.fromValues( 0.0, 0.0, 1.0, 1.0 ),
        particleSize : 1.0,
        stepsPerFrame : 2.0,
        gravity : 9.8,
        pressureK : 40,
        nearPressureK : 80,
        restDensity : 1.48,
        restPressure : 100.0,
        viscosityK : 12,
        viscosityLinearK : 0.5,
        h : 0.12,   
        mass : 0.001,
        surfaceTension : 0.02,
        maxVelocity : 12.0
    }

	sph = new SEC3.SPH(specsFast);
    sph.addDetectorProjector( [8.0, 12.0, 8.0], 0.0, -90.0, 1024, 12.0 );
    // TODO:
    // particleSize : 0.7,
    // stepsPerFrame : 4,
    // gravity : 9.8,
    // pressureK : 1000,
    // nearPressureK : 228,
    // restDensity : 0.8,
    // restPressure : 100.0,
    // viscosityK : 12,
    // viscosityLinearK : 2,
    // h : 0.12,   
    // mass : 0.001,
    // surfaceTension : 0.0,
    // maxVelocity : 50.0
}

var initUI = function() {
    
    stats = new Stats();
    stats.setMode(0); // 0: fps, 1: ms
    // Align top-left
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild( stats.domElement );

    // bucketStats = new Stats();
    // positionStats = new Stats();
    // densityStats = new Stats();
    // velocityStats = new Stats();

    // bucketStats.setMode(1);
    // positionStats.setMode(1);
    // densityStats.setMode(1);
    // velocityStats.setMode(1);

    // bucketStats.domElement.style.position = 'absolute';
    // bucketStats.domElement.style.left = '0px';
    // bucketStats.domElement.style.top = '100px';
    // document.body.appendChild( bucketStats.domElement );

    // positionStats.domElement.style.position = 'absolute';
    // positionStats.domElement.style.left = '0px';
    // positionStats.domElement.style.top = '200px';
    // document.body.appendChild( positionStats.domElement );

    // densityStats.domElement.style.position = 'absolute';
    // densityStats.domElement.style.left = '0px';
    // densityStats.domElement.style.top = '300px';
    // document.body.appendChild( densityStats.domElement );

    // velocityStats.domElement.style.position = 'absolute';
    // velocityStats.domElement.style.left = '0px';
    // velocityStats.domElement.style.top = '400px';
    // document.body.appendChild( velocityStats.domElement );

    var gui = new dat.GUI();
    gui.add(sph, 'pause' );
    gui.add(sph, 'stepsPerFrame', 1, 60).name('Time step divisor');
    gui.add(sph, 'maxVelocity', 0.01, 100);
	gui.add(sph, 'h', 0.01, 1.0);
    gui.add(sph, 'pressureK', 0.0, 1000.0 );
    gui.add(sph, 'nearPressureK', 0.0, 1000.0 ); //TODO combine
    gui.add(sph, 'viscosityK', 0.0, 12.0);
    gui.add(sph, 'viscosityLinearK', 0.0, 2.0);
    gui.add(sph, 'surfaceTension', 0.0, 1.0);
    gui.add(sph, 'restDensity', 0.01, 1000.0);
    gui.add(sph, 'initFBOs' ).name('restart');
    
    gui.add(sph, 'showGrid' ).name('Show voxel grid');
    gui.add(sph, 'showDepth' ).name('Show collision depth');
    gui.add(sph, 'showNormals' ).name('Show collision normal');
    gui.add(sph, 'particleSize', 0.1, 2.0 );
}

/*
 * Loads objects from obj files into the model_VBOs
 */
var loadObjects = function() {
    //Load a OBJ model from file
    var objLoader = SEC3.createOBJLoader(scene);
    
    
    objLoader.loadFromFile( gl, 'Sec3Engine/models/sphere/sphere2.obj', 'Sec3Engine/models/sphere/sphere.mtl');
    objLoader.loadFromFile( gl, 'Sec3Engine/models/thickPlane/terrain4.obj', 'Sec3Engine/models/thickPlane/terrain4.mtl');
    
    
        
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