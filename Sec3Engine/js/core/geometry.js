var SEC3ENGINE = SEC3ENGINE || {};

	

(function(){
	function geometry(){

	}

	geometry.prototype = {
	}
SEC3ENGINE.geometry = geometry;
	
})();
(function() {
	function fullScreenQuad(){
		SEC3ENGINE.geometry.apply(this);
			return [ -1.0, 1.0,
					 1.0, 1.0,
					 1.0, -1.0,
					 -1.0, -1.0,
					 1.0, -1.0,
					 -1.0, 1.0 ];

		}
		
SEC3ENGINE.geometry.fullScreenQuad = fullScreenQuad;
})();