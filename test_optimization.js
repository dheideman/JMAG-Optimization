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
motor.power = 3000000; // target power, W
motor.speed = 5000; // RPM
motor.Vdc = 2000; // pole-to-ground DC voltage
motor.Vac = motor.Vdc/Math.sqrt(2); // AC effective voltage
motor.Vph = motor.Vac/Math.sqrt(3); // phase AC effective voltage
motor.Iph = motor.power/motor.Vac/Math.sqrt(3); // phase AC effective current
motor.p = 2; // magnetic pole-pair count
motor.m = 3; // electric phases (to be removed/hardcoded)
motor.lact = paramkeys.L_act;
motor.Iac = motor.ptarget/motor.Vac;
motor.sections = 2*motor.p; // number of sections motor is broken into; 1/sections = fraction of motor modelled


motor.aw = {};
motor.aw.kload = 0.6; // armature winding current loading
motor.aw.kpack = 0.5; // armature winding packing factor
motor.aw.wirename = "36-CM"; // serial number of wire (MgB2)
motor.aw.temp     = "20";    // temperature of wire [K]

motor.fc = {};
motor.fc.kload = 0.6; // field coil current loading
motor.fc.kpack = 0.3; // field coil packing factor
motor.fc.wirename = "SCS12050"; // serial number of wire (REBCO)
motor.fc.temp     = "20";       // temperature of wire [K]
motor.fc.alpha = 30; // field coil inner separation [electrical degrees]
motor.fc.beta  = 80; // field coil breadth [electrical degrees]

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


// make individual region objects
var aw_mgb2   = new MgB2Wire(motor.aw.wirename, motor.aw.temp, "B_aw_max");
var aw_I_peak = motor.Iph*Math.sqrt(2);
var armaturewindings = {};
	armaturewindings.uphase = new Coil(aw_mgb2, motor.aw.kload, motor.aw.kpack, aw_I_peak, new Region("aw_U", new Shape(motor.R3, motor.R4, "(-180/2/3/"+motor.p+")", "(180/2/3/"+motor.p+")",  motor.lact, "(180/"+motor.p+")")));
	armaturewindings.vphase = new Coil(aw_mgb2, motor.aw.kload, motor.aw.kpack, aw_I_peak, new Region("aw_V", new Shape(motor.R3, motor.R4, "(180/2/3/"+motor.p+")",  "(180/2/"+motor.p+")",    motor.lact, "(180/"+motor.p+")")));
	armaturewindings.wphase = new Coil(aw_mgb2, motor.aw.kload, motor.aw.kpack, aw_I_peak, new Region("aw_W", new Shape(motor.R3, motor.R4, "(-180/2/"+motor.p+")",   "(-180/2/3/"+motor.p+")", motor.lact, "(180/"+motor.p+")")));
	armaturewindings.mass = "("+armaturewindings.uphase.mass+"+"+armaturewindings.vphase.mass+"+"+armaturewindings.wphase.mass+")";

var fc_rebco = new REBCOWire("SCS12050", "20", "B_aw_max");
var fc_regions = [
		new Region("fc1", new Shape(motor.R1, motor.R2, "("+motor.p+"*"+motor.fc.alpha+")", "("+motor.p+"*"+motor.fc.beta+")",  motor.lact, "("+motor.sections+"*("+motor.fc.beta+"-"+motor.fc.alpha+"))")),
		new Region("fc2", new Shape(motor.R1, motor.R2, "(-"+motor.p+"*"+motor.fc.beta+")", "(-"+motor.p+"*"+motor.fc.alpha+")",motor.lact, "("+motor.sections+"*("+motor.fc.beta+"-"+motor.fc.alpha+"))"))
	];
var fc_Idc   = 10; // need to do something about this...
var fieldcoils = new FieldCoil(fc_rebco, motor.fc.kload, motor.fc.kpack, fc_Idc, fc_regions);

// Set up the components
var backyoke = new SimpleParametricComponent(new Region("by", new Shape(motor.R5, motor.R6, "(-180/2/"+motor.p+")", "(180/2/"+motor.p+")",  motor.lact, "(180/"+motor.p+")")), "50JN1300");

//masscomponents = [armaturewindings, fieldcoils, backyoke];

//optimization.GetObjectiveItem("Minimize Mass").SetExpression(generateMassExpression(masscomponents));


// Do some stuff with the armature windings
//debug.Print(armaturewindings.uphase.mass);
debug.Print(armaturewindings.mass);

//optimization.GetObjectiveItem("Print").SetExpression(L_aw);

// Run the current study
//if (!currentstudy.HasResult()) currentstudy.RunOptimization();



// Parametric Components object constructor (other than coils)
function SimpleParametricComponent(regions, materialkey) {
	this.regions = regions;
	this.materialkey = materialkey;

	// Select the specified material from the material library
	this.material = app.GetMaterialLibrary().GetMaterial(this.materialkey);
	var density = this.material.GetValue("Physical_MassDensity")/1000000000; // material density [kg/mm^3]

	// Create an expression for the mass of the component
	var mass = motor.sections+"*"+density+"*(";
	if (!regions.length) { // if "regions" is not an array
		mass += "("+this.regions.shape.l+")*("+this.regions.area+")";
	} else { // "regions" is an array
		for ( var i = 0; i < this.regions.length; i++) {
			mass += "("+this.regions[i].shape.l+")*("+this.regions[i].shape.area+")";
			if (i != this.regions.length-1) {
				mass += "+"; // add a "+" after each term which isn't the last one
			}
		}
	}
	this.mass = mass + ")";
}

// Region object
function Region(key, shape) {
	this.key   = key;
	this.shape = shape;
	this.area  = "A_"+this.key;
	
	// Eventually add in the creation of the region from the shape?
	this.selection = currentmodel.CreateSelection();
	this.selection.Detach(); // don't highlight the selection
	this.selection.SelectPart(this.key);
	
	// Create area measurement variable
//	currentstudy.SetMeasurementVariable(this.area, "Volume", this.selection);
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
function MgB2Wire(id, temp, B) {
	switch(id) {
		case "36-CM":
			this.ro = 0.41; // wire outer radius [mm]
			this.rsc = 0.3141592653589793; // sc filament section radius [mm] (not correct)
			this.rfilament  = 0.01011011001; // individual filament radius [mm] (not correct)
			this.nfilaments = 36;
			this.scfill     = 0.15; // superconductor fill fraction
			this.density    = 8960/1000000000; // density [kg/mm^3] (not correct)
			this.rbend      = 10;   // minimum bending radius [mm] (not correct)
		break;
	}
	
	switch(temp) {
		case "20": // 20 K
			this.jc = "1000000*(-15.38*pow(("+B+"),3)+314.8*pow(("+B+"),2)-2164*("+B+")+5105)"; //
		break;
	}
	
	this.area   = Math.PI*this.ro*this.ro;      // wire total cross-sectional area [mm^2]
	this.areasc = this.scfill*this.area;        // wire superconductor area [mm^2]
	this.ic     = this.areasc+"*("+this.jc+")"; // critical current of the wire [A]
}

// REBCO wire object constructor
function REBCOWire(id, temp, B) {
	switch(id) {
		case "SCS4050":
			this.wsc     = 4.0;   // width of superconductor layer [mm]
			this.tsc     = 0.001; // thickness of superconductor layer [mm]
			this.wwire   = 4.2;   // width of wire [mm]
			this.twire   = 0.30;  // thickness of wire [mm]
			this.density = 8960/1000000000;  // density [kg/mm^3] (not correct)
			this.rbend   = 5.5;   // minimum bending radius [mm]
			
		break;
		case "SCS12050":
			this.wsc     = 12.0;  // width of superconductor layer [mm]
			this.tsc     = 0.001; // thickness of superconductor layer [mm]
			this.wwire   = 12.2;  // width of wire [mm]
			this.twire   = 0.30;  // thickness of wire [mm]
			this.density = 8960/1000000000;  // density [kg/mm^3] (not correct)
			this.rbend   = 5.5;   // minimum bending radius [mm]
			
		break;
	}
	
	switch(temp) {
		case "30": // 30 K
			this.jc = 63750; //[A/mm^2] Assuming 2 T perpendicular, 33 K, Ic=765 A for SCS12050. From V. Lombardo 2010 "Critical Currents..." paper
//			this.jc = 42080; //[A/mm^2] Assuming 4 T perpendicular, 33 K, Ic=505 A for SCS12050. From V. Lombardo 2010 "Critical Currents..." paper
		break;
		case "20": // 20 K
			this.jc = 91080; //[A/mm^2] Assuming 2 T perpendicular, 22 K, Ic=1093 A for SCS12050. From V. Lombardo 2010 "Critical Currents..." paper
//			this.jc = 58920; //[A/mm^2] Assuming 4 T perpendicular, 22 K, Ic=707 A for SCS12050.  From V. Lombardo 2010 "Critical Currents..." paper
		break;
	}
	
	this.area   = this.wwire*this.twire;        // wire total cross-sectional area [mm^2]
	this.areasc = this.wsc*this.tsc;            // wire superconductor area [mm^2]
	this.ic     = this.areasc+"*("+this.jc+")"; // critical current of the wire [A]
}

// Coil object constructor
function Coil(wire, kload, kpack, Imax, region, rbend) {
	this.wire   = wire;   // wire material/characteristics
	this.kload  = kload;  // load factor (aka gamma)
	this.kpack  = kpack;  // packing factor (aka beta)
	this.Imax   = Imax;   // maximum current to run through the wire
	this.region = region; // coil region object
	this.rbend  = (rbend !== undefined) ? rbend : this.wire.rbend; // if not specified, use the value specified in wire
	//this.areakey  = areakey; // being moved into "Region" object

	// Parallel wire count and number of turns
	this.Iparallel = "("+this.kload +"*"+this.wire.ic+")";
	this.nparallel = "("+this.Imax+")/("+this.Iparallel+")";
	this.nturns    = "("+this.kpack+"*"+this.region.area+")/("+this.wire.area+"*"+this.nparallel+")";

	// Calculate wire length and mass
	var width  = "2*pi*"+this.region.shape.ravg+"*"+this.region.shape.dtheta+"/360";
	var lpitch = "2*pi*"+this.region.shape.ravg+"*"+this.region.shape.pitch+"/360";
	var coillength  = "2*("+this.region.shape.l+")+2*(("+lpitch+")-2*("+this.rbend+")-("+width+"))+2*pi*("+this.rbend+"+("+width+")/2)";
	this.wirelength = "("+coillength+")*("+this.nturns+")*("+this.nparallel+")";
	this.mass       = "("+this.kpack+")*("+coillength+")*("+this.region.area+")*("+this.wire.density+")";
}


// Field Coil object constructor
function FieldCoil(wire, kload, kpack, I, regions, rbend) {
	this.wire    = wire;    // wire material/characteristics
	this.kload   = kload;   // load factor (aka gamma)
	this.kpack   = kpack;   // packing factor (aka beta)
	this.I       = I;       // maximum current to run through the wire
	this.regions = regions; // coil region objects
	this.rbend   = (rbend !== undefined) ? rbend : this.wire.rbend; // if not specified, use the value specified in wire
	var region1  = this.regions[1];

	// Parallel wire count and number of turns
	this.Iparallel = "("+this.kload +"*"+this.wire.ic+")";
	this.nparallel = "("+this.I+")/("+this.Iparallel+")";
	this.nturns    = "("+this.kpack+"*"+this.region1.area+")/("+this.wire.area+"*"+this.nparallel+")";

	// Calculate wire length and mass
	var width  = "2*pi*"+this.region1.shape.ravg+"*"+this.region1.shape.dtheta+"/360";
	var lpitch = "2*pi*"+this.region1.shape.ravg+"*"+this.region1.shape.pitch+"/360";
	var coillength  = "2*("+shape.l+")+2*(("+lpitch+")-2*("+this.rbend+")-("+width+"))+2*pi*("+this.rbend+"+("+width+")/2)";
	this.wirelength = "("+coillength+")*("+this.nturns+")*("+this.nparallel+")";
	this.mass       = "("+this.kpack+")*("+coillength+")*("+this.region1.area+")*("+this.wire.density+")";
}
