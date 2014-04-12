//--------------------------------------------GLOBALS:
var gl;
var scene;
var sph;

var model_vertexVBOs = [];   //buffer object for loaded model (vertex)
var model_indexVBOs = [];    //buffer object for loaded model (index)
var model_normalVBOs = [];   //buffer object for loaded model (normal)
var model_texcoordVBOs = []; //buffer object for loaded model (texture)

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

	// sph.move();
	sph.updateDensity();
	sph.updateVelocities();
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
    loadObjects();
    initParticleSystem();

    initUI();

};

var initCamera = function() {

	var canvas = SEC3.canvas;
	var camera = new SEC3.Camera();
    camera.goHome( [0.1, 0.3, 1.0] ); //initial camera posiiton
    camera.setAzimuth( 0.0 );
    camera.setElevation( 0.0 );
    interactor = SEC3.CameraInteractor( camera, canvas );
    camera.setPerspective( 60, canvas.width / canvas.height, 0.1, 30.0 );
    scene.setCamera(camera);
}

var initParticleSystem = function() {

	var specs = {
		numParticles : 4096,

		RGBA : vec4.fromValues( 0.0, 0.0, 1.0, 1.0 ),
		particleSize : 1.0,

		gravity : 10,
		restDensity : 10,
		pressureK : 10,
		nearPressureK : 10,
		h : 0.05     
	}

	sph = new SEC3.SPH(specs);
	// TODO:
}

var initUI = function() {

	SEC3.ui = SEC3.ui || new UI("uiWrapper");
    var setEffectiveRadius = function(e) {

        var newSliderVal = e.target.value;
        sph.h = newSliderVal;
        return newSliderVal + " :effective radius";
    };

    SEC3.ui.addSlider( sph.h + " :effective radius" ,
                 setEffectiveRadius,
                 sph.h,
                 0, 1.0,
                 0.1);
}

/*
 * Loads objects from obj files into the model_VBOs
 */
var loadObjects = function() {
    //Load a OBJ model from file
    var objLoader = SEC3.createOBJLoader(scene);
    // objLoader.loadFromFile( gl, 'models/coke/coke.obj', 'models/coke/coke.mtl');
    // objLoader.loadFromFile( gl, 'Sec3Engine/models/buddha_new/buddha_scaled_.obj', 'Sec3Engine/models/buddha_new/buddha_scaled_.mtl');
    objLoader.loadFromFile( gl, 'Sec3Engine/models/sphere/sphere.obj', 'Sec3Engine/models/sphere/sphere.mtl');
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