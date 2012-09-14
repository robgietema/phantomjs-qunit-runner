/**
 * Qt+WebKit powered (mostly) headless test runner using Phantomjs
 *
 * Run with:
 *  phantomjs qunit-runner.js [url-of-testsuite] [classname] [logfile]
 *
 * E.g.
 *      phantomjs qunit-runner.js http://localhost/test myclass log.xml
 *
 * @author Rob Gietema
 * @licstart  The following is the entire license notice for the JavaScript
 *            code in this page.
 *
 * Copyright (C) 2011-2012 Four Digits
 *
 * @licend  The above is the entire license notice for the JavaScript code in
 *          this page.
 * @version 0.1
 */

/*global require: false, phantom: false, console: false */
/*jshint white: true, browser: true, onevar: true, undef: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: false, maxlen: 80, maxerr: 9999 */

var fs = require('fs');
var url = phantom.args[0];
var classname = phantom.args[1];
var logfile = phantom.args[2];
var page = require('webpage').create();

var startTime = new Date();

function printTime(msg) {
    console.log(msg + " on " + (new Date().getTime() - startTime) / 1000);
}

function finished() {
    return page.evaluate(function () {
        return !!window.jshint_result;
    });
}

function onfinishedTests() {
    printTime('onfinishedtests');
    var result = page.evaluate(function () {
            return window.qunitDone;
        }),
        output = page.evaluate(function () {
            return JSON.stringify(window.qunitDone);
        }),
        jscoverage = page.evaluate(function () {
            return window.jscoverage;
        }),
        jshint = page.evaluate(function () {
            return window.jshint_result;
        }),
        f = fs.open(logfile, "w"),
        string = '<?xml version="1.0" encoding="UTF-8"?>',
        file,
        total_lines,
        touched_lines,
        global_total_lines,
        global_touched_lines,
        data,
        source,
        i,
        j,
        testcase,
        testcasetime;

    string += '<testsuites>';

    // Output unittests
    string += '<testsuite name="OE" tests="' + result.total + 
              '" errors="0" failures="' + result.failed + '" skip="0">';
    testcasetime = (result.runtime / 1000) / result.total;

    for (i = 0; i < result.testcases.length; i += 1) {
        testcase = result.testcases[i];
        if (testcase.result) {
            string += '<testcase classname="' + classname + 
                      '" name="unittest: ' + testcase.message +
                      '" time="' + testcasetime + '" />';
        } else {
            string += '<testcase classname="' + classname + 
                      '" name="unittest: ' + testcase.message +
                      '" time="' + testcasetime + '">';
            string += '<failure message="Expected: ' +
                      testcase.expected + ', got: ' + testcase.actual + '"/>';
            string += '</testcase>';
        }
    }

    string += '</testsuite>';

    // Output jshint tests
    for (file = 0; file < jshint.length; file += 1) {
        if (jshint[file].pass) {
            string += '<testsuite name="OE" tests="1" errors="0" ' +
                      'failures="0" skip="0">';
            string += '<testcase classname="' + classname + 
                      '" name="jshint: ' + jshint[file].file +
                      '" time="" />';
        } else {
            string += '<testsuite name="OE" tests="1" errors="0" ' +
                      'failures="1" skip="0">';
            string += '<testcase classname="' + classname + 
                      '" name="jshint: ' + jshint[file].file +
                      '" time=""><failure message=""/></testcase><system-out>';

            for (j = 0; j < jshint[file].errors.length; j += 1) { 
                string += jshint[file].errors[j] + '\n';
            }
            string += '</system-out>';
        }
        string += '</testsuite>';
    }

    string += '</testsuites>';

    f.write(string);
    f.close();

    f = fs.open(logfile.replace('.xml', 'coverage.xml'), "w"),

    global_total_lines = 0;
    global_touched_lines = 0;
    for (i = 0; i < jscoverage.length; i += 1) {
        file = jscoverage[i];
        global_total_lines += file.lines;
        global_touched_lines += file.touched;
    }

    string = '<?xml version="1.0" ?>';
    string += '<!DOCTYPE coverage SYSTEM ';
    string += '\'http://cobertura.sourceforge.net/xml/coverage-03.dtd\'>';
    string += '<coverage branch-rate="0" line-rate="';
    string += (global_touched_lines / global_total_lines);
    string += '" timestamp="' + 1339598625471 + '" version="3.5.2">';
    string += '<packages>';
    string += '<package branch-rate="0" complexity="0" line-rate="';
    string += (global_touched_lines / global_total_lines);
    string += '" name="' + classname + '">';
    string += '<classes>';

    for (i = 0; i < jscoverage.length; i += 1) {
        file = jscoverage[i];
        string += '<class branch-rate="0" complexity="0" filename="';
        string += file.name;
        string += '" line-rate="' + (file.touched / file.lines);
        string += '" name="' + classname + '">';
        string += '<methods/>';
        string += '<lines>';

        for (j = 0; j < file.linescount.length; j += 1) {
            string += '<line hits="';
            string += file.linescount[j].count;
            string += '" number="';
            string += file.linescount[j].line;
            string += '"/>';
        }

        string += '</lines>';
        string += '</class>';
    }

    string += '</classes>';
    string += '</package>';
    string += '</packages>';
    string += '</coverage>';

    f.write(string);
    f.close();

    phantom.exit(JSON.parse(output).failed > 0 ? 1 : 0);
}

page.onConsoleMessage = function (msg) {
    console.log(msg);
};

printTime('opening page');
page.open(url, function (status) {
    if (status !== "success") {
        console.log("Unable to access network: " + status);
        phantom.exit(1);
    } else {
        var interval = setInterval(function () {
            if (finished()) {
                clearInterval(interval);
                onfinishedTests();
            }
        }, 500);
    }
});
