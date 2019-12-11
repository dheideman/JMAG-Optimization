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
paramkeys.t_by  = "t_by";
paramkeys.t_aw  = "t_aw";
paramkeys.t_fc  = "t_fc";
paramkeys.g_1   = "g_1";
paramkeys.g_2   = "g_2";

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
motor.aw.wirename = "KongMgB2"; // serial number of wire (MgB2)
motor.aw.temp     = "20";    // temperature of wire [K]

motor.fc = {};
motor.fc.kload = 0.6; // field coil current loading
motor.fc.kpack = 0.3; // field coil packing factor
motor.fc.wirename = "KongREBCO"; // serial number of wire (REBCO)
motor.fc.temp     = "Kong";       // temperature of wire [K]
motor.fc.alpha = 31.15; // field coil inner separation [electrical degrees]
motor.fc.beta  = 89; // field coil breadth [electrical degrees]

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
//currentstudy.SetCheckForTopologyChanges(false);

// Get the optimization table for the current study
var optimization = currentstudy.GetOptimizationTable();

// Set some parameter ranges
/*
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
	t_by = optimization.GetParametricItemByParameterName(paramkeys.t_by);
	t_by.SetMin(tmin);
	t_by.SetMax(maxradius/2);

	// g_1
	g_1 = optimization.GetParametricItemByParameterName(paramkeys.g_1);
	g_1.SetMin(g1min);
	g_1.SetMax(maxradius/3);

	// t_aw
	t_aw = optimization.GetParametricItemByParameterName(paramkeys.t_aw);
	t_aw.SetMin(tmin);
	t_aw.SetMax(maxradius/4);

	// g_2
	g_2 = optimization.GetParametricItemByParameterName(paramkeys.g_2);
	g_2.SetMin(g2min);
	g_2.SetMax(maxradius/4);

	// t_fc
	t_fc = optimization.GetParametricItemByParameterName(paramkeys.t_fc);
	t_fc.SetMin(tmin);
	t_fc.SetMax(maxradius/4);
*/

// make individual region objects
var aw_Bmax  = "B_aw_max";
var aw_f     = motor.speed*motor.p/60;
var aw_mgb2  = new MgB2Wire(motor.aw.wirename, motor.aw.temp, aw_Bmax, aw_f);
var aw_Ipeak = motor.Iph*Math.sqrt(2);

var aw_uphase = new ArmatureWinding(aw_mgb2, motor.aw.kload, motor.aw.kpack, aw_Ipeak, new Region(currentstudy, "aw_U", new Shape(motor.R3, motor.R4, "("+(-180/2/3/motor.p)+")", "("+(180/2/3/motor.p)+")",  motor.lact, "("+(180/motor.p)+")")));
var aw_vphase = new ArmatureWinding(aw_mgb2, motor.aw.kload, motor.aw.kpack, aw_Ipeak, new Region(currentstudy, "aw_V", new Shape(motor.R3, motor.R4, "("+(180/2/3/motor.p)+")",  "("+(180/2/motor.p)+")",    motor.lact, "("+(180/motor.p)+")")));
var aw_wphase = new ArmatureWinding(aw_mgb2, motor.aw.kload, motor.aw.kpack, aw_Ipeak, new Region(currentstudy, "aw_W", new Shape(motor.R3, motor.R4, "("+(-180/2/motor.p)+")",   "("+(-180/2/3/motor.p)+")", motor.lact, "("+(180/motor.p)+")")));
var armaturewindings = new ArmatureWindings([aw_uphase, aw_vphase, aw_wphase]);

// Get or create B_aw calculation definition
var Bawcalc = createCalculationDefinition(currentstudy, aw_Bmax, armaturewindings.selection, "max", "MagneticFluxDensity");

// Create a new B_aw_max response data variable if one does not already exist
if (currentstudy.HasParametricData(aw_Bmax)==false) {
	// Create response data from B_aw calculation
	var Bawparam = app.CreateResponseDataParameter(aw_Bmax);
		Bawparam.SetCalculationType("Maximum");
		Bawparam.SetCaseRangeType(0); // use all steps in all cases
		Bawparam.SetVariable(aw_Bmax);
	
	currentstudy.CreateParametricDataFromCalculation(aw_Bmax, Bawparam);
}


//var fc_rebco = new REBCOWire("SCS12050", "20", "B_aw_max");
var fc_rebco = new REBCOWire(motor.fc.wirename, motor.fc.temp, "2");
var fc_Idc   = fc_rebco.ic*motor.fc.kload; // need to do something about this...
var fieldcoils = new FieldCoil(fc_rebco, motor.fc.kload, motor.fc.kpack, fc_Idc, new Region(currentstudy, "fc1", new Shape(motor.R1, motor.R2, "("+motor.fc.alpha+"/"+motor.p+")", "("+motor.fc.beta+"/"+motor.p+")",  motor.lact, "("+motor.fc.beta+"+"+motor.fc.alpha+")/"+motor.p)));

// Set up the components
var backyoke = new SimpleParametricComponent(new Region(currentstudy, "by", new Shape(motor.R5, motor.R6, "("+(-180/2/motor.p)+")", "("+(180/2/motor.p)+")",  motor.lact, "("+(180/motor.p)+")")), "50JN1300");


// Do some stuff with the armature windings
//debug.Print(armaturewindings.uphase.mass);
//debug.Print(armaturewindings.acloss);


// Set motor torque measurement name
var motortorque = "AvgTorque";

// Create a new torque response data variable if one does not already exist
if (currentstudy.HasParametricData(motortorque)==false) {
	// Create response data from torque calculation
	var torqueparam = app.CreateResponseDataParameter(motortorque);
		torqueparam.SetCalculationType("IntegralAverage");
		torqueparam.SetCaseRangeType(0); // use all steps in all cases
		torqueparam.SetVariable(motortorque);
	
	currentstudy.CreateParametricDataFromTable("Torque", torqueparam);
}


/***************************/
/* Optimization Objectives */
/***************************/

// Create objective function expressions
var massobjectiveexp = motor.sections+"*("+armaturewindings.mass+"+"+fieldcoils.mass+"+"+backyoke.mass+")";
var lossobjectiveexp = motor.sections+"*("+armaturewindings.acloss+")"; // need to add in iron loss

// Set up optimization objectives
var massobjective = createOptimizationObjective(optimization, "Mass",   massobjectiveexp, "minimize", 1);
var lossobjective = createOptimizationObjective(optimization, "Losses", lossobjectiveexp, "minimize", 1);

/****************************/
/* Optimization Constraints */
/****************************/

// Set up mechanical power constraint
var powerconstraint = createOptimizationConstraint(optimization, "Mechanical Power", "("+2*Math.PI*motor.speed/60+"*"+motortorque+")", ">=", motor.power);



// Run the current study
//if (!currentstudy.HasResult()) currentstudy.RunOptimization();





/******************************************************************************/

/*************/
/* Functions */
/*************/

// Get or create a calculation definition (CalculationDefinition class) with the given name in the given study
function createCalculationDefinition(study, name, selection, calctype, resulttype) {
	// study:       study in which this calculation is to exist
	// name:        name of the calculation in JMAG-Designer (user-selected)
	// selection:   objective expression (user-defined)
	// calctype:    calculation type: e.g. "min", "max",...
	// resulttype:  what the calculation measures (e.g. "MagneticFluxDensity")

	var calculation = null;   // initialize calculation definition to null

	// Try to locate an existing calculation with the same name
	for (var i=0; i<study.NumCalculationDefinitions(); i++) {
		if (study.GetCalculationDefinition(i).GetName() == name) {
			if (calculation == null) {
				calculation = study.GetCalculationDefinition(i);
			} else {
				study.DeleteCalculationDefinition(i); // remove duplicate objective items
			}
		}
	}
	// Create a new expression item if one doesn't exist
	if (calculation == null) {
		study.CreateCalculationDefinition(name);
		calculation = study.GetCalculationDefinition(name);
	}

	// Fill in the calculation details
	calculation.ClearParts(); // clear parts in case some were left over
	calculation.AddSelected(selection);
	calculation.SetCalculationType(calctype);
	calculation.SetResultType(resulttype);

	return calculation;
}


// Get or create an optimization objective (ExpressionItem class) with the given name in the given optimization table
function createOptimizationObjective(opt, name, exp, type, weight) {
	// opt:     optimization table in which this optimization constraint is to exist
	// name:    name of the constraint in JMAG-Designer (user-selected)
	// exp:     objective expression (user-defined)
	// type:    objective function type: "minimize" or "maximize"
	// weight:  weight of this objective function

	var objectiveitem = null;   // initialize expression item to null

	// Try to locate an existing constraint with the same name
	for (var i=0; i<opt.NumObjectives(); i++) {
		if (opt.GetObjectiveItem(i).GetName() == name) {
			if (objectiveitem == null) {
				objectiveitem = opt.GetObjectiveItem(i);
			} else {
				opt.RemoveObjectiveItem(i); // remove duplicate objective items
			}
		}
	}
	// Create a new expression item if one doesn't exist
	if (objectiveitem == null) {
		opt.AddObjectiveItem(name);
		objectiveitem = opt.GetObjectiveItem(name);
	}

	// Set the expression, type, and value of the optimization constraint
	objectiveitem.SetExpression(exp);
	objectiveitem.SetType(type);
	objectiveitem.SetWeight(weight);

	return objectiveitem;
}

// Get or create an optimization constraint (ExpressionItem class) with the given name in the given optimization table
function createOptimizationConstraint(opt, name, exp, type, value) {
	// opt:     optimization table in which this optimization constraint is to exist
	// name:    name of the constraint in JMAG-Designer (user-selected)
	// exp:     constraint expression (user-defined)
	// type:    constraint expression type: ">=", "<=", or "=="
	// value:   expression value to which to compare

	var expressionitem = null;   // initialize expression item to null

	// Try to locate an existing constraint with the same name
	for (var i=0; i<opt.NumExpressions(); i++) {
		if (opt.GetExpressionItem(i).GetName() == name) {
			if (expressionitem == null) {
				expressionitem = opt.GetExpressionItem(i);
			} else {
				opt.RemoveExpressionItem(i); // remove duplicate expression items
			}
		}
	}
	// Create a new expression item if one doesn't exist
	if (expressionitem == null) {
		opt.AddExpressionItem(name);
		expressionitem = opt.GetExpressionItem(name);
	}

	// Set the expression, type, and value of the optimization constraint
	expressionitem.SetExpression(exp);
	expressionitem.SetType(type);
	expressionitem.SetValue(value);

	return expressionitem;
}


/****************/
/* Constructors */
/****************/

// Parametric Components object constructor (other than coils)
function SimpleParametricComponent(regions, materialkey) {
	this.regions = regions;
	this.materialkey = materialkey;

	// Select the specified material from the material library
	this.material = app.GetMaterialLibrary().GetMaterial(this.materialkey);
	var density = this.material.GetValue("Physical_MassDensity")/1000000000; // material density [kg/mm^3]

	// Create an expression for the mass of the component
	var mass = density+"*(";
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
function Region(study, key, shape) {
	this.study = study;
	this.key   = key;
	this.shape = shape;
	this.area  = "A_"+this.key;
	
	// Eventually add in the creation of the region from the shape?
	this.selection = currentmodel.CreateSelection();                         // need to explicitly pass the model object
	this.selection.Clear();  // make sure the selection is clear
	this.selection.Detach(); // don't highlight the selection
	this.selection.SelectPart(this.key);
	
	// Create area measurement variable
	this.study.SetMeasurementVariable(this.area, "Volume", this.selection);
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
function MgB2Wire(id, temp, B, f) {
	var  MU_0 = 0.000001257; // permeability of free space [H/m]
	this.B    = B;           // maximum magnetic field strength in wires [T]
	this.f    = f;           // electrical frequency [Hz]

	switch(id) {
		case "36-CM":
			this.ro = 0.41;             // wire outer radius [mm]
			this.rsc = this.ro;         // sc filament section radius [mm] (not correct)
			this.scfill     = 0.15;     // superconductor fill fraction
			this.nfilaments = 36;       // number of superconductor filaments
			this.rfilament  = this.ro*Math.sqrt(this.scfill/this.nfilaments); // individual filament radius [mm] (estimiate)
			this.density    = 8960/1000000000; // density [kg/mm^3] (not correct)
			this.rbend      = 10;       // minimum bending radius [mm] (not correct)
			this.ltwist     = 9;        // twist pitch [mm]
			this.sigmaet    = 1360000;  // effective transverse conductivity [S/m]
		break;
		case "KongMgB2":
			this.ro = 0.255;            // wire outer radius [mm]
			this.rsc = 0.193;           // sc filament section radius [mm]
			this.scfill     = 0.15;     // superconductor fill fraction
			this.nfilaments = 36;       // number of superconductor filaments
			this.rfilament  = 0.01646;  // individual filament radius [mm]
			this.density    = 7995/1000000000; // density [kg/mm^3] (not correct)
			this.rbend      = 60;       // minimum bending radius [mm] (not correct)
			this.ltwist     = 9;        // twist pitch [mm]
			this.sigmaet    = 1360000;  // effective transverse conductivity [S/m]
		break;
	}
	
	switch(temp) {
		case "20": // 20 K
			this.jc = "(-15.38*pow(("+this.B+"),3)+314.8*pow(("+this.B+"),2)-2164*("+this.B+")+5105)"; // [A/mm^2]
			this.jce = 1780; // Jc at 20 K, 2 T [A/mm^2]
		break;
	}
	
	this.area   = Math.PI*this.ro*this.ro;      // wire total cross-sectional area [mm^2]
	this.areasc = this.scfill*this.area;        // wire superconductor area [mm^2]
	this.ic     = this.areasc+"*("+this.jce+")"; // critical current of the wire [A]
	
	var w   = 2*Math.PI*this.f;                 // angular electrical frequency [rad/s]
	var tau = Math.pow(this.ltwist/(2*Math.PI*1000),2)*MU_0*this.sigmaet/2; // effective time constant of coupling currents [s]
	this.qc = "2*pow("+this.B+",2)*"+(Math.PI*w*w*tau/MU_0/(1+w*w*tau*tau)*Math.pow(this.rsc/this.ro,2)); // coupling loss per unit volume [W/m^3]
	this.qh = 16/(3*Math.PI)*Math.pow(this.rfilament/this.ro,2)*this.nfilaments*this.rfilament*this.f+"*("+this.B+")*("+this.jc+")*1000";
/*
	this.qc2 = function(f){
		// f: electrical frequency [Hz]
		var w = 2*Math.PI*this.f;               // angular electrical frequency [rad/s]
		var tau = Math.pow(this.ltwist/(2*Math.PI),2)*MU_0*this.sigmaet/2; // effective time constant of coupling currents [s]
		return "2*pow("+this.B+",2)*"+(Math.PI*w*w*tau/MU_0/(1+w*w*tau*tau));// *Math.pow(this.rfilament/this.ro,2); // coupling loss per unit volume [W/m^3]
	}
*/
}

// REBCO wire object constructor
function REBCOWire(id, temp, B, f) {
	var  MU_0 = 0.000001257; // permeability of free space [H/m]
	this.B    = B;           // maximum magnetic field strength in wires [T]
	this.f    = f;           // electrical frequency [Hz]

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
		case "KongREBCO":
			this.wsc     = 12.0;  // width of superconductor layer [mm]
			this.tsc     = 0.001; // thickness of superconductor layer [mm]
			this.wwire   = 12.2;  // width of wire [mm]
			this.twire   = 0.30;  // thickness of wire [mm]
			this.density = 8940/1000000000;  // density [kg/mm^3]
			this.rbend   = 192.2;   // =0.7101*ro //minimum bending radius [mm]
		break;
	}
	
	switch(temp) {
		case "30": // 30 K
			this.jce = 63750; //[A/mm^2] Assuming 2 T perpendicular, 33 K, Ic=765 A for SCS12050. From V. Lombardo 2010 "Critical Currents..." paper
//			this.jce = 42080; //[A/mm^2] Assuming 4 T perpendicular, 33 K, Ic=505 A for SCS12050. From V. Lombardo 2010 "Critical Currents..." paper
		break;
		case "20": // 20 K
			this.jce = 91080; //[A/mm^2] Assuming 2 T perpendicular, 22 K, Ic=1093 A for SCS12050. From V. Lombardo 2010 "Critical Currents..." paper
//			this.jce = 58920; //[A/mm^2] Assuming 4 T perpendicular, 22 K, Ic=707 A for SCS12050.  From V. Lombardo 2010 "Critical Currents..." paper
		break;
		case "Kong": // 4 T, 20 K, Kong Weilu
			this.jce = 58920; //[A/mm^2] Assuming 4 T perpendicular, 22 K, Ic=707 A for SCS12050.
		break;
	}
	
	this.area   = this.wwire*this.twire;        // wire total cross-sectional area [mm^2]
	this.areasc = this.wsc*this.tsc;            // wire superconductor area [mm^2]
	this.ic     = this.areasc+"*("+this.jce+")"; // critical current of the wire [A]
}

// Armature Winding object constructor
function ArmatureWinding(wire, kload, kpack, Imax, region, rbend) {
	this.wire   = wire;   // wire material/characteristics
	this.kload  = kload;  // load factor (aka gamma)
	this.kpack  = kpack;  // packing factor (aka beta)
	this.Imax   = Imax;   // maximum current to run through the wire
	this.region = region; // coil region object
	this.rbend  = (rbend !== undefined) ? rbend : this.wire.rbend; // if not specified, use the value specified in wire

	// Parallel wire count and number of turns
	this.Iparallel = "("+this.kload +"*"+this.wire.ic+")";
	this.nparallel = "("+this.Imax+")/("+this.Iparallel+")";
	this.nturns    = "("+this.kpack+"*"+this.region.area+")/("+this.wire.area+"*"+this.nparallel+")";

	// Calculate wire length
	var width  = "2*pi*"+this.region.shape.ravg+"*"+this.region.shape.dtheta+"/360";
	var lpitch = "2*pi*"+this.region.shape.ravg+"*"+this.region.shape.pitch+"/360";
	var coillength  = "2*("+this.region.shape.l+")+2*(("+lpitch+")-2*("+this.rbend+")-("+width+"))+2*pi*("+this.rbend+"+("+width+")/2)";
	this.wirelength = "("+coillength+")*("+this.nturns+")*("+this.nparallel+")";

	// Calculate mass
	this.mass       = "("+this.kpack+")*("+coillength+")*("+this.region.area+")*("+this.wire.density+")/2"; // divide by 2 because only 1/2 of the coil is in the modelled segment

	// Calculate coupling losses
	var lossc       = "("+this.wirelength+")/2*("+this.wire.area+")/(1e+9)*("+this.wire.qc+")"; // divide by 2 because only 1/2 of the coil is in the modelled segment

	// Calculate hysteresis losses
	var lossh       = "("+this.wirelength+")/2*("+this.wire.area+")/(1e+9)*("+this.wire.qh+")"; // divide by 2 because only 1/2 of the coil is in the modelled segment

	this.acloss     = "("+lossc+"+"+lossh+")";
}

// Armature Windings group object constructor
function ArmatureWindings(aws) {
	this.aws = aws;
	this.uphase = aws[0];
	this.vphase = aws[1];
	this.wphase = aws[2];
	
	this.selection = currentmodel.CreateSelection();
	this.selection.Detach(); // don't highlight the selection
	var mass   = "";
	var acloss = "";
	for ( var i = 0; i < this.aws.length; i++) {
		// Add each winding's selection
		this.selection.Add(this.aws[i].region.selection);
		mass   += "("+this.aws[i].mass+")";
		acloss += "("+this.aws[i].acloss+")";
		if (i != this.aws.length-1) {
			mass   += "+"; // add a "+" after each term which isn't the last one
			acloss += "+";
		}
	}
	this.mass   = mass;
	this.acloss = acloss;
}

// Field Coil object constructor
function FieldCoil(wire, kload, kpack, I, region1, rbend) {
	this.wire    = wire;    // wire material/characteristics
	this.kload   = kload;   // load factor (aka gamma)
	this.kpack   = kpack;   // packing factor (aka beta)
	this.I       = I;       // maximum current to run through the wire
	this.region1 = region1; // original field coil region object
	this.region2 = new Region(region1.study, "fc2", new Shape(region1.shape.ri, region1.shape.ro, "-("+region1.shape.a1+")", "-("+region1.shape.a0+")", region1.shape.l, region1.shape.pitch)); // inverted copy region
	this.rbend   = (rbend !== undefined) ? rbend : this.wire.rbend; // if not specified, use the value specified in wire

	// Parallel wire count and number of turns
	this.Iparallel = "("+this.kload +"*"+this.wire.ic+")";
	this.nparallel = "("+this.I+")/("+this.Iparallel+")";
	this.nturns    = "("+this.kpack+"*"+region1.area+")/("+this.wire.area+"*"+this.nparallel+")";

	// Calculate wire length and mass
	var width  = "2*pi*"+this.region1.shape.ravg+"*"+this.region1.shape.dtheta+"/360";
	var lpitch = "2*pi*"+this.region1.shape.ravg+"*"+this.region1.shape.pitch+"/360";
	var coillength  = "2*("+this.region1.shape.l+")+2*(("+lpitch+")-2*("+this.rbend+")-("+width+"))+2*pi*("+this.rbend+"+("+width+")/2)";
	this.wirelength = "("+coillength+")*("+this.nturns+")*("+this.nparallel+")";
	this.mass       = "("+this.kpack+")*("+coillength+")*("+this.region1.area+")*("+this.wire.density+")";
}
