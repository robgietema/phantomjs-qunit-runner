(function ($) {

    var source_count = 0,
        jshint_result = [],
        current_test_assertions = [],
        module,
        testcases = [];

    $(document).ready(function () {
        $('body').append('<h1 id="qunit-header"></h1>' +
                         '<h2 id="qunit-banner"></h2>' +
                         '<h2 id="qunit-userAgent"></h2>' +
                         '<ol id="qunit-tests"></ol>');

        $('script').each(function () {
            var src = $(this).attr('src');
            if ((src !== undefined) && (src.indexOf('.test.js') !== -1)) {
                classname = src.substring(0, src.indexOf('.test.js'));
                $('h1').html(classname + ' Test Suite');
                $('title').html(classname + ' Test Suite');
                $.classname = classname;
            }
        });
    });

    QUnit.moduleStart(function (context) {
        module = context.name;
    });

    QUnit.testDone(function (result) {
        var name = module + ': ' + result.name,
            i;

        if (result.failed) {
            console.log('Assertion Failed: ' + name);

            for (i = 0; i < current_test_assertions.length; i += 1) {
                console.log('    ' + current_test_assertions[i]);
            }
        }

        current_test_assertions = [];
    });

    QUnit.log(function (details) {
        var response;

        testcases.push(details);
        if (details.result) {
            return;
        }

        response = details.message || '';

        if (typeof details.expected !== 'undefined') {
            if (response) {
                response += ', ';
            }

            response += 'expected: ' + details.expected + ', but was: ' +
                        details.actual;
        }

        current_test_assertions.push('Failed assertion: ' + response);
    });

    QUnit.done(function (result) {
        var sources = [];
        $('script').each(function () {
            var src = $(this).attr('src');
            if ((src !== undefined) &&
                (src.indexOf($.classname) !== -1)) {
                sources.push(src);
            }
        });
        source_count = sources.length;
        for (var i = 0; i < sources.length; i++) {
            jshint_test(sources[i]);
        }

        function pad(number) {
            var str = '' + number;
            while (str.length < 4) {
                str = ' ' + str;
            }
            return str;
        }

        console.log('Took ' + result.runtime +  'ms to run ' + result.total +
                    ' tests. ' + result.passed + ' passed, ' + result.failed +
                    ' failed.');
  
        result.testcases = testcases;
        window.qunitDone = result;

        var files = [],
            file,
            coverage,
            array,
            length,
            line,
            value,
            source,
            lines,
            counter,
            total_lines,
            touched_lines,
            untouched_lines,
            result,
            el,
            linescount,
            classname;
        if (typeof(_$jscoverage) === 'undefined') {
            return;
        }
        for (file in _$jscoverage) {
            if (! _$jscoverage.hasOwnProperty(file)) {
                continue;
            }
            if (file.indexOf($.classname) === -1) {
                continue;
            }

            coverage = _$jscoverage[file];

            array = [];
            linescount = [];
            length = coverage.length;
            for (line = 0; line < length; line += 1) {
                value = coverage[line];
                if (value === undefined || value === null) {
                    value = 'null';
                } else {
                    linescount.push({'line': line + 1, 'count': value});
                }
                array.push(value);
            }

            source = coverage.source;
            lines = [];
            length = source.length;
            for (line = 0; line < length; line += 1) {
                value = coverage[line + 1];
                counter = '';
                if (value === undefined || value === null) {
                    counter = pad(line + 1) + '      ';
                } else {
                    counter = pad(line + 1) + ' ' + pad(value) + ' ';
                }
                lines.push(counter + source[line]);
            }

            total_lines = 0;
            touched_lines = 0;

            for (i = 0; i < array.length; i += 1) {
                if (array[i] !== "null") {
                    if (array[i] > 0) {
                        touched_lines += 1;
                    }
                    total_lines += 1;
                }
            }
            untouched_lines = total_lines - touched_lines;

            result = parseInt((touched_lines / total_lines) * 100, 10) + '%';

            classname = result === '100%' ? 'pass' : 'fail';
            el = '<li class="' + classname + '">' +
                 '<strong><span class="module-name">jscoverage</span> : ' + 
                 '<span class="test-name">' + file + '</span> ' +
                 '<b class="counts">(' + result + ')</b></strong>' +
                 '<ol'
            if (classname === 'pass') {
                el += ' style="display: none"';
            }
            el += '>';

            for (i = 0; i < lines.length; i += 1) {
                el += '<li class="'; 
                if (array[i+1] === 0) {
                    el += 'fail';
                } else  {
                    el += 'pass';
                }
                el += '"><pre style="display: inline">';
                el += lines[i].substring(5) + '\n';
                el += '</pre></li>';
            }

            el += '</ol></li>';
            $('#qunit-tests').append(el);

            $('#qunit-tests > li:last > strong').click(function () {
                var next = this.nextSibling,
                    display = next.style.display;
                next.style.display = display === "none" ? "block" : "none";
            });

            files.push({name: file,
                        coverage: array,
                        source: lines,
                        lines: total_lines,
                        linescount: linescount,
                        touched: touched_lines,
                        untouched: untouched_lines,
                        result: result});
        }
        window.jscoverage = files;
    });

    function jshint_test (file, options) {
        $('#qunit-userAgent').html(navigator.userAgent);
        var body = $('body');
        var default_options = {
            sub: true,
            undef: true,
            curly: true
        };
        options = $.extend({}, default_options, options);
        $.ajax({
            url: (typeof(_$jscoverage) === 'undefined' ? '' :
                 '../../tests/') + file, 
            success: function (data) {
                var result = JSHINT(data, options),
                    record = {};

                if (result === false) {
                    record = {file: file,
                              errors: [],
                              pass: false};
                    var curr_attr = $('#qunit-banner', body).attr('class');
                    if (curr_attr == 'qunit-pass' || curr_attr === null) {
                        $('#qunit-banner', body).attr('class', 'qunit-fail');
                    }
                    var ol = $('#qunit-tests', body);
                    var li = $('<li class="fail"></li>');
                    ol.append(li);
    
                    li.append('<strong><span class="module-name">jshint : ' +
                              '</span><span class="test-name">' + file +
                              '</span> <b class="counts">(<b class="failed">' +
                              JSHINT.errors.length +
                              '</b>)</b></strong>');
                    var error_ol = $('<ol></ol>');
                    li.append(error_ol);
                    $.each(JSHINT.errors, function (idx, error) {
                        if (error) {
                            error_ol.append('<li class="fail">' + 
                            ' Line ' + error.line + ': Char ' + error.character + 
                            ' - ' + error.reason + '</li>');
                            record['errors'].push('Line ' + error.line +
                                                  ': Char ' + error.character +
                                                  ' - ' + error.reason);
                        }
                    });
                    jshint_result.push(record);
                } else {
                    if ($('#qunit-banner', body).attr('class') === null) {
                        $('#qunit-banner', body).attr('class', 'qunit-pass');
                    }
                    $('#qunit-tests', body).append(
                        '<li class="pass">' +
                        '<strong><span class="module-name">jshint : ' +
                        '</span><span class="test-name">' + file +
                        '</span> <b class="counts">(<b class="passed">0</b>)' +
                        '</b></strong>' +
                        '<ol style="display: none"><li class="pass">Pass</li></ol>' +
                        '</li>' 
                    );
                    jshint_result.push({file: file,
                                        pass: true});
                }

                $('#qunit-tests > li:last > strong').click(function () {
                    var next = this.nextSibling,
                        display = next.style.display;
                    next.style.display = display === "none" ? "block" : "none";
                });

                source_count -= 1;
                if (source_count === 0) {
                    window.jshint_result = jshint_result;
                }
            },
        dataType: 'text',
        error: function (jqXHR, textStatus, errorThrown) {
            console.log([jqXHR, textStatus, errorThrown]);
        },
        async: false});
    };
})(jQuery);
