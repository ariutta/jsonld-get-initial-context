var falafel = require('falafel');
var fs = require('fs');
var path = require('path');
var Rx = require('rx-extra');

function falafelRx(code, opts) {
  opts = opts || {};
  var subject = new Rx.ReplaySubject();
  var result = falafel(code, opts, function(node) {
    subject.onNext(node);
    if (node.type === 'Program') {
      subject.onCompleted();
    }
  });
  return subject;
}

var outputChunks = [];
var beforeString = fs.readFileSync(path.join(__dirname, '..', 'lib', 'before.js'));
outputChunks.push(beforeString);

var neededFunctions = [
  '_clone',
  '_compareShortestLeast',
  '_getInitialContext',
  '_isArray',
];
var sourcePath = path.join(__dirname, '..', 'node_modules', 'jsonld', 'js', 'jsonld.js');
var sourceString = fs.readFileSync(sourcePath);
falafelRx(sourceString)
  .filter(function(node) {
    return (node.type === 'FunctionExpression' ||
        node.type === 'FunctionDeclaration') &&
        node.id &&
        neededFunctions.indexOf(node.id.name) > -1;
  })
  .map(function(node) {
    return node.source();
  })
  .toArray()
  .subscribe(function(sources) {
    outputChunks = outputChunks.concat(sources);
  }, function(err) {
    throw err;
  }, function() {
    var afterString = fs.readFileSync(path.join(__dirname, '..', 'lib', 'after.js'));
    outputChunks.push(afterString);

    var outputString = outputChunks.join('\n\n')
      .replace('jsonld.url.parse', 'jsonldURLParse');
    
    console.log('outputString');
    console.log(outputString);

    var destPath = path.join(__dirname, '..', 'index.js');
    fs.writeFileSync(destPath, outputString, {encoding: 'utf8'});
    console.log('completed');
  });
