var SEC3 = SEC3 || {};

SEC3.Scene = function(){
	this.lights = [];
	this.camera = [];
	this.geometry = [];
};

SEC3.Scene.prototype = {

	constructor: SEC3.Scene,

	addLight: function (light) {
		return this.lights.push(light);
	},

	getLight: function (lightIndex) {
		return this.lights[lightIndex];
	},

	getLights: function () {
		return this.lights;
	},

	setCamera: function (newCamera) {
		this.camera = newCamera;
	},

	getCamera: function () {
		return this.camera;
	}

};