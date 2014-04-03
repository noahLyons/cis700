SEC3 = SEC3 || {};
SEC3.renderer = {};

SEC3.renderer.createScreenSizedQuad = function() {

    SEC3.fullScreenQuad = {};

    SEC3.fullScreenQuad.vertexVBO = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, SEC3.fullScreenQuad.vertexVBO );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(screenQuad.vertices), gl.STATIC_DRAW );
 
    SEC3.fullScreenQuad.texcoordVBO = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, SEC3.fullScreenQuad.texcoordVBO );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(screenQuad.texcoords), gl.STATIC_DRAW );   
    gl.bindBuffer( gl.ARRAY_BUFFER, null );

    SEC3.fullScreenQuad.indexVBO = gl.createBuffer();
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, SEC3.fullScreenQuad.indexVBO );
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(screenQuad.indices), gl.STATIC_DRAW );
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );

    SEC3.fullScreenQuad.eyeRayVBO = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, SEC3.fullScreenQuad.eyeRayVBO );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(), gl.STREAM_DRAW );
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );   

};

SEC3.renderer.bindQuadBuffers = function(program, farPlaneVerts) {

    if( ! SEC3.fullScreenQuad ) {
        SEC3.renderer.createScreenSizedQuad();
    }
    gl.bindBuffer( gl.ARRAY_BUFFER, SEC3.fullScreenQuad.vertexVBO );
    gl.vertexAttribPointer( program.aVertexPosLoc, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( program.aVertexPosLoc );

    gl.bindBuffer( gl.ARRAY_BUFFER, SEC3.fullScreenQuad.texcoordVBO );
    gl.vertexAttribPointer( program.aVertexTexcoordLoc, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( program.aVertexTexcoordLoc );

    if( farPlaneVerts ) {
        gl.bindBuffer( gl.ARRAY_BUFFER, SEC3.fullScreenQuad.eyeRayVBO );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(farPlaneVerts), gl.STREAM_DRAW );
        gl.vertexAttribPointer( program.aVertexEyeRayLoc, 3, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( program.aVertexEyeRayLoc );
    }

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, SEC3.fullScreenQuad.indexVBO );  
};