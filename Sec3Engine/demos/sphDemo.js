//--------------------------------------------GLOBALS:
var gl;
var scene;
var sph;

//--------------------------------------------FUNCTIONS:
var myRenderLoop = function() {
	window.requestAnimationFrame( myRenderLoop );
    myRender();
};

var myRender = function() {
	
	/*
		sph.move();
		sph.relax();
		sph.updateVelocities();
	*/

	sph.move();
	sph.draw( scene, null );	
};

var main = function( canvasId, messageId ){
	setupScene(canvasId, messageId);

	// SEC3.renderer.init();
	SEC3.render = myRender;
	SEC3.renderLoop = myRenderLoop;
	SEC3.run(gl);	
};

/*
 * Sets up basics of scene; camera, viewport, projection matrix, fbo
 */
var setupScene = function(canvasId, messageId){
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
    gl.clearColor( 0.3, 0.3, 0.3, 1.0);
    gl.depthFunc(gl.LESS);

    scene = new SEC3.Scene();

    initCamera();

    initParticleSystem();


};

var initCamera = function() {
	var canvas = SEC3.canvas;
	var camera = new SEC3.Camera();
    camera.goHome( [0.0, 0.0, 5.0] ); //initial camera posiiton
    camera.setAzimuth( 0.0 );
    camera.setElevation( 0.0 );
    interactor = SEC3.CameraInteractor( camera, canvas );
    camera.setPerspective( 60, canvas.width / canvas.height, 0.1, 30.0 );
    scene.setCamera(camera);
}

var initParticleSystem = function() {
	var specs = {
		numParticles : 1024,

		RGBA : vec4.fromValues( 0.0, 0.0, 1.0, 1.0 ),
		particleSize : 1.0,

		gravity : 10,
		restDensity : 10,
		pressureK : 10,
		nearPressureK : 10,

	}

	sph = new SEC3.SPH(specs);
	// TODO:
}