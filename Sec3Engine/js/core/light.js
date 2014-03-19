//SEC3 is a core function interface
var SEC3 = SEC3 || {};

var NEAR_PLANE = 0;
var FAR_PLANE = 1;

SEC3.Light = function(){

    SEC3.Projector.call( this );
    this.cascadeFramebuffers = [];
    this.cascadePerspectives = [];
    this.cascadeClips = [];
    this.numCascades = 0.0;
};

SEC3.Light.prototype = Object.create( SEC3.Projector.prototype );

SEC3.Light.prototype.addCascade = function(resolution, near, far) {

        var fbo = SEC3.createFBO();
        if (! fbo.initialize( gl, resolution, resolution, 1 )) {
            console.log( "shadowFBO initialization failed.");
            return;
        }
        else {
            this.numCascades = this.cascadeFramebuffers.push(fbo);
            var persp = mat4.create();
            mat4.perspective( persp, this.fov, this.aspect, near, far );
            this.cascadePerspectives.push(persp);
            this.cascadeClips.push([near, far]);
        }


};
