var UI = [];

(function() {

//-------------------------------------------------------CONSTANTS/FIELDS:

//FIELDS:
	//Array of sliders, rates of incrementing
	var uiDiv;
	var numElements;

//-----------------------------------------------------------CONSTRUCTORS:

	/*
	 * Constructor
	 * String divName
	 */
	function ui(divID) {

		uiDiv = document.getElementById(divID);
		numElements = 0;
		// Init fields?
	}

//----------------------------------------------------------------METHODS:

	ui.prototype = {

		/*
		 * Strings: dib, value, 
		 */
		addElement : function() {
			// create new div within button/slider div
		},

		/*
		 * String label - To be displayed
		 * function onEvent - function to be executed upon slide
		 */
		addSlider : function(label, onEvent, value, min, max, step) {

			var newDiv = document.createElement("div");

			var newSlider = document.createElement("input");

			newSlider.type = "range";
			newSlider.id = label;
			newSlider.min = min;
			newSlider.max = max;
			newSlider.step = step;
			newSlider.value = value;

			newDiv.appendChild(newSlider);

			var newLabel = document.createElement("label");
			newLabel.innerText = label + "";
			newDiv.appendChild(newLabel);

			uiDiv.appendChild(newDiv);
			this.addCallback(newSlider, onEvent);
		},

		/*
		 * Adds sliders to HTML DOM
		 *
		 * callbackFunction MUST return a new label for the element
		 */ 
		addCallback : function(button, callbackFunction) {
		// Called by the init() function of any o
		// Appends HTML slider elements to DOM
			
			button.addEventListener("input", function(e){
				
					var newText = callbackFunction(e);

					if (newText == null) {

						alert("Callback function to update button does not return " +
							  "a new label!");
					}
					button.nextSibling.innerText = newText;
				});
		}
	}
	UI = ui;

})();