//SEC3 is a core function interface
var SEC3 = SEC3 || {};

var NEAR_PLANE = 0;
var FAR_PLANE = 1;

SEC3.DirectionalLight = function(){

    SEC3.OrthoProjector.call( this );
    this.cascadeFramebuffers = [];
    this.cascadeMatrices = [];
    this.cascadeClips = [];
    this.numCascades = 0.0;
};

SEC3.DirectionalLight.prototype = Object.create( SEC3.OrthoProjector.prototype );

SEC3.DirectionalLight.prototype.addCascade = function(resolution, near, far) {

    var fbo = SEC3.createFBO();
    if (! fbo.initialize( gl, resolution, resolution, 1 )) {
        console.log( "shadowFBO initialization failed.");
        return;
    }
    else {
        this.numCascades = this.cascadeFramebuffers.push(fbo);
        var orth = mat4.create();
        // Generates a orthogonal projection matrix with the given bounds
        // (out, left, right, bottom, top, near, far)
        mat4.ortho( orth, this.width, this.height, this.zNear, this.zFar );
        this.cascadeMatrices.push(orth);
        this.cascadeClips.push([near, far]);
    }


};
