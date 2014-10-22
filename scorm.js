/*
Elucidat SCORM API wrapper - https://github.com/elucidat/eluciat-scorm-wrapper/

Licensed under the MIT license

Copyright (c) 2013 Elucidat Ltd

Version 1.0.1

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
var Debug_API = function () {};
// 2004 functions
Debug_API.prototype.Initialize = function () { console.log(' └ Debug_api:Initialize'); return true; };
Debug_API.prototype.Terminate = function () { console.log(' └ Debug_api:Terminate'); return true; };
Debug_API.prototype.GetValue = function (nam) { return ''; };
Debug_API.prototype.SetValue = function (nam,val) { console.log(' ┌ Debug_api:SetValue: '+nam+'='+val); return ''; };
Debug_API.prototype.Commit = function () { console.log(' └ Debug_api:Commit'); return true; };
Debug_API.prototype.GetLastError = function () { return 0; };
Debug_API.prototype.GetErrorString = function (code) { return ""; };
Debug_API.prototype.GetDiagnostic = function (code) { return ""; };
// 1.2 functions
Debug_API.prototype.LMSInitialize = function () { console.log(' └ Debug_api:LMSInitialize'); return true; };
Debug_API.prototype.LMSFinish = function () { console.log(' └ Debug_api:LMSFinish'); return true; };
Debug_API.prototype.LMSGetValue = function (nam) { return ''; };
Debug_API.prototype.LMSSetValue = function (nam,val) { console.log(' ┌ Debug_api:LMSSetValue: '+nam+'='+val); return ''; };
Debug_API.prototype.LMSCommit = function () { console.log(' └ Debug_api:Commit'); return true; };
Debug_API.prototype.LMSGetLastError = function () { return 0; };
Debug_API.prototype.LMSGetErrorString = function (code) { return ""; };
Debug_API.prototype.LMSGetDiagnostic = function (code) { return ""; };

var Scorm = function (options) {
	this.options = $.extend({}, {
		debug_mode: '2004'
    }, options);

	this.scorm_interface = null;
	// default used by debug interface
	this.mode = null;
	this.active = false;
	this.objectives = 0;
	this.interactions = 0;
	this.start_time = new Date().getTime();
	this.has_score = false;
	this.is_debug = false;

	// we need to search window, window.parent(s) and window.top.opener for either API or API_1484_11
	this._search_for_api ( window );
	
	if (this.scorm_interface == null) {
		this.mode = this.options.debug_mode;
		this.is_debug = true;
		console.log('LMS not present - Created SCORM '+this.mode+' Debug interface.'); 
		this.scorm_interface = new Debug_API();
	} else {
		// now test to see if the interface is 1.2 or 2004
		if ("LMSCommit" in this.scorm_interface)
			this.mode = "1.2";
		else
			this.mode = "2004";
		console.log('Found SCORM '+this.mode+' interface.'); 
	}
};
Scorm.prototype._format_time = function ( session_time ) {
	function pad(num, size) {
    	var s = "0000" + new String(Math.round(num));
    	return s.substr(s.length-size);
	}
	// convert session time to seconds
	session_time /= 1000;

	// scorm 2004
	if (this.mode == '2004')
		return Math.round(session_time);

	// split out the time parts
	var hours = Math.floor(session_time / 3600);
		session_time = session_time - (hours * 3600);
	var minutes = Math.floor(session_time / 60);
	var session_time = session_time - (minutes * 60);

	//if (this.mode == '2004') {
		// scorm 2004 - this is kept for now in case - http://www.ostyn.com/standards/scorm/samples/ISOTimeForSCORM.htm
	//	return 'PT'+hours+'H'+minutes+'M'+session_time+'S';
	//} else {
	// scorm 1.2
	return pad(hours,4)+':'+pad(minutes,2)+':'+pad(session_time,2);
	//}

}
Scorm.prototype._search_for_api = function ( win ) {
	try {
		while (win != null && this.scorm_interface == null) {
			// record the API if we've found it
			if (win.API_1484_11)
				this.scorm_interface = win.API_1484_11;
			else if (win.API)
				this.scorm_interface = win.API;
			
			// now branch off to look at the window opener of this window.
			if (win.opener != null && !win.opener.closed)
				this._search_for_api ( win.opener );

			// if at the top - that's the end
			if (win == win.parent)
				win = null;
			else
				// up up up the tree
				win = win.parent;
		}
	} catch(err) {
		return null;
  	}
};
/* general API calls */
Scorm.prototype.Check = function () {
	var error = 0, error_string = '';
	if (this.mode == '2004') {
		error = parseInt(this.scorm_interface.GetLastError()); 
		if (error) error_string = 'Error ('+error+'): '+this.scorm_interface.GetErrorString(error);
	} else if (this.mode == '1.2') {
		error = parseInt(this.scorm_interface.LMSGetLastError()); 
		if (error) error_string = 'Error ('+error+'): '+this.scorm_interface.LMSGetErrorString(error);
	}
	return { 'code': error, 'description': error_string };
};
Scorm.prototype.Initialize = function () { 
	console.log('Scorm:Initialize');
	if (this.mode == '2004') {
		this.scorm_interface.Initialize('');
	} else if (this.mode == '1.2') {
		this.scorm_interface.LMSInitialize('');
	}
	// check for errors
	if (this.Check()['code']==0) this.active = true;

	// mark course as incomplete if it has not been attempted
	var status = this.GetCompletionStatus();
	if (status == 'not attempted' || !status)
		this.SetIncomplete();

	return this.active;
};
Scorm.prototype.Terminate = function () { 
	console.log('Scorm:Terminate');
	if (this.mode == '2004') {
		this.scorm_interface.Terminate('');
	} else if (this.mode == '1.2') {
		this.scorm_interface.LMSFinish('');
	}
	// check for errors
	if (this.Check()['code']==0) this.active = false;
};
Scorm.prototype.Deactivate = function () { 
	console.log('Scorm:Deactivate');
	this.active = false;
};
Scorm.prototype.SetValue = function ( varname, value ) { 
	if (this.active) {
		var checkback;
		if (this.mode == '2004') {
			this.scorm_interface.SetValue( varname, value );
			checkback = this.scorm_interface.GetValue( varname );
		} else if (this.mode == '1.2') {
			this.scorm_interface.LMSSetValue( varname, value );
			checkback = this.scorm_interface.LMSGetValue( varname );
		}
		// make sure that worked
		var error = this.Check();
		console.log('Scorm:SetValue: '+varname+'='+value+'? '+(error['code']?error['description']:'Echo:'+checkback));
		return error['code'];
	}
};
Scorm.prototype.GetValue = function ( varname ) { 
	if (this.active) {
		var val;
		if (this.mode == '2004') val = this.scorm_interface.GetValue( varname );
		else if (this.mode == '1.2') val = this.scorm_interface.LMSGetValue( varname );
		console.log('Scorm:GetValue: '+varname+'='+val);
		return val;
	}
};
Scorm.prototype.Commit = function () { 
	console.log('Scorm:Commit');
	if (this.mode == '2004') {
		return this.scorm_interface.Commit('');
	} else if (this.mode == '1.2') {
		return this.scorm_interface.LMSCommit('');
	}
};
/* specific actions */
/* being friendly */
Scorm.prototype.GetLearnerName = function () {
	if (this.mode == '2004')
		return this.GetValue('cmi.learner_name');
	else if (this.mode == '1.2')
		return this.GetValue('cmi.core.student_name');
};
/* being friendly */
Scorm.prototype.GetLearnerID = function () {
	if (this.mode == '2004')
		return this.GetValue('cmi.learner_id');
	else if (this.mode == '1.2')
		return this.GetValue('cmi.core.student_id');
};
/* Browsing History */
Scorm.prototype.GetLocation = function () {
	if (this.mode == '2004')
		return this.GetValue('cmi.location');
	else if (this.mode == '1.2')
		return this.GetValue('cmi.core.lesson_location');
};
Scorm.prototype.SetLocation = function ( url ) { 
	if (this.mode == '2004')
		return this.SetValue('cmi.location', url);
	else if (this.mode == '1.2')
		return this.SetValue('cmi.core.lesson_location', url);
};
/* Suspend data */
Scorm.prototype.GetSuspendData = function () {	
	return this.GetValue('cmi.suspend_data');
};
Scorm.prototype.SetSuspendData = function ( data ) { 
	return this.SetValue('cmi.suspend_data', data);
};
/* Progress */
Scorm.prototype.GetProgress = function () { 
	if (this.mode == '2004')
		return this.GetValue('cmi.progress_measure');
};
Scorm.prototype.SetProgress = function ( progress ) { 
	if (this.mode == '2004')
		return this.SetValue('cmi.progress_measure', progress);
};
/* Completion Threshold */
Scorm.prototype.GetCompletionThreshold = function () { 
	if (this.mode == '2004')
		return this.GetValue('cmi.completion_threshold');
	return false;
};
Scorm.prototype.SetCompletionThreshold = function ( threshold ) { 
	if (this.mode == '2004')
		this.SetValue('cmi.completion_threshold', threshold);
};
/* Score Threshold */
Scorm.prototype.GetScoreThreshold = function () { 
	if (this.mode == '2004')
		return this.GetValue('cmi.progress_measure');
	return false;
};
Scorm.prototype.SetScoreThreshold = function ( threshold ) { 
	if (this.mode == '2004')
		this.SetValue('cmi.scaled_passing_score', threshold);
};
Scorm.prototype.SetSessionTime = function ( session_time ) { // session_time in javascript format - ie - milliseconds
	if (!session_time)
		session_time = ( new Date().getTime() ) - this.start_time;
	if (this.mode == '2004')
		return this.SetValue('cmi.session_time', this._format_time( session_time ) );
	else if (this.mode == '1.2')
		return this.SetValue('cmi.core.session_time', this._format_time( session_time ) );
};
Scorm.prototype.GetTotalTime = function () { 
	if (this.mode == '2004')
		return this.GetValue('cmi.total_time');
	else if (this.mode == '1.2')
		return this.GetValue('cmi.core.total_time');
	return false;
};
Scorm.prototype.GetCompletionStatus = function () { 
	if (this.mode == '2004') {
		// 2004 doesn't need any fixing
		return this.GetValue('cmi.completion_status');
		
	} else if (this.mode == '1.2') {
		// passed and failed are not relevant here - they are just in this case synonyms for completed and incomplete
		var status = this.GetValue('cmi.core.lesson_status');
		if (status == 'passed' || status == 'failed') return 'completed';
		return status;
	}
};
Scorm.prototype.SetCompletionStatus = function ( v ) { 
	// and send
	if (this.mode == '2004')
		return this.SetValue('cmi.completion_status', v);
	else if (this.mode == '1.2')
		return this.SetValue('cmi.core.lesson_status', v);
};
Scorm.prototype.GetResult = function () { 
	if (this.mode == '2004') {
		// 2004 doesn't need any fixing
		return this.GetValue('cmi.success_status');
	} else if (this.mode == '1.2') {
		// passed and failed are not relevant here - they are just in this case synonyms for completed and incomplete
		var status = this.GetValue('cmi.core.lesson_status');
		if (status == 'passed' || status == 'failed') return status;
		return 'unknown';
	}
};
Scorm.prototype.SetResult = function ( outcome ) { 
	if (this.mode == '2004') {
		if (outcome == 'passed') {
			this.SetValue('cmi.success_status','passed');
		} else if (outcome == 'failed') {
			this.SetValue('cmi.success_status','failed');
		}
	} else if (this.mode == '1.2') {
		// complete and outcome are stored in the same variable in 1.2, so we just use completion status
		if (outcome == 'passed')
			this.SetCompletionStatus('passed');
		else if (outcome == 'failed') 
			this.SetCompletionStatus('failed');
	}
	// this one is important so save
	this.Commit();
};
/* Complete the course - maybe unnecessary */
Scorm.prototype.SetPassed = function () { 
	// set score
	this.SetResult( 'passed' );
};
Scorm.prototype.SetFailed = function () { 
	// set score
	this.SetResult( 'failed' );
};
Scorm.prototype.SetCompleted = function () { 
	// set score
	this.SetCompletionStatus( 'completed' );
};
Scorm.prototype.SetIncomplete = function () { 
	// set score
	this.SetCompletionStatus( 'incomplete' );
};

Scorm.prototype.SetScore = function (score, min, max) { 
	this.has_score = true;
	if (this.mode == '2004') {
		this.SetValue('cmi.score.raw',score);
		this.SetValue('cmi.score.scaled',1/max*score);
		this.SetValue('cmi.score.min',min);
		this.SetValue('cmi.score.max',max);
	} else if (this.mode == '1.2') {
		this.SetValue('cmi.core.score.raw',score);
		this.SetValue('cmi.core.score.min',min);
		this.SetValue('cmi.core.score.max',max);
	}
};
/* record an objective in the course */
Scorm.prototype.SetObjective = function ( objective_name, outcome, score, min, max ) { 
	this.SetValue('cmi.objectives.'+this.objectives+'.id', objective_name);
	this.SetValue('cmi.objectives.'+this.objectives+'.score.raw', (score?score:0));
	this.SetValue('cmi.objectives.'+this.objectives+'.score.min', (min?min:0));
	this.SetValue('cmi.objectives.'+this.objectives+'.score.max', (max?max:100));
	if (this.mode == '2004') {
		this.SetValue('cmi.objectives.'+this.objectives+'.completion_status','completed');
		if (outcome=='passed'||outcome=='failed') this.SetValue('cmi.objectives.'+this.objectives+'.success_status', outcome);
	} else {
		if (outcome=='passed'||outcome=='failed') this.SetValue('cmi.objectives.'+this.objectives+'.status', outcome);
		else this.SetValue('cmi.objectives.'+this.objectives+'.status', 'completed');
	}
	// increment
	this.objectives++;
};