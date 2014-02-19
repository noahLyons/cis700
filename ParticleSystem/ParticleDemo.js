
//----------------------------------------------------------------GLOBALS:

var particleSpecs = {
    maxParticles : 10000,
    emitters : [],
    gravityModifier : 1.0,
    RGBA : [0.0, 0.2, 0.9, 0.2],
    damping : 1.01,
    type : "nBody",
    activeBodies : 4,
    particleSize : 0.4,

    //TODO phi and theta?
};

var emitterSpecs = {
    emissionRate : 10,
}

var canvas;
var gl;
var system;

var mvMatrix = mat4.create();
var pMatrix = mat4.create();

//--------------------------------------------------------------FUNCTIONS:

function drawScene() {
    system.draw();
}

function renderLoop() {

    if(! SEC3ENGINE.ui) {
        initUiButtons();
    }
    requestAnimationFrame(renderLoop);
    drawScene();
}

function initGL(canvas) {
    var msg;
    //get WebGL context
    msg = document.getElementById("message");

    gl = SEC3ENGINE.getWebGLContext( canvas, msg );
    if( !gl ){
        return;
    }
    try {
        //extension to use floating point values in positionTextures
        gl.getExtension("OES_texture_float");  
        //extension allowing us to write to more than one buffer per render Pass
        // ext = gl.getExtension("WEBGL_draw_buffers");
        // if(! ext){
        //     alert("sorry, your browser does not support multiple draw buffers");
        // }

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

function initUiButtons() {
    
    SEC3ENGINE.ui = new UI("uiWrapper");

    //courtesy of http://stackoverflow.com/a/2901298
    var numberWithCommas = function(stringMe) {
        return stringMe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };
        
    //-----RESTART
    var restartCallback = function() {
        // system = SEC3ENGINE.createParticleSystem(INITIAL_PARTICLES,INITIAL_MASS_MULTIPLIER);
        system.restart();
    };

    SEC3ENGINE.ui.addButton("Restart", restartCallback);

    //-----PARTICLE COUNT
    var countCallback = function(e) {

        var newSliderVal = e.target.value;
        // calc 
        var textureEdgeLength = Math.pow(2, newSliderVal);
        // 
        system.textureSideLength = textureEdgeLength;
        system.maxParticles = textureEdgeLength * textureEdgeLength;
        system.restart();
        // Return new label for slider
        return numberWithCommas(system.maxParticles) + " Particles";
    };
    
    SEC3ENGINE.ui.addSlider(numberWithCommas(system.maxParticles) + " Particles ", 
                 countCallback, 
                 Math.log(Math.sqrt(system.maxParticles)) / Math.log(2), // value (power of 2)
                 8, 12, // min, max
                 1); // step
    //-----

    //-----PARTICLE MASS RANGE
    var massCallback = function(e) {

        var newSliderVal = e.target.value;
        gl.useProgram(system.stepProgram.ref());
        gl.uniform1f(system.stepProgram.uGravityModifier, newSliderVal);
        system.massMultiplier = newSliderVal;        
        // Return new label for slider
        return "Gravity: " + newSliderVal;
    };

    SEC3ENGINE.ui.addSlider("Gravity: " + system.gravityModifier,
                 massCallback,
                 1,
                 -1000, 1000,
                 1);
    //-----

    //--------PARTICLE ALPHA TRANSPARENCY
    var alphaCallback = function(e) {

        var newSliderVal = e.target.value;
        gl.useProgram(system.renderProgram.ref());
        gl.uniform1f(system.renderProgram.uAlpha, newSliderVal);
        return "Particle transparency: " + newSliderVal;
    };

    SEC3ENGINE.ui.addSlider("Particle transparency: " + system.RGBA[3],
                 alphaCallback,
                 system.RGBA[3],
                 0.001, 0.2,
                 0.001);
    //-----

    //-------PARTICLE POINT SIZE
    var sizeCallback = function(e) {

        var newSliderVal = e.target.value;
        gl.useProgram(system.renderProgram.ref());
        gl.uniform1f(system.renderProgram.uSize, newSliderVal);
        return "Particle draw size: " + newSliderVal;
    };

    SEC3ENGINE.ui.addSlider("Particle draw size: " + system.particleSize,
                 sizeCallback,
                 system.particleSize,
                 0.0, 20.0,
                 0.1);
    //-----

    //------Damping
    var dampingCallback = function(e) {

        var newSliderVal = e.target.value;
        gl.useProgram(system.stepProgram.ref());
        gl.uniform1f(system.stepProgram.uDamping, newSliderVal);
        system.damping = newSliderVal;
        return "Damping: " + newSliderVal;
    };

    SEC3ENGINE.ui.addSlider("Damping: " + system.damping,
                 dampingCallback,
                 system.damping,
                 1.0, 1.2,
                 0.001);
    //-----

    //------NUMBER OF INTERACTIONS
    var interactionsCallback = function(e) {

        var newSliderVal = e.target.value;
        gl.useProgram(system.stepProgram.ref());
        gl.uniform1f(system.stepProgram.uInteractions, newSliderVal);
        system.activeBodies = newSliderVal;
        return Math.pow(newSliderVal, 2) + " Interactions";
    };

    SEC3ENGINE.ui.addSlider(Math.pow(system.activeBodies, 2) + " Interactions",
                 interactionsCallback,
                 system.activeBodies,
                 0.0, 32.0,
                 1.0);
    //------
}

function startDemo() {
    // READ IN JSON FROM FILE
    // Gen texture for spark particles
    spriteTex = new Texture();
    spriteTex.setImage("Sec3Engine/textures/spark.png");

    // FEED SPECS INTO IT
    interactor = SEC3ENGINE.ParticleInteractor(canvas);//SEC3ENGINE.CameraInteractor(camera, canvas);
    // camInteractor = SEC3ENGINE.CameraInteractor(camera, canvas);
    // moved other inits into shader callbacks as they are dependent on async shader loading
    system = SEC3ENGINE.createParticleSystem(particleSpecs);

    SEC3ENGINE.render = drawScene;
    SEC3ENGINE.renderLoop = renderLoop;
    SEC3ENGINE.run(gl);
}

function webGLStart() {

    canvas = document.getElementById("glcanvas");
    initGL(canvas);

    camera = SEC3ENGINE.createCamera(CAMERA_TRACKING_TYPE);
    camera.goHome([0, 0, 5]);
     
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    
    startDemo();
}