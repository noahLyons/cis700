var SEC3 = SEC3 || {};

/*
 * Constructor
 */
SEC3.PerspProjector = function() {

	SEC3.Projector.call( this );
    this.fov = 0.0;
    this.aspect = 1.0;
  
};

SEC3.PerspProjector.prototype = Object.create( SEC3.Projector.prototype );

SEC3.PerspProjector.prototype.updatePerspective = function () {
    var persp = mat4.create();
    mat4.perspective( persp, this.fov, 
                  this.aspect, this.zNear, this.zFar );
    this.projectionMat = persp;
};

SEC3.PerspProjector.prototype.setFov = function (newFov) {
    this.fov = newFov * Math.PI / 180;
    this.updatePerspective();
};

SEC3.PerspProjector.prototype.setAspect = function (newAspect) {
    this.aspect = newAspect;
    this.updatePerspective();
};

SEC3.PerspProjector.prototype.setPerspective = function (newFov, newAspect, newNear, newFar) {
    this.fov = newFov * Math.PI / 180;
    this.aspect = newAspect;
    this.zNear = newNear;
    this.zFar = newFar;
    this.updatePerspective();
};