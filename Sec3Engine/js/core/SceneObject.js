/**
*   Camera object
*   Based on the code sample from WebGL Beginner's Guide.
*/

//SEC3 is a core function interface
var SEC3 = SEC3 || {};
/*
 * Constructor
 */
SEC3.SceneObject = function() {

    this.matrix     = mat4.create();
    this.up         = vec3.create();
    this.right      = vec3.create();
    this.normal     = vec3.create();
    this.position   = vec3.create();
    this.home       = vec3.create();
    this.azimuth    = 0.0;
    this.elevation  = 0.0;
    this.steps      = 0;

};

SEC3.SceneObject.prototype = {

    constructor: SEC3.SceneObject,

    setPosition: function (p){
        vec3.set( this.position, p[0], p[1], p[2] );
        this.update();
    },

    dolly: function(s){
        
        var p =  vec3.create();
        var n = vec3.create();
        
        p = this.position;
        
        var step = s - this.steps;
        
        vec3.normalize( n, this.normal );
        
        var newPosition = vec3.create();
        
        if(type == CAMERA_TRACKING_TYPE){
            newPosition[0] = p[0] - step*n[0];
            newPosition[1] = p[1] - step*n[1];
            newPosition[2] = p[2] - step*n[2];
        }
        else{
            newPosition[0] = p[0];
            newPosition[1] = p[1];
            newPosition[2] = p[2] - step; 
        }
    	
        this.setPosition(newPosition);
        this.steps = s;
    },

    setAzimuth: function(az){
        this.changeAzimuth(az - this.azimuth);
    },

    changeAzimuth: function(az){
        
        this.azimuth +=az;
        
        if (this.azimuth > 360 || this.azimuth <-360) {
    		this.azimuth = this.azimuth % 360;
    	}
        this.update();
    },

    setElevation: function(el){
        this.changeElevation(el - this.elevation);
    },

    changeElevation: function(el){
        
        this.elevation +=el;
        
        if (this.elevation > 360 || this.elevation <-360) {
    		this.elevation = this.elevation % 360;
    	}
        this.update();
    },

    goHome: function(h){
        if (h != null){
            this.home = h;
        }
        this.setPosition(this.home);
        this.setAzimuth(0);
        this.setElevation(0);
        this.steps = 0;
    },

    getViewTransform: function(){
        var m = mat4.create();
        mat4.invert( m, this.matrix );
        return m;
    },

    moveForward: function(){
       
        vec3.scaleAndAdd( this.position, this.position, this.normal, -0.1 );
        this.update();
    },

    moveBackward: function(){
       
        vec3.scaleAndAdd( this.position, this.position, normal, 0.1 );
        this.update();
    },

    moveLeft: function(){
        
        vec3.scaleAndAdd( this.position, this.position, this.right, -0.1 );
        this.update();
    },

    moveRight: function(){
        
        vec3.scaleAndAdd( this.position, this.position, this.right, 0.1 );
        this.update();
    },

    moveU: function(){
        
        vec3.scaleAndAdd( this.position, this.position, this.up, 0.1 );
        this.update();
    },

    moveDown: function(){
        
        vec3.scaleAndAdd( this.position, this.position, this.up, -0.1 );
        this.update();
    }

    // clone: function( object ) { 
    //     if( object === undefined ) object = new SEC3.SceneObject();

    //     object.setType = this.setType;
    //     object.goHome = this.goHome;
    //     object.dolly = this.dolly;
    //     object.setPosition = this.setPosition;
    //     object.setAzimuth = this.setAzimuth;
    //     object.changeAzimuth = this.changeAzimuth;
    //     object.setElevation = this.setElevation;
    //     object.changeElevation = this.changeElevation;
    //     object.update = this.update;    
    //     object.getViewTransform = this.getViewTransform;
    //     object.moveForward = this.moveForward; 
    //     object.moveBackward = this.moveBackward; 
    //     object.moveLeft = this.moveLeft;
    //     object.moveRight = this.moveRight; 
    //     object.moveUp = this.moveUp;
    //     object.moveDown = this.moveDown;

    //     return object;

    // }

};

// SEC3.EventDispatcher.prototype.apply( SEC3.)