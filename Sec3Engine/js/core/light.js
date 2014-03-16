/**
*   Camera object
*   Based on the code sample from WebGL Beginner's Guide.
*/

//SEC3 is a core function interface
var SEC3 = SEC3 || {};

var CAMERA_ORBIT_TYPE    = 1;
var CAMERA_TRACKING_TYPE = 2;

SEC3.Light = function(){

    SEC3.SceneObject.call( this );

    this.type       = CAMERA_TRACKING_TYPE;

};

SEC3.Light.prototype = Object.create( SEC3.SceneObject.prototype );

    
SEC3.Light.prototype.update = function(){
    if (this.type == CAMERA_TRACKING_TYPE){
        mat4.identity(this.matrix);
        mat4.translate( this.matrix, this.matrix, this.position );
        mat4.rotateY( this.matrix, this.matrix, this.azimuth * Math.PI/180 );
        mat4.rotateX( this.matrix, this.matrix, this.elevation * Math.PI/180 );
    }
    else {
    
        mat4.rotateY( this.matrix, this.matrix, this.azimuth * Math.PI/180 );
        mat4.rotateX( this.matrix, this.matrix, this.elevation * Math.PI/180 );
        mat4.translate( this.matrix, this.matrix, this.position );
    }

    var m = this.matrix;
    
    vec4.transformMat4( this.right, [1,0,0,0], m );
    vec4.transformMat4( this.up, [0,1,0,0], m );
    vec4.transformMat4( this.normal, [0,0,1,0], m );
    vec3.normalize( this.normal, this.normal );
    vec3.normalize( this.up, this.up );
    vec3.normalize( this.right, this.right );

    if(this.type == CAMERA_TRACKING_TYPE){
    
        vec4.transformMat4( this.position, [0,0,0,1], m );
    } 
};