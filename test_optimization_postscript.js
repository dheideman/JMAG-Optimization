/*
*+++++ JMAG-Designer SCRIPT FILE
=====================================================================
Name: test_optimization_postscript.js
Menu-en: Test_Optimization_PostScript
Type: JScript
Create: November 03, 2019 JSOL Corporation
Comment-en: 
=====================================================================
*/
var app = designer

// Get the current model
var currentmodel = app.GetCurrentModel();

// Get the current study
var currentstudy = app.GetCurrentStudy();

// Get the current case of the study
var currentcase  = currentstudy.GetCurrentCase();

// For testing: set the "CaseNumber" variable to the case number
currentstudy.SetVariable("CaseNumber",currentcase);

// Okay, that didn't work.  I think postscripts are more useful for making reports than making calculations...
