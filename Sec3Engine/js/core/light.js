/**
*
*   Based on the code sample from WebGL Beginner's Guide.
*/


var SEC3 = SEC3 || {};

SEC3.createLight = function(){   

    var newObj = SEC3.createProjector();
    update = function(){

        mat4.identity(matrix);
        mat4.translate( matrix, matrix, position );
        mat4.rotateY( matrix, matrix, azimuth * Math.PI/180 );
        mat4.rotateX( matrix, matrix, elevation * Math.PI/180 );

        var m = matrix;
        vec4.transformMat4( right, [1,0,0,0], m );
        vec4.transformMat4( up, [0,1,0,0], m );
        vec4.transformMat4( normal, [0,0,1,0], m );
        vec3.normalize( normal, normal );
        vec3.normalize( up, up );
        vec3.normalize( right, right );            
        vec4.transformMat4( position, [0,0,0,1], m );
        
    };

    newObj.update = update;    

    return newObj;
};