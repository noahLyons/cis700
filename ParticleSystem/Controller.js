//-----------------------------------------------------------GLOBALS:

var modelInstance = {};

//---------------------------------------------------------FUNCTIONS:

function runGame(){
	//create new game
	modelInstance = new GameModel();

	setInterval("modelInstance.step(modelInstance)", 16);
	//init window
	webGLStart(modelInstance);
	//set game looping	
}

window.onkeydown = function(e) {

	var key = e.keyCode ? e.keyCode : e.which;

	modelInstance.moveThelma(key);
}