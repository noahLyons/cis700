/**
*
*   Based on the code sample from WebGL Beginner's Guide.
*/


var SEC3 = SEC3 || {};

SEC3.createProjector = function(){
    
    this.matrix     = mat4.create();
    this.up         = vec3.create();
    this.right      = vec3.create();
    this.normal     = vec3.create();
    this.position   = vec3.create();
    this.home       = vec3.create();
    this.azimuth    = 0.0;
    this.elevation  = 0.0;
    this.steps      = 0;
    this.fbo        = [];

    update = function() {

    };

    setFbo = function(newFbo) {
        fbo = newFbo;
    };
    
    setPosition = function(p){
        //vec3.set(p, position);
        vec3.set( position, p[0], p[1], p[2] );
        update();
    };

    setAzimuth = function(az){
        changeAzimuth(az - azimuth);
    };

    changeAzimuth = function(az){
        
        azimuth +=az;
        
        if (azimuth > 360 || azimuth <-360) {
    		azimuth = azimuth % 360;
    	}
        update();
    };

    setElevation = function(el){
        changeElevation(el - elevation);
    };

    changeElevation = function(el){
        
        elevation +=el;
        
        if (elevation > 360 || elevation <-360) {
    		elevation = elevation % 360;
    	}
        update();
    };

    goHome = function(h){
        if (h != null){
            home = h;
        }
        setPosition(home);
        setAzimuth(0);
        setElevation(0);
        steps = 0;
    };

    getViewTransform = function(){
        var m = mat4.create();
        //mat4.inverse(matrix, m);
        mat4.invert( m, matrix );
        return m;
    };

    moveForward = function(){
       
        vec3.scaleAndAdd( position, position, normal, -0.1 );
        update();
    };

    moveBackward = function(){
       
        vec3.scaleAndAdd( position, position, normal, 0.1 );
        update();
    };

    moveLeft = function(){
        
        vec3.scaleAndAdd( position, position, right, -0.1 );
        update();
    };

    moveRight = function(){
        
        vec3.scaleAndAdd( position, position, right, 0.1 );
        update();
    };

    moveUp= function(){
        
        vec3.scaleAndAdd( position, position, up, 0.1 );
        update();
    };

    moveDown = function(){
        
        vec3.scaleAndAdd( position, position, up, -0.1 );
        update();
    };

    var newObj = {};
    newObj.setFbo = setFbo;
    newObj.goHome = goHome;
    newObj.setPosition = setPosition;
    newObj.setAzimuth = setAzimuth;
    newObj.changeAzimuth = changeAzimuth;
    newObj.setElevation = setElevation;
    newObj.changeElevation = changeElevation;
    newObj.getViewTransform = getViewTransform;
    newObj.moveForward = moveForward; 
    newObj.moveBackward = moveBackward; 
    newObj.moveLeft = moveLeft;
    newObj.moveRight = moveRight; 
    newObj.moveUp = moveUp;
    newObj.moveDown = moveDown;

    return newObj;
};