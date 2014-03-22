//SEC3 is a core function interface
var SEC3 = SEC3 || {};

var NEAR_PLANE = 0;
var FAR_PLANE = 1;

SEC3.SpotLight = function(){

    SEC3.PerspProjector.call( this );
    this.cascadeFramebuffers = [];
    this.cascadeMatrices = [];
    this.cascadeClips = [];
    this.numCascades = 0.0;
};

SEC3.SpotLight.prototype = Object.create( SEC3.PerspProjector.prototype );

SEC3.SpotLight.prototype.addCascade = function(resolution, near, far) {

        var fbo = SEC3.createFBO();
        if (! fbo.initialize( gl, resolution, resolution, 1 )) {
            console.log( "shadowFBO initialization failed.");
            return;
        }
        else {
            this.numCascades = this.cascadeFramebuffers.push(fbo);
            var persp = mat4.create();
            mat4.perspective( persp, this.fov, this.aspect, this.zNear, this.zFar );
            this.cascadeMatrices.push(persp);
            this.cascadeClips.push([near, far]);
        }


};
