/**
*   Camera object
*   Based on the code sample from WebGL Beginner's Guide.
*/

//SEC3 is a core function interface
var SEC3 = SEC3 || {};

SEC3.Light = function(){

    SEC3.Projector.call( this );
    
};

SEC3.Light.prototype = Object.create( SEC3.Projector.prototype );
