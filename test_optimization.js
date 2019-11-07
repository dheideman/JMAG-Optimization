/*
*+++++ JMAG-Designer SCRIPT FILE
=====================================================================
Name: test_optimization.js
Menu-en: Test_Optimization
Type: JScript
Create: October 31, 2019 JSOL Corporation
Comment-en: 
=====================================================================
*/
// Get JMAG-Designer application
var app = new ActiveXObject("designer.Application");

var paramkeys = {}
paramkeys.R_o   = "R_outer";
paramkeys.L_act = "L_active";
paramkeys.t_by  = "t_by@Variables";
paramkeys.t_aw  = "t_aw@Variables";
paramkeys.t_fc  = "t_fc@Variables";
paramkeys.g_1   = "g_1@Variables";
paramkeys.g_2   = "g_2@Variables";

// Define some motor characteristics
var motor = {};
motor.ptarget = 3000000; // target power, W
motor.speed = 5000; // RPM
motor.Vdc = 2000; // pole-to-ground DC voltage
motor.p = 2; // magnetic pole-pair count
motor.m = 3; // electric phases

// convert parameter keys to motor radii
motor.R6 = paramkeys.R_o;
motor.R5 = motor.R6+"-"+paramkeys.t_by;
motor.R4 = motor.R5+"-"+paramkeys.g_1;
motor.R3 = motor.R4+"-"+paramkeys.t_aw;
motor.R2 = motor.R3+"-"+paramkeys.g_2;
motor.R1 = motor.R2+"-"+paramkeys.t_fc;


var tmin = 1;	// mm
var maxradius = 300; // mm
var g1min = 50; // mm
var g2min = 20; // mm

// Define MgB2 wire characteristics
var mgb2 = {};
	mgb2.ro = 0.41; // mm
	mgb2.nfilaments = 36;
	mgb2.scfill = 0.15; // superconductor fill fraction

// Get the current model
var currentmodel = app.GetCurrentModel();

// Get the current study
var currentstudy = app.GetCurrentStudy();

// Get the optimization table for the current study
var optimization = currentstudy.GetOptimizationTable();

// Set some parameter ranges

	// R_outer
	R_outer = optimization.GetParametricItemByParameterName(paramkeys.R_o);
	R_outer.SetMin(maxradius);
	R_outer.SetMax(maxradius);

	// L_active
	L_active = optimization.GetParametricItemByParameterName(paramkeys.L_act);
	L_active.SetMin(10);
	L_active.SetMax(1000);

	// J_aw
	J_aw = optimization.GetParametricItemByParameterName("J_aw");
	J_aw.SetMin(1780000000);
	J_aw.SetMax(5105000000);

	// t_by
	t_by = optimization.GetParametricItemByParameterName("t_by@Variables");
	t_by.SetMin(tmin);
	t_by.SetMax(maxradius/2);

	// g_1
	g_1 = optimization.GetParametricItemByParameterName("g_1@Variables");
	g_1.SetMin(g1min);
	g_1.SetMax(maxradius/3);

	// t_aw
	t_aw = optimization.GetParametricItemByParameterName("t_aw@Variables");
	t_aw.SetMin(tmin);
	t_aw.SetMax(maxradius/4);

	// g_2
	g_2 = optimization.GetParametricItemByParameterName("g_2@Variables");
	g_2.SetMin(g2min);
	g_2.SetMax(maxradius/4);

	// t_fc
	t_fc = optimization.GetParametricItemByParameterName("t_fc@Variables");
	t_fc.SetMin(tmin);
	t_fc.SetMax(maxradius/4);


// Calculate the number of turns to use
//nawparallel = Math.ceiling();


// Set up the components

var armaturewindings = new ParametricComponent("aw", "L_active", ["W-","U+","V-"], "Copper");
var fieldcoils = new ParametricComponent("fc", "L_active", ["Field Coil +", "Field Coil -"], "Copper");
var backyoke = new ParametricComponent("by", "L_active", ["Back Yoke"], "50JN1300");

masscomponents = [armaturewindings, fieldcoils, backyoke];

optimization.GetObjectiveItem("Minimize Mass").SetExpression(generateMassExpression(masscomponents));


// Do some stuff with the armature windings
awmgb2 = new MgB2("36-CM", "20", "B_leak");
awshape = new Shape(motor.R3, motor.R4, 0, "180/"+motor.p+"/"+motor.m, motor.lact, "180/"+motor.p);
armaturewindings.coil = new Coil(awmgb2,0.6, 0.3, 10, 6000, awshape, armaturewindings.areakey);

//optimization.GetObjectiveItem("Print").SetExpression(L_aw);
//(2*(L_active) + 2*((2*pi*((R_o@Variables - t_by@Variables - g_1@Variables+R_o@Variables - t_by@Variables - g_1@Variables-t_aw@Variables)/2)*(180/p)/360)-2*(10)-(2*pi*(30/360)*(R_o@Variables - t_by@Variables - g_1@Variables+R_o@Variables - t_by@Variables - g_1@Variables-t_aw@Variables)/2)) + 2*pi*(10+(2*pi*(30/360)*(R_o@Variables - t_by@Variables - g_1@Variables+R_o@Variables - t_by@Variables - g_1@Variables-t_aw@Variables)/2)/2))*((0.3*A_aw)/(0.5281017250684441*(6000)/(0.5281017250684441*0.6*1000000*0.15*(-15.38*pow(B_leak,3) + 314.8*pow(B_leak,2) - 2164*B_leak + 5105))))*((6000)/(0.5281017250684441*0.6*1000000*0.15*(-15.38*pow(B_leak,3) + 314.8*pow(B_leak,2) - 2164*B_leak + 5105)))

// Run the current study
//if (!currentstudy.HasResult()) currentstudy.RunOptimization();


function generateMassExpression(components) {
	var mexp = "";
	
	// Go through the components and add their mass expressions to the total mass expression
	for ( var i = 0; i < components.length; i++ ) {
		mexp += "("+components[i].massexp+")";
		if (i < components.length - 1) {
			mexp += "+";      // only add "+" between terms (not after the last term)
		}
	}
	
	// Return the full string
	return mexp;
}

// Parametric Component object constructor
function ParametricComponent(key, lengthkey, partkeys, materialkey) {
	this.key = key;
	this.areakey = "A_"+this.key;
	this.lengthkey = lengthkey;

	// Select all the parts which make up this component
	this.partkeys = partkeys;
	this.parts = currentmodel.CreateSelection();
	this.parts.Detach();	// don't highlight the selection
	for ( var i = 0; i < this.partkeys.length; i++) {
		this.parts.SelectPart(this.partkeys[i]);
	}

	// Select the specified material from the material library
	this.materialkey = materialkey;
	this.material = app.GetMaterialLibrary().GetMaterial(this.materialkey);

	// Create an expression for the mass of the component
	//     2*p:      only one pole of the motor is modelled, so this fills in the rest
	//     /1000000: unit conversion: the area is measured in mm^2, while the density of materials is given in kg/m^3
	this.massexp = "2*p*"+this.lengthkey+"*"+this.areakey+"/1000000*"+this.material.GetValue("Physical_MassDensity");

	// Create area measurement variable
	currentstudy.SetMeasurementVariable(this.areakey, "Volume", this.parts);
}

// Position and Size, polar coordinates
function Shape(ri, ro, a0, a1, l, pitch){
	this.ri     = ri; // inside radius (motor coordinates) [mm]
	this.ro     = ro; // outside radius (motor coordinates) [mm]
	this.a0     = a0; // start angle (typically 0 or alpha) [mechanical degrees]
	this.a1     = a1; // end angle (typically width or beta) [mechanical degrees]
	this.l      = l;  // axial length (motor coordinates) [mm]
	this.pitch  = pitch; // center-to-center angle of coil [mechanical degrees]

	this.ravg   = "("+this.ro+"+"+this.ri+")/2"; // average radius (motor coordinates) [mm]
	this.dtheta = (this.a0==0) ? this.a1 : "("+this.a1+"-"+this.a0+")"; // width (ignore a0 if it is 0) [mechanical degrees]
}

// MgB2 wire object constructor
function MgB2(id, temp, B) {
	switch(id) {
		case "36-CM":
			this.ro = 0.41; // wire outer radius [mm]
			this.rsc = 0.3141592653589793; // sc filament section radius [mm] (not correct)
			this.rfilament = 0.01011011001; // individual filament radius [mm] (not correct)
			this.nfilaments = 36;
			this.scfill = 0.15; // superconductor fill fraction
			this.density = 8960; // density [kg/m^3] (not correct)
			
			switch(temp) {
				case "20": // 20 K
					this.jcexp = "1000000*"+this.scfill+"*(-15.38*pow("+B+",3)+314.8*pow("+B+",2)-2164*"+B+"+5105)"; 
					break;
			}
			break;
	}
	
	this.area = Math.PI*this.ro*this.ro;
}

// Coil object constructor
function Coil(wire, kload, kpack, rb, I, shape, areakey) {
	this.wire  = wire;  // wire material/characteristics
	this.kload = kload; // load factor (aka gamma)
	this.kpack = kpack; // packing factor (aka beta)
	this.rb    = rb;    // minimum bending radius [mm]
	this.shape = shape; // shape object
	this.areakey = areakey;

	this.nparallelexp = "("+I+")/("+this.wire.area+"*"+this.kload +"*"+this.wire.jcexp+")";
	this.nturnsexp    = "("+this.kpack+"*"+this.areakey+")/("+this.wire.area+"*"+this.nparallelexp+")";

	// Calculate wire length
	width  = "2*pi*"+shape.ravg+"*"+shape.dtheta+"/360";
	lpitch = "2*pi*"+shape.ravg+"*"+shape.pitch+"/360";
	this.wirelength = "(2*("+shape.l+")+2*(("+lpitch+")-2*("+this.rb+")-("+width+"))+2*pi*("+this.rb+"+("+width+")/2))*("+this.nturnsexp+")*("+this.nparallelexp+")";
}
