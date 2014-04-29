

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
    
    sph.updateBuckets();
    sph.updatePositions();
    sph.updateBuckets();
	sph.updateDensity();
	sph.updateVelocities();
    if( sph.viewGrid ) {
        SEC3.postFx.finalPass(sph.bucketFBO.texture(0)); // TEMP
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
    loadObjects();
    initParticleSystem();
    initFBOs();
    initUI();
};


var initCamera = function() {

	var canvas = SEC3.canvas;
	var camera = new SEC3.Camera();
    camera.goHome( [-1.1, 2.0, 3.0] ); //initial camera posiiton
    camera.setAzimuth( -30.0 );
    camera.setElevation( -30.0 );
    interactor = SEC3.CameraInteractor( camera, canvas );
    camera.setPerspective( 60, canvas.width / canvas.height, 0.1, 30.0 );
    scene.setCamera(camera);

}

var initFBOs = function() {

    var blurFBO = SEC3.createFBO();
    blurFBO.initialize( gl, 2048, 2048 );
    demo.blurFBO = blurFBO;
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
		// numParticles : 16384,
        numParticles : 65536,
        // numParticles : 30276,
        // numParticles : 262144,
        // numParticles : 102144,
		RGBA : vec4.fromValues( 0.0, 0.0, 1.0, 1.0 ),
		particleSize : 0.3,
        stepsPerFrame : 2.4,
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

	sph = new SEC3.SPH(specs);
    sph.addDetectorProjector( [5.0, 20.0, 5.0], 0.0, -90.0, 2048, 20.0 );
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


    var gui = new dat.GUI();
    gui.add(sph, 'stepsPerFrame', 1, 60);
    gui.add(sph, 'maxVelocity', 0.01, 100);
	gui.add(sph, 'h', 0.01, 1.0);
    gui.add(sph, 'mass', 0.0001, 1.0);
    gui.add(sph, 'pressureK', 0.0, 1000.0 );
    gui.add(sph, 'nearPressureK', 0.0, 1000.0 );
    gui.add(sph, 'viscosityK', 0.0, 12.0);
    gui.add(sph, 'viscosityLinearK', 0.0, 2.0);
    gui.add(sph, 'surfaceTension', 0.0, 1.0);
    gui.add(sph, 'restDensity', 0.01, 1000.0);
    // gui.add(sph, 'restPressure', -1000, 10000);
    gui.add(sph, 'initFBOs' );
    gui.add(sph, 'viewGrid' );
    gui.add(sph, 'viewNormals' );
    gui.add(sph, 'particleSize', 0.1, 2.0 );
}

/*
 * Loads objects from obj files into the model_VBOs
 */
var loadObjects = function() {
    //Load a OBJ model from file
    var objLoader = SEC3.createOBJLoader(scene);
    
    
    objLoader.loadFromFile( gl, 'Sec3Engine/models/sphere/sphere2.obj', 'Sec3Engine/models/sphere/sphere.mtl');
    objLoader.loadFromFile( gl, 'Sec3Engine/models/bucketBurg/bucketBurg5.obj', 'Sec3Engine/models/bucketBurg/bucketBurg.mtl');
    
    
        
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