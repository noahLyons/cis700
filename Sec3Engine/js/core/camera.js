// By Cheng

/**
 *   Camera object
 *   Based on the code sample from WebGL Beginner's Guide.
 */

//SEC3ENGINE is a core function interface
var SEC3ENGINE = SEC3ENGINE || {};

var CAMERA_ORBIT_TYPE    = 1;
var CAMERA_TRACKING_TYPE = 2;


SEC3ENGINE.currentCamera = {};

SEC3ENGINE.createCamera = function(t){
    var matrix     = mat4.create();
    var up         = vec3.create();
    var right      = vec3.create();
    var normal     = vec3.create();
    var position   = vec3.create();
    var home       = vec3.create();
    var azimuth    = 0.0;
    var elevation  = 0.0;
    var type       = t;
    var steps      = 0;
    var persp = mat4.create();
    mat4.perspective(persp, Math.PI / 4, 
                     gl.viewportWidth / gl.viewportHeight, 
                     0.1, 100.0);
    
    setType = function(t){
        
        type = t;
        
        if (t != CAMERA_ORBIT_TYPE && t != CAMERA_TRACKING_TYPE) {
            alert('Wrong Camera Type!. Setting Orbitting type by default');
            type = CAMERA_ORBIT_TYPE;
        }
    };
    update = function(){
        if (type == CAMERA_TRACKING_TYPE){
            mat4.identity(matrix);
            //mat4.translate(matrix, position);
            //mat4.rotateY(matrix, azimuth * Math.PI/180);
            //mat4.rotateX(matrix, elevation * Math.PI/180);
            mat4.translate( matrix, matrix, position );
            mat4.rotateY( matrix, matrix, azimuth * Math.PI/180 );
            mat4.rotateX( matrix, matrix, elevation * Math.PI/180 );
        }
        else {
            //mat4.identity(matrix);
            //mat4.rotateY(matrix, azimuth * Math.PI/180);
            //mat4.rotateX(matrix, elevation * Math.PI/180);
            //mat4.translate(matrix, position);
            mat4.rotateY( matrix, matrix, azimuth * Math.PI/180 );
            mat4.rotateX( matrix, matrix, elevation * Math.PI/180 );
            mat4.translate( matrix, matrix, position );
        }

        var m = matrix;
        //mat4.multiplyVec4(m, [1, 0, 0, 0], right);
        //mat4.multiplyVec4(m, [0, 1, 0, 0], up);
        //mat4.multiplyVec4(m, [0, 0, 1, 0], normal);
        vec4.transformMat4( right, [1,0,0,0], m );
        vec4.transformMat4( up, [0,1,0,0], m );
        vec4.transformMat4( normal, [0,0,1,0], m );

        if(type == CAMERA_TRACKING_TYPE){
            //mat4.multiplyVec4(m, [0, 0, 0, 1], position);
            vec4.transformMat4( position, [0,0,0,1], m );
        } 
    };
    setPosition = function(p){
        //vec3.set(p, position);
        vec3.set( position, p[0], p[1], p[2] );
        update();
    };

    dolly = function(s){
        
        var p =  vec3.create();
        var n = vec3.create();
        
        p = position;
        
        var step = s - steps;
        
        //vec3.normalize(c.normal,n);
        vec3.normalize( n, normal );
        
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
    	
        setPosition(newPosition);
        steps = s;
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
        mat4.multiply(m, persp, m);
        return m;
    };

    var newObj = {};
    newObj.matrix = matrix;
    newObj.setType = setType;
    newObj.goHome = goHome;
    newObj.dolly = dolly;
    newObj.setPosition = setPosition;
    newObj.setAzimuth = setAzimuth;
    newObj.changeAzimuth = changeAzimuth;
    newObj.setElevation = setElevation;
    newObj.changeElevation = changeElevation;
    newObj.update = update;    
    newObj.getViewTransform = getViewTransform;

    SEC3ENGINE.currentCamera = newObj;
    return newObj;
};

