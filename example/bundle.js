require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],4:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require("DbRmao"))
},{"DbRmao":5}],5:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],6:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],7:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("DbRmao"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":6,"DbRmao":5,"inherits":3}],8:[function(require,module,exports){
'use strict';

var util         = require('util');
var Store        = require('./store');
var Group        = require('./group');
var PortSyncer   = require('./portSyncer');
var PortPointer  = require('./portPointer');
var EventEmitter = require('events').EventEmitter;

function CHI() {

  if (!(this instanceof CHI)) return new CHI();

  this.groups   = new Store(); // for groups
  this.pointers = new Store(); // for 'pointers'
  this._sync    = new Store(); // for 'syncing'

  this.queue = {};
}

util.inherits(CHI, EventEmitter);

/**
 *
 * Creates a new group/collection
 *
 */
CHI.prototype.group = function(port, cb) {
  // Generates new groupID
  var g = new Group(port, cb);

  this.groups.set(g.gid(), g);
  this.emit('begingroup', g);

  return g;
};

/**
 *
 * Simple way to give a unique common id to the data
 * at the output ports which want to be synced later on.
 *
 *  *in indicates we want to take along the common id of
 *  the other ports also pointing to the process.
 *
 *  Later this can be used with input ports that have
 *  been set to `sync` with the output originating from
 *  a process they specify.
 *
 * @param {String} nodeId
 * @param {String} port      The current port
 * @param {Object} chi
 * @param {Array}  syncPorts Array of port names to sync
 */
CHI.prototype.pointer = function(sourceId, port, p, identifier) {

  if(p.chi.hasOwnProperty(sourceId)) {
    return;
    /*
    throw new Error(
      'item already set'
    );
    */
  }

  var pp = this.pointers.get(sourceId);

  if(!pp) {
    pp = new PortPointer(identifier);
    this.pointers.set(sourceId, pp);
  }

  // will give the correct id, based on the ports queue
  var itemId = pp.add(port);

  // send along with the chi.
  // note: is within the same space as the groups.
  //
  // The packet now remembers the item id given by this node.
  // The Port Pointer which is created per node, stores this
  // item id.
  //
  // The only job of the PortPointer is assigning unique
  // itemIds, ids which are incremented.
  //
  // Then this.pointers keeps track of these PortPointers
  // per node.
  //
  // So what we end up with is a node tagging each and every
  // node who wanted a pointer and keeping track of
  // what ids were assigned. The collection name *is* a PortPointer
  //
  // Then now, how is the match then actually made?
  //
  // Ah... going different routes, that what this was about.
  // The origin is *one* output event *one* item.
  //
  // Then traveling different paths we ask for port sync.
  //
  // This sync is then based on this id, there became different
  // packets carrying this same item id.
  //
  // So probably the problem is cloning, I just have send
  // the chi along and copied that, so everywhere where that's
  // taking place a clone should take place.
  //
  // If I'll look at how sync works, there is probably
  // not a lot which could go wrong. it's the cloning not taking
  // place. I think something get's overwritten constantly.
  // ending up with the last `contents`
  //
  // De packet data keeps changing which is ok, but the chi
  // changes along with it or something.
  p.chi[sourceId] = itemId;

};

CHI.prototype.sync = function(link, originId, p, syncPorts) {

  var ps = this._sync.get(link.target.pid);
  if(!ps) {
    ps = new PortSyncer(originId, syncPorts);
    this._sync.set(link.target.pid, ps);
  }

  //var ret = ps.add(link, data, chi);
  //
  // This returns whatever is synced
  // And somehow this doesn't give us correct syncing.
  var ret = ps.add(link, p);
  if(ret !== undefined) {
    // what do we get returned?
    this.emit('synced', link.target.pid, ret);
  }

  // chi, need not be removed it could be re-used.
};

//CHI.prototype.collect = function(link, output, chi) {
CHI.prototype.collect = function(link, p) {

  var idx, mx = -1, self = this;

  // ok this is actually hard to determine.
  for(var gid in p.chi) {
    if(p.chi.hasOwnProperty(gid)) {
      // determine last group
      idx = this.groups.order.indexOf(gid);
      mx = idx > mx ? idx : mx;
    }
  }

  if(mx === -1) {
    throw Error('Could not match group');
  }

  gid = this.groups.order[mx];

  if(!this.queue.hasOwnProperty(link.ioid)) {
    this.queue[link.ioid] = {};
  }

  if(!Array.isArray(this.queue[link.ioid][gid])) {
    this.queue[link.ioid][gid] = [];
    this.groups.get(gid).on('complete', function() {
      //self.readySend(link, gid, chi);
      self.readySend(link, gid, p);
    });
  }

  // only push the data, last packet is re-used
  // to write the data back.
  this.queue[link.ioid][gid].push(p.read());

  //this.readySend(link, gid, chi);
  this.readySend(link, gid, p);

};

// TODO: should not work on link here..
//CHI.prototype.readySend = function(link, gid, chi) {
CHI.prototype.readySend = function(link, gid, p) {

  // get group
  var group = this.groups.get(gid);

  if(
     // if group is complete
     group.complete &&
     // if queue length matches the group length
     this.queue[link.ioid][gid].length === group.length
     ) {

    // Important: group seizes to exist for _this_ path.
    delete p.chi[gid];

    // Reusing last collected packet to write the group data
    // packet is not owned while arriving
    p.setOwner(link);
    p.write(link, this.queue[link.ioid][gid]);
    link.write(p);

    // reset
    this.queue[link.ioid][gid] = [];

    /* Not sure..
      delete output.chi[gid];        // remove it for our requester
      // group still exists for other paths.
      delete this.store[gid];        // remove from the store
      this.groupOrder.splice(mx, 1); // remove from the groupOrder.
    */
  }

};

// TODO: could just accept a packet and merge it.
CHI.prototype.merge = function (newChi, oldChi, unique) {

  // nothing to merge
  if(Object.keys(oldChi).length) {

    for(var c in oldChi) {
      if(oldChi.hasOwnProperty(c)) {

        if(newChi.hasOwnProperty(c) &&
          newChi[c] !== oldChi[c]
          ) {

          // problem here is, you are overwriting itemId's
          // Test, not sure if this should never happen.
          // When we merge that *is* what is happening no?
          if(unique) {
            throw new Error('refuse to overwrite chi item');
          }
        } else {
          newChi[c] = oldChi[c];
        }
      }
    }
  }
};

module.exports = CHI;

},{"./group":9,"./portPointer":10,"./portSyncer":11,"./store":12,"events":2,"util":7}],9:[function(require,module,exports){
'use strict';

var util = require('util'),
  uuid = require('uuid').v4,
  EventEmitter = require('events').EventEmitter;

/**
 *
 * Simple grouping.
 *
 * Group can be used from within blackbox.
 *
 * Or is used during cyclic and collect mode.
 *
 * During cyclic mode it can be considered virtual grouping.
 *
 * The virtual group will be recollected during collect mode.
 *
 * For now this will be simple, there can only be one collector
 * and the group will seize too exists once it's collected.
 *
 */
function Group(port, cb) {
  if(arguments.length !== 2) {
    throw new Error('Not enough arguments');
  }

  // these are undefined in virtual mode
  this.cb = cb;
  this.port = port;

  var prefix = 'gid-';
  prefix    += port ? port : '';

  this.info = {
    gid: Group.gid(prefix + '-'),
    complete: false,
    items: []
  };

  Object.defineProperty(this, 'length', {
    get: function() {
      return this.info.items.length;
    }
  });

  Object.defineProperty(this, 'complete', {
    get: function() {
      return this.info.complete;
    }
  });

  /**
   *
   * Used to collect incomming data.
   * Until everything from this group is received.
   *
   */
  this.store = [];

  // send out the group info
  // Ok this will not work with the virtual ones
  // there is no port to send to.
  this.send();
}

util.inherits(Group, EventEmitter);

// allow (tests) to overwrite them
Group.gid    = function(prefix) { return prefix + uuid(); };
Group.itemId = uuid;

/**
 *
 * Generates a new itemId and returns
 * The group and itemId
 *
 * Used like this:
 *
 *  cb({
 *    match: match
 *  }, g.item());
 *
 * The item id is send across 'the wire' and we
 * maintain the total group info overhere.
 *
 * [<gid>] = itemId
 * [<gid>] = itemId
 *
 * Which is a bit too magical, so that must change.
 *
 */
Group.prototype.item = function(obj) {

  // auto merging, could be a bit risky
  // no idea if item is ever called without obj?
  obj = obj || {};
  if(obj.hasOwnProperty(this.info.gid)) {
    throw Error('Object is already within group');
  }

  var id = Group.itemId();

  // This is an ordered array
  this.info.items.push(id);

  obj[this.info.gid] = id;
  return obj;
};

/**
 *
 *
 */
Group.prototype.collect = function(packet) {

  this.store.push(packet);

};

Group.prototype.done = function() {
  // ok, now the send should take place.
  // so this triggers the whole output handling
  // of the node, which is what we want.
  // this is the asyncOutput btw..
  this.info.complete = true;
  // check here if something want's this group.
  // or just emit to CHI and let that class check it.
  this.send();

  this.emit('complete', this);

};

// TODO: remove done..
Group.prototype.end = Group.prototype.done;

/***
 *
 * Sends the output using the callback of the
 * node who requested the group.
 *
 * In case of grouping during cyclic mode, for now,
 * there is nothing to send to. In which case
 * the callback is empty.
 *
 */
Group.prototype.send = function() {

  // only send out if we have a callback.
  if(this.cb) {
    var out = {};
    out[this.port] = {
      gid: this.info.gid,
      complete: !!this.info.complete, // loose reference
      items: this.info.items
    };
    this.cb(out);
  }

};

Group.prototype.items = function() {
  return this.info.items;
};

Group.prototype.gid = function() {
  return this.info.gid;
};

module.exports = Group;

},{"events":2,"util":7,"uuid":114}],10:[function(require,module,exports){
'use strict';

var uuid = require('uuid').v4;

/**
 *
 * The PortPointer initializes
 * each source with the same unique
 * itemId.
 *
 * These are then increased per port.
 * So their id's stay in sync.
 *
 * This does give the restriction both
 * ports should give an equal amount of output.
 *
 * Which is err. pretty errorprone :-)
 * Or at least it depends per node, whether it is.
 */
function PortPointer(identifier) {

  // little more unique than just a number.
  this.id = PortPointer.uid(identifier ? identifier + '-' : '');

  // the idea of this counter is increment
  this.counter = 0;

  //this.cols = cols;

  this.store = {};
}

PortPointer.uid = function(prefix) {
  return prefix + uuid().split('-')[0];
};

/**
 *
 * Should take care of having what come out of the ports
 * have the correct same id's
 *
 */
PortPointer.prototype.add = function(port) {

  if(!this.store.hasOwnProperty(port)) {
    this.store[port] = [this.counter];
  }

  // not just taking store[port].length, don't want to reset during flush
  var nr = this.store[port][this.store[port].length - 1];
  this.store[port].push(++nr);

  // At some point we actually do not care about the id's anymore.
  // that's when all ports have the same id. fix that later.

  return this.id + '-' + nr;

};

module.exports = PortPointer;

},{"uuid":114}],11:[function(require,module,exports){
'use strict';

////
//
// Ok a syncArray is made per nodeId.
// So this is with that scope.
//
// chi: {
//   <nodeId>: <uuid>
// }
//
// We keep on serving as a gate for the
// synced ports here.
//
function PortSyncer(originId, syncPorts) {

  this.syncPorts = syncPorts;
  this.originId  = originId;

  this.store = {};

}

/**
 *
 * Should take care of having what come out of the ports
 * have the correct same id's
 *
 * If we send the data, we can remove it from our store..
 *
 */
//PortSyncer.prototype.add = function(link, data, chi) {
PortSyncer.prototype.add = function(link, p) {

  if(!p.chi.hasOwnProperty(this.originId)) {
    // that's a fail
    throw new Error([
      'Origin Node',
      this.originId,
      'not found within chi'
    ].join(' '));

  }

  if(this.syncPorts.indexOf(link.target.port) === -1) {
    throw new Error([
      'Refuse to handle data for unknown port:',
      link.target.port
      ].join('')
    );
  }

  // <originId>: <itemId>
  // Read back the item id the PortPointer for this node gave us
  var itemId = p.chi[this.originId];

  // if there is no store yet for this item id, create one
  if(!this.store.hasOwnProperty(itemId)) {
    // Create an object for the sync group
    // To contain the data per port.
    this.store[itemId] = {};
  }

  // store this port's data.
  this.store[itemId][link.target.port] = { link: link, p: p };

  // Ok the case of pointing twice with a port
  // using several links is not covered yet..

  // if we have synced all ports, both have added their data
  // then we are ready to send it back.
  // This is done by CHI.sync based on what is returned here.
  // So.. THE reason why we get wrong merged content can only
  // be if some `chi` has stored the wrong item id.
  // And this can only happen, during merging.
  // However merging does this check, so it does not happen
  // during CHI.merge. If it doesn't happen during CHI.merge
  // We have reference somewhere, where there shouldn't be
  // a reference. we re-use a packet.
  // Nice, so where does that take place.
  // and how to prevent it. at least where itemid is set
  // there should be a check whether it's already set.
  if(Object.keys(this.store[itemId]).length === this.syncPorts.length) {

    // return { in1: <data>, in2: <data> }
    // the synced stuff.
    var dat = this.store[itemId];

    // we will never see this itemId again
    delete this.store[itemId];

    return dat;

  } else {

    // not ready yet.
    return undefined;
  }

};

module.exports = PortSyncer;

},{}],12:[function(require,module,exports){
'use strict';

function Store() {
  this.store = {};
  this.order = [];

  Object.defineProperty(this, 'length', {
    get: function() {
      return this.order.length;
    }
  });
}

Store.prototype.set = function(id, obj) {
  this.store[id] = obj;
  this.order.push(id);
};

Store.prototype.get = function(id) {
  return this.store[id];
};

Store.prototype.del = function(id) {
  this.order.splice(this.order.indexOf(id), 1);
  delete this.store[id];
};

Store.prototype.items = function() {
  return this.store;
};

Store.prototype.pop = function() {
  var id  = this.order.pop();
  var ret = this.store[id];
  delete this.store[id];
  return ret;
};

Store.prototype.shift = function() {
  var id  = this.order.shift();
  var ret = this.store[id];
  delete this.store[id];
  return ret;
};

Store.prototype.isEmpty = function() {
  return Object.keys(this.store).length === 0 &&
    this.order.length === 0;
};

module.exports = Store;

},{}],13:[function(require,module,exports){
'use strict';

var util = require('util');

function ConnectionMap() {

}

util.inherits(ConnectionMap, Object);

ConnectionMap.prototype.toJSON = function() {
  var json = {};
  var key;
  for (key in this) {
    if (this.hasOwnProperty(key)) {
      for (var i = 0; i < this[key].length; i++) {
        if (!json[key]) {
          json[key] = [];
        }
        json[key][i] = this[key][i].toJSON();
      }
    }
  }
  return json;
};

module.exports = ConnectionMap;

},{"util":7}],14:[function(require,module,exports){
'use strict';

var Packet = require('./packet');

// TODO: created something more flexible to load this on demand
var nodeTypes = {
  xNode: require('./node'),
  polymer: require('./node/polymer')
};
var xLink = require('./link');
var util = require('util');
var uuid = require('uuid').v4;
var Run = require('./run');
var Connector = require('./connector');
var validate = require('./validate');
var DefaultContextProvider = require('../lib/context/defaultProvider');
var IoMapHandler = require('../lib/io/mapHandler');
var DefaultProcessManager = require('../lib/process/defaultManager');
var Loader = require('chix-loader');
var multiSort = require('../lib/multisort');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('chix:actor');

var Status = {};
Status.STOPPED = 'stopped';
Status.RUNNING = 'running';

/**
 *
 * Actor
 *
 * The Actor is responsible of managing a flow
 * it links and it's nodes.
 *
 * A node contains the actual programming logic.
 *
 * @api public
 * @author Rob Halff <rob.halff@gmail.com>
 * @constructor
 */
function Actor() {

  EventEmitter.apply(this, arguments);

  this.ioHandler = undefined;
  this.processManager = undefined;
  this.nodes = {};
  this.links = {};
  this.iips = {};
  this.view = [];
  this.status = undefined;

  // default to own id, map can overwrite
  this.id = uuid();

  this.type = 'flow';

  /**
   *
   * Added by default.
   *
   * If others need to be used they should be set before addMap();
   *
   */
  this.setIoHandler(new IoMapHandler());
  this.setProcessManager(new DefaultProcessManager());
  this.setLoader(new Loader());

}

util.inherits(Actor, EventEmitter);

/**
 *
 * Create/instantiate  a node
 *
 * Node at this stage is nothing more then:
 *
 *  { ns: "fs", name: "readFile" }
 *
 * @param {Object} node - Node as defined within a map
 * @param {Object} def  - Node Definition
 *
 * @api public
 */
Actor.prototype.createNode = function(node, def) {

  var self = this;

  if (!def) {
    throw new Error(
      util.format(
        'Failed to get node definition for %s:%s', node.ns, node.name
      )
    );
  }

  if (!node.id) {
    throw Error('Node should have an id');
  }

  if (!def.ports) {
    def.ports = {};
  }

  // merges expose, persist etc, with port definitions.
  // This is not needed with proper inheritance
  for (var type in node.ports) {
    if (node.ports.hasOwnProperty(type) &&
      def.ports.hasOwnProperty(type)
    ) {
      for (var name in node.ports[type]) {
        if (node.ports[type].hasOwnProperty(name) &&
          def.ports[type].hasOwnProperty(name)
        ) {

          for (var property in node.ports[type][name]) {
            if (node.ports[type][name].hasOwnProperty(property)) {
              // add or overwrite it.
              def.ports[type][name][property] =
                node.ports[type][name][property];
            }
          }
        }
      }
    }
  }

  // allow instance to overwrite other node definition data also.
  // probably make much more overwritable, although many
  // should not be overwritten, so maybe just keep it this way.
  if (node.title) {
    def.title = node.title;
  }

  if (node.description) {
    def.description = node.description;
  }

  var identifier = node.title || [
    node.ns, '::', node.name, '-',
    Object.keys(this.nodes).length
  ].join('');

  if (def.type === 'flow') {

    var xFlow = require('./flow'); // solve circular reference.

    validate.flow(def);

    this.nodes[node.id] = new xFlow(
      node.id,
      def,
      identifier,
      this.loader, // single(ton) instance (TODO: di)
      this.ioHandler, // single(ton) instance
      this.processManager // single(ton) instance
    );
    debug('%s: created %s', this.identifier, this.nodes[node.id].identifier);

  }
  else {

    var cls = def.type || 'xNode';

    if (nodeTypes.hasOwnProperty(cls)) {

      validate.nodeDefinition(def);

      this.nodes[node.id] = new nodeTypes[cls](
        node.id,
        def,
        identifier,
        this.ioHandler.CHI
      );

      debug('%s: created %s', this.identifier, this.nodes[node.id].identifier);

      // register and set pid, xFlow/actor adds itself to it (hack)
      this.processManager.register(this.nodes[node.id]);

    }
    else {

      throw Error(
        util.format('Unknown node type: `%s`', cls)
      );

    }

  }

  // add parent to both xflow's and node's
  // not very pure seperation, but it's just very convenient
  this.nodes[node.id].setParent(this);

  if (node.provider) {
    this.nodes[node.id].provider = node.provider;
  }

  // TODO: move this to something more general.
  // not on every node creation.
  if (!this.contextProvider) {
    this.addContextProvider(new DefaultContextProvider());
  }

  this.contextProvider.addContext(
    this.nodes[node.id],
    node.context
  );

  function nodeOutputHandlerActor(event) {
    self.ioHandler.output(event);
  }

  this.nodes[node.id].on('output', nodeOutputHandlerActor);

  this.nodes[node.id].on('freePort', function freePortHandlerActor(event) {

    var links;
    var i;

    debug('%s:%s freePortHandler', self.identifier, event.port);

    // get all current port connections
    links = this.portGetConnections(event.port);

    if (links.length) {

      for (i = 0; i < links.length; i++) {

        var link = links[i];

        // unlock if it was locked
        if (self.ioHandler.queueManager.isLocked(link.ioid)) {
          self.ioHandler.queueManager.unlock(link.ioid);
        }

      }

      if (event.link) {

        // remove the link belonging to this event
        if (event.link.has('dispose')) {

          // TODO: remove cyclic all together, just use core/forEach
          //  this will cause bugs if you send multiple cyclics because
          //  the port is never unplugged..
          if (!event.link.target.has('cyclic')) {
            self.removeLink(event.link);
          }
        }

      }

    }

  });

  this.emit('addNode', {
    node: this.nodes[node.id]
  });

  return this.nodes[node.id];

};

/**
 *
 * Plugs a source into a target node
 *
 *
 * @param {Connector} target
 */
Actor.prototype.plugNode = function(target) {

  return this.getNode(target.id).plug(target);

};

/**
 *
 * Unplugs a port for the node specified.
 *
 * @param {Connector} target
 */
Actor.prototype.unplugNode = function(target) {

  // could be gone, if called from freePort
  // when nodes are being removed.
  if (this.hasNode(target.id)) {
    return this.getNode(target.id).unplug(target);
  }

  return false;

};

/**
 *
 * Holds a Node
 *
 * @param {String} id
 * @api public
 */
Actor.prototype.hold = function(id) {

  this.getNode(id).hold();

  return this;

};

/**
 *
 * Starts the actor
 *
 * @param {Boolean} push
 * @api public
 */
Actor.prototype.start = function(push) {

  this.status = Status.RUNNING;

  debug('%s: start', this.identifier);

  // TODO: this means IIPs should be send after start.
  //       enforce this..
  this.clearIIPs();

  // start all nodes
  // (could also be started during addMap
  // runtime is skipping addMap.
  // so make sure start() is restartable.
  for (var id in this.nodes) {
    if (this.nodes.hasOwnProperty(id)) {
      this.getNode(id).start();
    }
  }

  if (push !== false) {
    this.push();
  }

  // there are many other ways to start
  // so this does not ensure much.
  // however the process manager listens to this.
  // Real determination if something is started or stopped
  // includes the ioHandler.
  // So let's just inform the io handler we are started.

  this.emit('start', {
    node: this
  });

  return this;

};

/**
 *
 * Stops the actor
 *
 * Use a callback to make sure it is stopped.
 *
 * @api public
 */
Actor.prototype.stop = function(cb) {

  var self = this;

  this.status = Status.STOPPED;

  if (this.ioHandler) {

    this.ioHandler.reset(function resetCallbackIoHandler() {

      // close ports opened by iips
      self.clearIIPs();

      self.emit('stop', {
        node: self
      });

      if (cb) {
        cb();
      }

    });

  }

};

Actor.prototype.pause = function() {

  this.status = Status.STOPPED;

  for (var id in this.nodes) {
    if (this.nodes.hasOwnProperty(id)) {
      this.getNode(id).hold();
    }
  }

  return this;

};

/**
 *
 * Resumes the actor
 *
 * All nodes which are on hold will resume again.
 *
 * @api public
 */
Actor.prototype.resume = function() {

  this.status = Status.RUNNING;

  for (var id in this.nodes) {
    if (this.nodes.hasOwnProperty(id)) {
      this.getNode(id).release();
    }
  }

  return this;

};

/**
 *
 * Get the current status
 *
 * @api public
 */
Actor.prototype.getStatus = function() {
  return this.status;
};

/**
 *
 * Create an actor
 *
 * @api public
 */
Actor.create = function(map, loader, ioHandler, processManager) {

  var actor = new Actor();
  loader = loader || new Loader();
  processManager = processManager || new DefaultProcessManager();
  ioHandler = ioHandler || new IoMapHandler();
  actor.addLoader(loader);
  actor.addIoHandler(ioHandler);
  actor.addProcessManager(processManager);
  actor.addMap(map);

  return actor;
};

/**
 *
 * Releases a node if it was on hold
 *
 * @param {String} id
 * @api public
 */
Actor.prototype.release = function(id) {
  return this.getNode(id).release();
};

/**
 *
 * Pushes the Actor
 *
 * Will send :start to all nodes without input
 * and all nodes which have all their input ports
 * filled by context already.
 *
 * @api public
 */
Actor.prototype.push = function() {

  this.status = Status.RUNNING;
  debug('%s: push()', this.identifier);

  for (var id in this.nodes) {
    if (this.nodes.hasOwnProperty(id)) {
      var node = this.getNode(id);
      if (node.isStartable()) {
        var iip = new Connector();
        iip.plug(id, ':start');
        this.sendIIP(iip, '');
      }
      else {
        console.log(node.identifier, ' not startable');
      }
    }
  }

  return this;
};

/**
 *
 * Adds the definition Loader
 *
 * This provides an api to get the required node definitions.
 *
 * The loader should already be init'ed
 *
 * e.g. the remote loader will already have loaded the definitions.
 * and is ready to respond to getNodeDefinition(ns, name, type, provider)
 *
 * e.g. An async loader could do something like this:
 *
 *   loader(flow, function() { actor.addLoader(loader); }
 *
 * With a sync loader it will just look like:
 *
 * actor.addLoader(loader);
 *
 * @api public
 */
Actor.prototype.addLoader = function(loader) {
  this.loader = loader;
  return this;
};

Actor.prototype.setLoader = Actor.prototype.addLoader;

/**
 *
 * Validate and read map
 *
 * @param {Object} map
 * @api public
 *
 */
Actor.prototype.addMap = function(map) {

  debug('%s: addMap()', this.identifier);

  var i;
  var self = this;

  if (typeof map === 'undefined') {
    throw new Error('map is not defined');
  }

  if (map !== Object(map)) {
    throw new Error('addMap expects an object');
  }

  try {
    validate.flow(map);
  }
  catch (e) {
    if (map.title) {
      throw Error(
        util.format('Flow `%s`: %s', map.title, e.message)
      );
    }
    else {
      throw Error(
        util.format('Flow %s:%s: %s', map.ns, map.name, e.message)
      );
    }
  }

  if (map.id) {
    // xFlow contains it, direct actors don't perse
    this.id = map.id;
  }

  // add ourselves (actor/xFlow) to the processmanager
  // this way links can store our id and pid
  // must be done *before* adding our nodes.
  // otherwise our nodes will be registered before ourselves.
  if (!this.pid) { // re-run
    this.processManager.register(this);
  }

  // allow a map to carry it's own definitions
  if (map.nodeDefinitions) {
    this.loader.addNodeDefinitions('@', map.nodeDefinitions);
  }

  // add nodes and links one by one so there is more control
  map.nodes.forEach(function(node) {

    if (!node.id) {
      throw new Error(
        util.format('Node lacks an id: %s:%s', node.ns, node.name)
      );
    }

    // give the node a default provider.
    if (!node.provider) {
      if (map.providers && map.providers.hasOwnProperty('@')) {
        node.provider = map.providers['@'].url;
      }
    }

    var def = self.loader.getNodeDefinition(node, map);
    if (!def) {

      throw new Error(
        util.format(
          'Failed to get node definition for %s:%s', node.ns, node.name
        )
      );
    }

    self.createNode(node, def);

  });

  // this.ensureConnectionNumbering(map);

  if (map.hasOwnProperty('links')) {
    map.links.forEach(function(link) {
      self.addLink(
        self.createLink(link)
      );
    });
  }

  for (i = 0; i < map.nodes.length; i++) {
    this.view.push(map.nodes[i].id);
  }

  /*
    Disabled. Actor.start() does this and xFlow.start()
    will start all their nodes, and then goes recursive.

    // all nodes & links setup, run start method on node
    for (var id in this.nodes) {
      if (this.nodes.hasOwnProperty(id)) {
        this.getNode(id).start();
      }
    }
  */

  return this;

};

/**
 *
 * Used by the process manager to set our id
 *
 */
Actor.prototype.setPid = function(pid) {
  this.pid = pid;
};

/**
 *
 * Adds a node to the map.
 *
 * The object format is like it's defined within a map.
 *
 * Right now this is only used during map loading.
 *
 * For dynamic loading care should be taken to make
 * this node resolvable by the loader.
 *
 * Which means the definition should either be found
 * at the default location defined within the map.
 * Or the node itself should carry provider information.
 *
 * A provider can be defined as:
 *
 *  - url:        https://serve.rhcloud.com/flows/{ns}/{name}
 *  - file:       ./{ns}/{name}
 *  - namespace:  MyNs
 *
 * Namespaces are defined within the map, so MyNs will point to
 * either the full url or filesystem location.
 *
 * Once a map is loaded _all_ nodes will carry the full url individually.
 * The namespace is just their to simplify the json format and for ease
 * of maintainance.
 *
 *
 * @param {Object} node
 * @api public
 *
 */
Actor.prototype.addNode = function(node) {

  this.createNode(node);

  return this;
};

/**
 *
 * Creates a new connection/link
 *
 * Basically takes a plain link object
 * and creates a proper xLink from it.
 *
 * The internal map holds xLinks, whereas
 * the source map is just plain JSON.
 *
 * Structurewise they are almost the same.
 *
 * @param {Object} ln
 * @return {xLink} link
 * @api public
 *
 */
Actor.prototype.createLink = function(ln) {

  return xLink.create(ln);

};

/**
 *
 * Adds a link
 *
 * @param {xLink} link
 */
Actor.prototype.addLink = function(link) {

  debug('%s: addLink()', this.identifier);

  if (link.constructor.name !== 'Link') {
    throw Error('Link must be of type Link');
  }

  if (link.source.id !== this.id) { // Warn: IIP has our own id
    var sourceNode = this.getNode(link.source.id);
    if (!sourceNode.portExists('output', link.source.port)) {
      throw Error(util.format(
        'Source node (%s:%s) does not have an output port named `%s`\n\n' +
        '\tOutput ports available:\t%s\n',
        sourceNode.ns,
        sourceNode.name,
        link.source.port,
        Object.keys(sourceNode.ports.output).join(', ')
      ));
    }
  }

  var targetNode = this.getNode(link.target.id);
  if (link.target.port !== ':start' &&
    !targetNode.portExists('input', link.target.port)
  ) {
    throw Error(
      util.format(
        'Target node (%s:%s) does not have an input port named `%s`\n\n' +
        '\tInput ports available:\t%s\n',
        targetNode.ns,
        targetNode.name,
        link.target.port,
        Object.keys(targetNode.ports.input).join(', ')
      )
    );
  }

  // var targetNode = this.getNode(link.target.id);

  // FIXME: rewriting sync property
  // to contain the process id of the node it's pointing
  // to not just the nodeId defined within the graph
  if (link.target.has('sync')) {
    link.target.set('sync', this.getNode(link.target.get('sync')).pid);
  }

  link.graphId = this.id;
  link.graphPid = this.pid;

  var self = this;

  var dataHandler = function dataHandler(p) {
    if (!this.ioid) {
      throw Error('LINK MISSING IOID');
    }

    self.__input(this, p);
  };

  link.on('data', dataHandler);

  if (link.source.id) {
    if (link.source.id === this.id) {
      link.setSourcePid(this.pid || this.id);
    }
    else {
      link.setSourcePid(this.getNode(link.source.id).pid);
    }
  }

  link.setTargetPid(this.getNode(link.target.id).pid);

  // remember our own links, so we can remove them
  // if it has data it's an iip
  if (undefined !== link.data) {
    this.iips[link.id] = link;
  }
  else {
    this.links[link.id] = link;
  }

  this.ioHandler.connect(link);

  this.plugNode(link.target);

  link.on('change', function changeLink(link) {
    self.emit('changeLink', link);
  });

  // bit inconsistent with event.node
  // should be event.link
  this.emit('addLink', link);

  // this.ensureConnectionNumbering();
  return link;

};

Actor.prototype.getLink = function(id) {
  return this.links[id];
};

Actor.prototype.unlockConnections = function(node) {

  // fix this, flow connections setup is different
  var conns = node.getConnections();
  for (var port in conns) {
    if (conns.hasOwnProperty(port)) {
      for (var i = 0; i < conns[port].length; i++) {
        this.ioHandler.unlock(conns[port][i]);
      }
    }
  }

};

Actor.prototype.__input = function(link, p) {

  var self = this;

  this.ioHandler.lock(link);

  var targetNode = this.getNode(link.target.id);

  var ret = targetNode.fill(link.target, p);

  // breakpoint
  if (util.isError(ret)) {

    // `hard reject`
    // set node in error state and output error to ioManager
    targetNode.error(ret);

    debug('%s: reject %s', this.identifier, ret);
    self.ioHandler.reject(ret, link, p);

  }
  else if (ret === false) {

    // something should unlock.
    // having this reject unlock it is too much free form.

    debug('%s: soft reject re-queue', this.identifier);
    // `soft reject`
    self.ioHandler.reject(ret, link, p);

  }
  else {
    // would like to unlock all

    // unlock *all* queues targeting this node.
    // the IOHandler can do this.
    debug('%s: unlock all queues', this.identifier);
    self.unlockConnections(targetNode);

    self.ioHandler.accept(link, p);
  }

};

Actor.prototype.clearIIP = function(link) {

  var id;
  var oldLink;

  for (id in this.iips) {

    if (this.iips.hasOwnProperty(id)) {

      oldLink = this.iips[id];

      // source is always us so do not have to check it.
      if ((
          oldLink.source.port === ':iip' ||
          oldLink.target.port === link.target.port ||
          oldLink.target.port === ':start' // huge uglyness
        ) &&
        oldLink.target.id === link.target.id) {

        this.unplugNode(oldLink.target);

        this.ioHandler.disconnect(oldLink);

        delete this.iips[oldLink.id];

        // TODO: just rename this to clearIIP
        this.emit('removeIIP', oldLink);

      }

    }
  }

};

/**
 *
 * Clear IIPs
 *
 * If target is specified, only those iips will be cleared.
 *
 */
Actor.prototype.clearIIPs = function(target) {

  var id;
  var iip;
  for (id in this.iips) {
    if (this.iips.hasOwnProperty(id)) {
      iip = this.iips[id];
      if (!target ||
        (target.id === iip.target.id && target.port === iip.target.port)) {
        this.clearIIP(this.iips[id]);
      }
    }
  }
};

/**
 *
 * Renames a node
 *
 * Renames the id of a node.
 * This should not rename the real id.
 *
 * @param {string} nodeId
 * @param {function} cb
 * @api public
 */
Actor.prototype.renameNode = function(/*nodeId, cb*/) {

};

/**
 *
 * Removes a node
 *
 * @param {string} nodeId
 * @param {function} cb
 * @api public
 */
Actor.prototype.removeNode = function(nodeId, cb) {

  var id;
  var ln;
  var self = this;
  for (id in this.links) {
    if (this.links.hasOwnProperty(id)) {

      ln = this.links[id];

      if (ln.source.id === nodeId ||
        ln.target.id === nodeId) {
        this.removeLink(ln);
      }

    }

  }

  // should wait for IO, especially there is a chance
  // system events are still spitting.

  // register and set pid
  this.processManager.unregister(this.getNode(nodeId),
    function unregisterHandlerActor() {

      var oldNode = self.getNode(nodeId).export();

      delete self.nodes[nodeId];

      self.emit('removeNode', {
        node: oldNode
      });

      if (cb) {
        cb();
      }

    });

};

Actor.prototype.removeNodes = function() {

  this.clear();

};

Actor.prototype.setMeta = function(nodeId, key, value) {

  var node = this.getNode(nodeId);

  node.setMeta(key, value);

  this.emit('metadata', {
    id: this.id,
    node: node.export()
  });

};

/**
 *
 * Removes link
 *
 * @param {Link} ln
 * @api public
 *
 */
Actor.prototype.removeLink = function(ln) {

  // we should be able to find a link without id.
  var link;
  var what = 'links';

  link = this.links[ln.id];
  if (!link) {
    link = this.iips[ln.id];
    if (!link) {
      //throw Error('Cannot find link');
      // TODO: Seems to happen with ip directly to subgraph (non-fatal)
      console.warn('FIXME: cannot find link');
      return;
    }
    what = 'iips';
  }

  this.unplugNode(link.target);

  this.ioHandler.disconnect(link);

  // io handler could do this.
  // removelink on the top-level actor/graph
  // is not very useful

  var oldLink = this[what][link.id];

  delete this[what][link.id];

  this.emit('removeLink', oldLink);

  return this;

};

/**
 *
 * Adds a port
 *
 * NOT IMPLEMENTED
 *
 * @api public
 */
Actor.prototype.addPort = function() {

  return this;

};

/**
 *
 * Removes a port
 *
 * NOT IMPLEMENTED
 *
 * @api public
 */
Actor.prototype.removePort = function() {

  return this;

};

/**
 *
 * Resets this instance so it can be re-used
 *
 * Note: The registered loader is left untouched.
 *
 * @api public
 *
 */
Actor.prototype.reset = function() {

  var id;

  for (id in this.nodes) {
    if (this.nodes.hasOwnProperty(id)) {
      this.getNode(id).reset();
    }
  }

  // if nothing has started yet
  // there is no ioHandler
  if (this.ioHandler) {
    this.ioHandler.reset();
  }

  return this;

};

Actor.prototype.clear = function(cb) {

  if (!cb) {
    throw Error('clear expects a callback');
  }

  var self = this;
  var nodeId;
  var cnt = 0;
  var total = Object.keys(this.nodes).length;

  if (total === 0) {
    cb();
  }

  function removeNodeHandler() {
      cnt++;
      if (cnt === total) {
        self.nodes = {};
        cb();
      }
    }
    // remove node will automatically remove all links
  for (nodeId in this.nodes) {
    if (this.nodes.hasOwnProperty(nodeId)) {
      // will remove links also.
      this.removeNode(nodeId, removeNodeHandler);
    }
  }

};

/**
 *
 * Add IO Handler.
 *
 * The IO Handler handles all the input and output.
 *
 * @param {IOHandler} handler
 * @api public
 *
 */
Actor.prototype.addIoHandler = function(handler) {

  this.ioHandler = handler;

  return this;

};

Actor.prototype.setIoHandler = Actor.prototype.addIoHandler;

/**
 *
 * Add Process Manager.
 *
 * The Process Manager holds all processes.
 *
 * @param {Object} manager
 * @api public
 *
 */
Actor.prototype.addProcessManager = function(manager) {

  this.processManager = manager;

  return this;

};

Actor.prototype.setProcessManager = Actor.prototype.addProcessManager;

/**
 *
 * Add a new context provider.
 *
 * A context provider pre-processes the raw context
 *
 * This is useful for example when using the command line.
 * All nodes which do not have context set can be asked for context.
 *
 * E.g. database credentials could be prompted for after which all
 *      input is fullfilled and the flow will start to run.
 *
 * @param {ContextProvider} provider
 * @api private
 *
 */
Actor.prototype.addContextProvider = function(provider) {
  this.contextProvider = provider;

  return this;

};

Actor.prototype.setContextProvider = Actor.prototype.addContextProvider;

/**
 *
 * Explains what input and output ports are
 * available for interaction.
 *
 */
Actor.prototype.help = function() {

};

/**
 *
 * Send IIPs
 *
 * Optionally with `options` for the port:
 *
 * e.g. { persist: true }
 *
 * Optionally with `source` information
 *
 * e.g. { index: 1 } // index for array port
 *
 * @param {Object} iips
 * @api public
 */
Actor.prototype.sendIIPs = function(iips) {

  var self = this;

  var links = [];

  iips.forEach(function(iip) {

    var xLink = self.createLink({
      source: {
        id: self.id, // we are the sender
        port: ':iip'
      },
      target: iip.target
    });

    // dispose after fill
    xLink.set('dispose', true);

    if (iip.data === undefined) {
      throw Error('IIP data is `undefined`');
    }

    xLink.data = iip.data;

    links.push(xLink);

  });

  links.forEach(function(iip) {

    // TODO: this doesn't happen anymore it's always a link.
    // make sure settings are always set also.
    if (iip.target.constructor.name !== 'Connector') {
      var target = new Connector();
      target.plug(iip.target.id, iip.target.port);
      for (var key in iip.target.setting) {
        if (iip.target.setting.hasOwnProperty(key)) {
          target.set(key, iip.target.setting[key]);
        }
      }
      iip.target = target;
    }

    if (!self.id) {
      throw Error('Actor must contain an id');
    }

    self.addLink(iip);

  });

  links.forEach(function(link) {

    self.ioHandler.emit('send', link);

    var p = new Packet(JSON.parse(JSON.stringify(link.data)));

    // a bit too direct, ioHandler should do this..
    self.ioHandler.queueManager.queue(link.ioid, p);

    // remove data bit.
    delete link.data;
  });

  return links;

};

/*
 * Send a single IIP to a port.
 *
 * Note: If multiple IIPs have to be send use sendIIPs instead.
 *
 * Source is mainly for testing, but essentially it allows you
 * to imposter a sender as long as you send along the right
 * id and source port name.
 *
 * Source is also used to set an index[] for array ports.
 * However, if you send multiple iips for an array port
 * they should be send as a group using sendIIPs
 *
 * This is because they should be added in reverse order.
 * Otherwise the process will start too early.
 *
 * @param {Connector} target
 * @param {Object} data
 * @api public
 */
Actor.prototype.sendIIP = function(target, data) {

  if (!this.id) {
    throw Error('Actor must contain an id');
  }

  if (undefined === data) {
    throw Error('Refused to send IIP without data');
  }

  var ln = {
    source: {
      id: this.id, // we are the sender
      pid: this.pid,
      port: ':iip'
    },
    target: target
  };

  var xLink = this.createLink(ln);
  xLink.data = data;

  // dispose after fill
  xLink.set('dispose', true);

  // makes use of xLink.data
  this.addLink(xLink);

  this.ioHandler.emit('send', xLink);

  var p = new Packet(JSON.parse(JSON.stringify(xLink.data)));

  this.ioHandler.queueManager.queue(xLink.ioid, p);

  // remove data bit.
  delete xLink.data;

  return xLink;

};

/**
 *
 * Retrieve a node by it's process id
 *
 * @param {String} pid - Process ID
 * @return {Object} node
 * @api public
 */
Actor.prototype.getNodeByPid = function(pid) {

  var id;
  var node;

  for (id in this.nodes) {
    if (this.nodes.hasOwnProperty(id)) {
      node = this.getNode(id);
      if (node.pid === pid) {
        return node;
      }
    }
  }

  return;
};

/**
 *
 * Get all node ids this node depends on.
 *
 * @param {String} nodeId
 * @return {Array} nodes
 * @api public
 */
Actor.prototype.getAncestorIds = function(nodeId) {

  var self = this;

  var pids = this.ioHandler.getAncestorPids(
    this.getNode(nodeId).pid
  );

  var ids = [];
  pids.forEach(function(pid) {
    ids.push(self.getNodeByPid(pid).id);
  });
  return ids;

};

/**
 *
 * Get the entire node branch this node depends on
 *
 * @param {String} nodeId
 * @return {Array} nodes
 * @api public
 */
Actor.prototype.getAncestorNodes = function(nodeId) {
  var i;
  var nodes = [];
  var ids = this.getAncestorIds(nodeId);

  for (i = 0; i < ids.length; i++) {
    nodes.push(this.getNode(ids[i]));
  }

  return nodes;
};

/**
 *
 * Get all node ids that target this node.
 *
 * @param {String} nodeId
 * @return {Array} ids
 * @api public
 */
Actor.prototype.getSourceIds = function(nodeId) {

  var self = this;
  var ids = [];

  var pids = this.ioHandler.getSourcePids(
    this.getNode(nodeId).pid
  );

  pids.forEach(function(pid) {
    var node = self.getNodeByPid(pid);
    if (node) { // iips will not be found
      ids.push(node.id);
    }
  });
  return ids;

};

/**
 *
 * Get all nodes that target this node.
 *
 * @param {String} nodeId
 * @return {Array} nodes
 * @api public
 */
Actor.prototype.getSourceNodes = function(nodeId) {

  var i;
  var nodes = [];
  var ids = this.getSourceIds(nodeId);

  for (i = 0; i < ids.length; i++) {
    nodes.push(this.getNode(ids[i]));
  }

  return nodes;

};

/**
 *
 * Get all nodes that use this node as a source .
 *
 * @param {String} nodeId
 * @return {Array} ids
 * @api public
 */
Actor.prototype.getTargetIds = function(nodeId) {

  var self = this;

  var pids = this.ioHandler.getTargetPids(
    this.getNode(nodeId).pid
  );

  var ids = [];
  pids.forEach(function(pid) {
    ids.push(self.getNodeByPid(pid).id);
  });
  return ids;

};

/**
 *
 * Use is a generic way of creating a new instance of self
 * And only act upon a subset of our map.
 *
 *
 */
Actor.prototype.use = function( /*name, context*/ ) {

  throw Error('TODO: reimplement actions');
  /*
    var i;
    var action;
    var map = {};
    var sub = new this.constructor();

    // Use this handlers events also on the action.
    sub._events = this._events;

    // Find our action
    if (!this.map.actions) {
      throw new Error('This flow has no actions');
    }

    if (!this.map.actions.hasOwnProperty(name)) {
      throw new Error('Action not found');
    }

    action = this.map.actions[name];

    // Create a reduced map
    map.env = this.map.env;
    map.title =  action.title;
    map.description = action.description;
    map.ports = this.map.ports;
    map.nodes = [];
    map.links = [];

    for (i = 0; i < this.map.nodes.length; i++) {
      if (action.nodes.indexOf(this.map.nodes[i].id) >= 0) {
        map.nodes.push(this.map.nodes[i]);
      }
    }

    for (i = 0; i < this.map.links.length; i++) {
      if (
        action.nodes.indexOf(this.map.links[i].source.id) >= 0 &&
        action.nodes.indexOf(this.map.links[i].target.id) >= 0) {
        map.links.push(this.map.links[i]);
      }
    }

    // re-use the loader
    sub.addLoader(this.loader);

    // add the nodes to our newly instantiated Actor
    sub.addMap(map);

    // hack to autostart it during run()
    // this only makes sense with actions.
    // TODO: doesn work anymore
    // sub.trigger = action.nodes[0];

    return sub;
  */

};

/**
 *
 * Run the current flow
 *
 * The flow starts by providing the ports with their context.
 *
 * Nodes which have all their ports filled by context will run immediatly.
 *
 * Others will wait until their unfilled ports are filled by connections.
 *
 * Internally the node will be set to a `contextGiven` state.
 * It's a method to tell the node we expect it to have enough
 * information to start running.
 *
 * If a port is not required and context was given and there are
 * no connections on it, it will not block the node from running.
 *
 * If a map has actions defined, run expects an action name to run.
 *
 * Combinations:
 *
 *   - run()
 *     run flow without callback
 *
 *   - run(callback)
 *     run with callback
 *
 *   - action('actionName').run()
 *     run action without callback
 *
 *   - action('actionName').run(callback)
 *     run action with callback
 *
 * The callback will receive the output of the (last) node(s)
 * Determined by which output ports are exposed.
 *
 * If we pass the exposed output, it can contain output from anywhere.
 *
 * If a callback is defined but there are no exposed output ports.
 * The callback will never fire.
 *
 * @api public
 */
Actor.prototype.run = function(callback) {

  return new Run(this, callback);

};
/**
 *
 * Need to do it like this, we want the new sub actor
 * to be returned to place events on etc.
 *
 * Otherwise it's hidden within the actor itself
 *
 * Usage: Actor.action('action').run(callback);
 *
 */
Actor.prototype.action = function(action, context) {

  var sub = this.use(action, context);
  return sub;

};

/**
 *
 * Get all nodes.
 *
 * TODO: unnecessary method
 *
 * @return {Object} nodes
 * @api public
 *
 */
Actor.prototype.getNodes = function() {

  return this.nodes;

};

/**
 *
 * Check if this node exists
 *
 * @param {String} id
 * @return {Object} node
 * @api public
 */
Actor.prototype.hasNode = function(id) {

  return this.nodes.hasOwnProperty(id);

};

/**
 *
 * Get a node by it's id.
 *
 * @param {String} id
 * @return {Object} node
 * @api public
 */
Actor.prototype.getNode = function(id) {

  if (this.nodes.hasOwnProperty(id)) {
    return this.nodes[id];
  }
  else {
    throw new Error(util.format('Node %s does not exist', id));
  }

};

/**
 *
 * JSON Status report about the nodes.
 *
 * Mainly meant to debug after shutdown.
 *
 * Should handle all stuff one can think of
 * why `it` doesn't work.
 *
 */
Actor.prototype.report = function() {

  var link;
  var node;
  var id;
  var size;
  var qm = this.ioHandler.queueManager;

  var report = {
    ok: true,
    flow: this.id,
    nodes: [],
    queues: []
  };

  for (id in this.nodes) {
    if (this.nodes.hasOwnProperty(id)) {
      node = this.nodes[id];
      if (node.status !== 'complete') {
        report.ok = false;
        report.nodes.push({
          node: node.report()
        });
      }
    }
  }

  for (id in this.links) {
    if (this.links.hasOwnProperty(id)) {
      link = this.links[id];
      if (qm.hasQueue(link.ioid)) {
        size = qm.size(link.ioid);
        report.ok = false;
        report.queues.push({
          link: link.toJSON(),
          port: link.target.port,
          // super weird, will be undefined if called here.
          // size: qm.size(link.ioid),
          size: size,
          node: this.getNode(link.target.id).report()
        });
      }
    }
  }

  return report;

};

/**
 *
 * If there are multiple connections to one port
 * the connections are numbered.
 *
 * If there is a index specified by using the
 * [] property, it will be considered.
 *
 * If it's not specified although there are
 * multiple connections to one port, it will be added.
 *
 * The sort takes care of adding connections where
 * [] is undefined to be placed last.
 *
 * The second loop makes sure they are correctly numbered.
 *
 * If connections are defined like:
 *
 *   undefined, [4],undefined, [3],[2]
 *
 * The corrected result will be:
 *
 * [2]        -> [0]
 * [3]        -> [1]
 * [4]        -> [2]
 * undefined  -> [3]
 * undefined  -> [4]
 *
 * Ports which only have one connection will be left unmodified.
 *
 */
Actor.prototype.ensureConnectionNumbering = function(map) {

  var c = 0;
  var i;
  var link;
  var last = {};
  var node;

  // first sort so order of appearance of
  // target.in is correct
  //
  // FIX: seems like multisort is messing up the array.
  // target suddenly has unknown input ports...
  if (map.links.length) {
    multiSort(map.links, ['target', 'in', 'index']);
  }

  for (i = 0; i < map.links.length; i++) {

    link = map.links[i];

    // Weird, the full node is not build yet here?
    // so have to look at the nodeDefinitions ns and name _is_
    // known at this point.
    node = this.nodes[link.target.id];

    if (this.nodeDefinitions[node.ns][node.name]
      .ports.input[link.target.port].type === 'array') {

      if (last.target.id === link.target.id &&
        last.target.port === link.target.port) {
        last.index = c++;
        link.index = c;
      }
      else {
        c = 0; // reset
      }
      last = link;

    }
  }

};

Actor.prototype.hasParent = function() {
  return false;
};

module.exports = Actor;

},{"../lib/context/defaultProvider":16,"../lib/io/mapHandler":19,"../lib/multisort":21,"../lib/process/defaultManager":28,"./connector":15,"./flow":17,"./link":20,"./node":22,"./node/polymer":24,"./packet":25,"./run":30,"./validate":34,"chix-loader":41,"debug":42,"events":2,"util":7,"uuid":114}],15:[function(require,module,exports){
'use strict';

var util    = require('util');
var Setting = require('./setting');

/**
 *
 * Connector
 *
 * The thing you plug into a port.
 *
 * Contains information about port and an optional
 * action to perform within the node (subgraph)
 *
 * Can also contains port specific settings.
 *
 * An xLink has a source and a target connector.
 *
 * ................... xLink ....................
 *
 *  -------------------.    .------------------
 * | Source Connector -------  Target Connector |
 *  ------------------'     `------------------
 *
 * When a link is plugged into a node, we do so
 * by plugging the target connector.
 *
 * @constructor
 * @public
 *
 */
function Connector(settings) {
  Setting.apply(this, [settings]);
  this.wire = undefined;
}

util.inherits(Connector, Setting);

/**
 *
 * Plug
 *
 * TODO: plug is not the correct name
 *
 * @param {String} id - TODO: not sure which id, from the node I pressume..
 * @param {String} port
 * @param {String} action
 */
Connector.prototype.plug = function(id, port, action) {
  this.id     = id;
  this.port   = port;
  if (action) {
    this.action = action;
  }
};

/**
 *
 * Create
 *
 * Creates a connector
 *
 * @param {String} id - TODO: not sure which id, from the node I pressume..
 * @param {String} port
 * @param {Object} settings
 * @param {String} action
 */
Connector.create = function(id, port, settings, action) {

  var c = new Connector(settings);
  c.plug(id, port, action);
  return c;

};

/**
 *
 * Register process id this connector handles.
 *
 */
Connector.prototype.setPid = function(pid) {
  this.pid = pid;
};

Connector.prototype.toJSON = function() {

  var ret = {
    id: this.id,
    port: this.port
  };

  if (this.setting) {
    ret.setting = JSON.parse(JSON.stringify(this.setting));
  }

  if (this.action) {
    ret.action = this.action;
  }

  return ret;

};

module.exports = Connector;

},{"./setting":33,"util":7}],16:[function(require,module,exports){
'use strict';

/**
 *
 * Default Context Provider
 *
 * @constructor
 * @public
 */
function DefaultProvider() {

}

DefaultProvider.prototype.addContext = function(node, defaultContext) {

  if (typeof defaultContext !== 'undefined') {
    node.addContext(defaultContext);
  }

};

module.exports = DefaultProvider;

},{}],17:[function(require,module,exports){
'use strict';

var Packet = require('./packet');
var util = require('util');
var xLink = require('./link');
var validate = require('./validate');
var Actor = require('./actor');
var Connections = require('./ConnectionMap');
var debug = require('debug')('chix:flow');

/**
 *
 * This FlowNode extends the Actor.
 *
 * What it mainly does is delegate what it it asked to do
 * To the nodes from the actor.
 *
 * External Interface is not really needed anymore.
 *
 * Because the flow has ports just like a normal node
 *
 * @constructor
 * @public
 *
 */
function Flow(id, map, identifier, loader, ioHandler, processManager) {

  var self = this;

  if (!id) {
    throw Error('xFlow requires an id');
  }

  if (!map) {
    throw Error('xFlow requires a map');
  }

  // Call the super's constructor
  Actor.apply(this, arguments);

  if (loader) {
    this.loader = loader;
  }
  if (ioHandler) {
    this.ioHandler = ioHandler;
  }

  if (processManager) {
    this.processManager = processManager;
  }

  // External vs Internal links
  this.linkMap = {};

  // indicates whether this is an action instance.
  this.actionName = undefined;

  // TODO: trying to solve provider issue
  this.provider = map.provider;

  this.providers = map.providers;

  this.actions = {};

  // initialize both input and output ports might
  // one of them be empty.
  if (!map.ports) {
    map.ports = {};
  }
  if (!map.ports.output) {
    map.ports.output = {};
  }
  if (!map.ports.input) {
    map.ports.input = {};
  }

  /*
    // make available always.
    node.ports.output['error'] = {
      title: 'Error',
      type: 'object'
    };
  */

  this.id = id;

  this.name = map.name;

  this.type = 'flow';

  this.title = map.title;

  this.description = map.description;

  this.ns = map.ns;

  this.active = false;

  this.metadata = map.metadata || {};

  this.identifier = identifier || [
    map.ns,
    ':',
    map.name
  ].join('');

  this.ports = JSON.parse(
    JSON.stringify(map.ports)
  );

  // Need to think about how to implement this for flows
  // this.ports.output[':complete'] = { type: 'any' };

  this.runCount = 0;

  this.inPorts = Object.keys(
    this.ports.input
  );

  this.outPorts = Object.keys(
    this.ports.output
  );

  //this.filled = 0;

  this.chi = undefined;

  this._interval = 100;

  // this.context = {};

  this.nodeTimeout = map.nodeTimeout || 3000;

  this.inputTimeout = typeof map.inputTimeout === 'undefined' ?
    3000 :
    map.inputTimeout;

  this._hold = false; // whether this node is on hold.

  this._inputTimeout = null;

  this._openPorts = [];

  this._connections = new Connections();

  this._forks = [];

  debug('%s: addMap', this.identifier);
  this.addMap(map);

  this.fork = function() {

    var Fork = function Fork() {
      this.nodes = {};
      //this.context = {};

      // same ioHandler, tricky..
      // this.ioHandler = undefined;
    };

    // Pre-filled baseActor is our prototype
    Fork.prototype = this.baseActor;

    var FActor = new Fork();

    // Remember all forks for maintainance
    self._forks.push(FActor);

    // Each fork should have their own event handlers.
    self.listenForOutput(FActor);

    return FActor;

  };

  this.listenForOutput();

  this.initPortOptions = function() {

    // Init port options.
    for (var port in self.ports.input) {
      if (self.ports.input.hasOwnProperty(port)) {

        // This flow's port
        var thisPort = self.ports.input[port];

        // set port option
        if (thisPort.options) {
          for (var opt in thisPort.options) {
            if (thisPort.options.hasOwnProperty(opt)) {
              self.setPortOption(
                'input',
                port,
                opt,
                thisPort.options[opt]);
            }
          }
        }

      }
    }
  };

  // Too late?
  this.setup();

  this.setStatus('created');

}

util.inherits(Flow, Actor);

Flow.prototype.action = function(action) {

  if (!this.actions.hasOwnProperty(action)) {

    throw Error('this.action should return something with the action map');
    /*
        var ActionActor = this.action(action);

        // ActionActor.map.ports = this.ports;

        // not sure what to do with the id and identifier.
        // I think they should stay the same, for now.
        //
        this.actions[action] = new Flow(
          this.id,
          // ActionActor, // BROKEN
          map, // action definition should be here
          this.identifier + '::' + action
        );

        // a bit loose this.
        this.actions[action].actionName = action;

        //this.actions[action].ports = this.ports;
    */

  }

  return this.actions[action];

};

Flow.prototype.setup = function() {

  this.initPortOptions();

};

/**
 *
 * For forking it is relevant when this addContext is done.
 * Probably this addContext should be done on baseActor.
 * So subsequent forks will have the updated context.
 * Yeah, baseActor is the fingerprint, currentActor is the
 * current one, this._actors is the array of instantiated forks.
 *
 */
Flow.prototype.addContext = function(context) {

  debug('%s: addContext', this.identifier);
  var port;
  for (port in context) {

    if (context.hasOwnProperty(port)) {

      var portDef = this.getPortDefinition(port, 'input');

      if (context.hasOwnProperty(port)) {
        this.getNode(portDef.nodeId)
          .setContextProperty(portDef.name, context[port]);

        // Maybe too easy, but see if it works.
        // Reset when all are filled, then fork.
        //this.filled++;

      }

    }
  }
};

Flow.prototype.setContextProperty = function(port, data) {

  var portDef = this.getPortDefinition(port, 'input');
  this.getNode(portDef.nodeId).setContextProperty(portDef.name, data);

};

Flow.prototype.clearContextProperty = function(port) {

  var portDef = this.getPortDefinition(port, 'input');
  this.getNode(portDef.nodeId).clearContextProperty(portDef.name);

};

Flow.prototype._delay = 0;

Flow.prototype.inputPortAvailable = function(target) {

  if (target.action && !this.isAction()) {

    return this.action(target.action).inputPortAvailable(target);

  }
  else {

    // little bit too much :start hacking..
    // probably causes the :start problem with clock
    if (target.port === ':start') {

      return true;

    }
    else {

      var portDef = this.getPortDefinition(target.port, 'input');

      if (!this.linkMap.hasOwnProperty(target.wire.id)) {
        throw Error('Cannot find internal link within linkMap');
      }

      return this.getNode(portDef.nodeId)
        .inputPortAvailable(this.linkMap[target.wire.id].target);

    }

  }
};

// TODO: both flow & node can inherit this stuff

Flow.prototype.getStatus = function() {

  return this.status;

};

Flow.prototype.setStatus = function(status) {

  this.status = status;
  this.event(':statusUpdate', {
    node: this.export(),
    status: this.status
  });

};

Flow.prototype.error = function(node, err) {

  var error = util.isError(err) ? err : Error(err);

  // TODO: better to have full (custom) error objects
  var eobj = {
    node: node.export(),
    msg: err
  };

  // Update our own status, this should status be resolved
  // Create a shell? yep..
  node.setStatus('error');

  // Used for in graph sending
  node.event(':error', eobj);

  // Used by Process Manager or whoever handles the node
  node.emit('error', eobj);

  return error;
};

Flow.prototype.fill = function(target, p) {

  debug('%s:%s fill', this.identifier, target.port);

  if (target.action && !this.isAction()) {

    // NOTE: action does not take fork into account?
    // test this later. it should be in the context of the currentActor.
    return this.action(target.action).fill(target, p);

  }
  else {

    if (target.port === ':start') {

      // :start is pushing the actor, so exposing a :start
      // port does not make much sense.
      this.event(':start', {
        node: this.export()
      });

      this.setStatus('started');
      debug('%s::start this.push()', this.identifier);
      this.push();
      return true;

    }
    else {

      // delegate this to the node this port belongs to.
      var portDef = this.getPortDefinition(target.port, 'input');

      var node = this.getNode(portDef.nodeId);

      if (!this.linkMap.hasOwnProperty(target.wire.id)) {
        throw Error('link not found within linkMap');
      }

      var err = node.fill(this.linkMap[target.wire.id].target, p);

      if (util.isError(err)) {

        Flow.error(this, err);

        return err;

      }
      else {

        this.event(':start', {
          node: this.export()
        });

        //this.filled++;
/*
        // fishy, also, is filled used at all for flow?
        // filled is irrelevant for flow.
        if (this.filled === this._connections.size) {

          // do not fork for now
          // this.currentActor = this.fork();
          // this.currentActor.run();

          this.filled = 0;

        }
*/

        return true;

      }

    }

  }

};

Flow.prototype.setMetadata = function(metadata) {
  this.metadata = metadata;
};

Flow.prototype.setMeta = function(key, value) {
  this.metadata[key] = value;
};

/**
 *
 * Checks whether the port exists at the node
 * this Flow is relaying for.
 *
 * @param {String} type
 * @param {String} port
 */
Flow.prototype.portExists = function(type, port) {

  // this returns whether this port exists for _us_
  // it only considers the exposed ports.
  var portDef = this.getPortDefinition(port, type);
  return this.getNode(portDef.nodeId).portExists(type, portDef.name);

};

/**
 *
 * Checks whether the port is open at the node
 * this Flow is relaying for.
 *
 * @param {String} port
 */
Flow.prototype.portIsOpen = function(port) {

  // the port open logic is about _our_ open and exposed ports.
  // yet ofcourse it should check the real node.
  // so also delegate.
  var portDef = this.getPortDefinition(port, 'input');
  // Todo there is no real true false in portIsOpen?
  // it will fail hard.
  return this.getNode(portDef.nodeId).portIsOpen(portDef.name);

};

/**
 *
 * Get _this_ Flow's port definition.
 *
 * The definition contains the _real_ portname
 * of the node _this_ port is relaying for.
 *
 * @param {String} port
 */

// JIKES, if we only need the ports we are all good..
Flow.prototype.getPortDefinition = function(port, type) {
  // uhm ok, we also need to add the start port
  if (this.ports[type].hasOwnProperty(port)) {
    return this.ports[type][port];
  }
  else {
    throw new Error(
      util.format(
        'Unable to find exported port definition for %s port `%s` (%s:%s)\n' +
        '\tAvailable ports: %s',
        type,
        port,
        this.ns,
        this.name,
        Object.keys(this.ports.input).toString()
      )
    );
  }
};

Flow.prototype.getPort = function(type, name) {
  return this.getPortDefinition(name, type);
};

/**
 *
 * Get the port option at the node
 * this flow is relaying for.
 *
 * @param {String} type
 * @param {String} port
 * @param {String} option
 */
Flow.prototype.getPortOption = function(type, port, option) {

  // Exposed ports can also have options set.
  // if this is _our_ port (it is exposed)
  // just delegate this to the real node.
  var portDef = this.getPortDefinition(port, type);
  // Todo there is no real true false in portIsOpen?
  // it will fail hard.
  return this.getNode(portDef.nodeId).getPortOption(type, portDef.name, option);
};

/**
 *
 * Sets an input port option.
 *
 * The node schema for instance can specifiy whether a port is persistent.
 *
 * At the moment a connection can override these values.
 * It's a way of saying I give you this once so take care of it.
 *
 * Ok, with forks running this should eventually be much smarter.
 * If there are long running flows, all instances should have their
 * ports updated.
 *
 * Not sure when setPortOption is called, if it is called during 'runtime'
 * there is no problem and we could just set it on the current Actor.
 * I could also just already fix it and update baseActor and all _actors.
 * which would be sufficient.
 *
 * Anyway, this._actors is nice, however what to do with other forking methods.
 * Nevermind first do this.
 *
 */
Flow.prototype.setPortOption = function(type, port, opt, value) {
  var portDef = this.getPortDefinition(port, type);
  this.getNode(portDef.nodeId).setPortOption(type, portDef.name, opt, value);
};

Flow.prototype.openPort = function(port) {
  if (this._openPorts.indexOf(port) === -1) {
    this._openPorts.push(port);
  }
};

Flow.prototype.isAction = function() {

  return !!this.actionName;

};

// TODO: implement
//Flow.prototype.unplug = function(target) {
Flow.prototype.unplug = function(target) {

  if (target.action && !this.isAction()) {

    this.action(target.action).unplug(target);

  }
  else {

    // unplug logic

  }

};

/**
 *
 * Set port to open state
 *
 * This is a problem, xFlow has it's ports opened.
 * However this also means baseActor and all the forks
 * Should have their ports opened.
 *
 * Ok, not a problem, only that addition of the :start port
 * is a problem. Again not sure at what point plug()
 * is called. I think during setup, but later on also
 * in realtime. anyway for now I do not care so much about
 * realtime. Doesn't make sense most of the time.
 *
 * @param {Connector} target
 * @public
 */
Flow.prototype.plug = function(target) {

  if (target.action && !this.isAction()) {

    this.action(target.action).plug(target);

  }
  else {

    if (target.port === ':start') {
      this.addPort('input', ':start', {
        type: 'any'
      });
    }

    // delegate this to the real node
    // only if this is one of _our_ exposed nodes.
    //var portDef = this.getPortDefinition(target.port, 'input');
    var portDef = this.getPortDefinition(target.port, 'input');

    // start is not an internal port, we will do a push on the internal
    // actor and he may figure it out..
    //if (target.port !== ':start') {
    if (target.port !== ':start') {

      // The Node we are gating for
      var internalNode = this.getNode(portDef.nodeId);

      var xlink = new xLink();
      // just define our node as the source, and the external port
      xlink.setSource(this.id, target.port, {}, target.action);
      xlink.setTarget(target.id, portDef.name, {}, target.action);

      for (var k in target.setting) {
        if (target.setting.hasOwnProperty(k)) {
          xlink.target.set(k, target.setting[k]);
        }
      }

      // fixed settings
      if (portDef.hasOwnProperty('setting')) {
        for (k in portDef.setting) {
          if (portDef.setting.hasOwnProperty(k)) {
            xlink.target.set(k, portDef.setting[k]);
          }
        }
      }

      internalNode.plug(xlink.target);

      // Copy the port type, delayed type setting, :start is only known after
      // the port is opened...
      this.ports.input[target.port].type =
        internalNode.ports.input[xlink.target.port].type;

      // we add our internalLink as reference to our link.
      // a bit of a hack, it's not known by the definition of
      // Link itself
      target.wire.internalLink = xlink;

      // outer/inner mapping
      this.linkMap[target.wire.id] = xlink;

    }
    else {
      // what to do with start port?
    }

    // use same logic for our own ports
    if (!this._connections.hasOwnProperty(target.port)) {
      this._connections[target.port] = [];
    }

    this._connections[target.port].push(target.wire);

    this.openPort(target.port);

  }

};

Flow.prototype.exposePort = function(type, nodeId, port, name) {

  var p;
  var node = this.getNode(nodeId);

  if (node.ports[type]) {
    for (p in node.ports[type]) {

      if (node.ports[type].hasOwnProperty(p)) {

        if (p === port) {

          // not sure, is this all info?
          this.addPort(type, name, {
            nodeId: nodeId,
            name: port
          });

          continue;
        }
      }
    }
  }

  this.emit('addPort', {
    node: this.export(),
    port: name
  });

};

Flow.prototype.removePort = function(type, name) {

  if (this.ports[type][name]) {

    delete this.ports[type][name];

    this.emit('removePort', {
      node: this.export(),
      port: name
    });

  }

};

Flow.prototype.renamePort = function(type, from, to) {

  var id;

  if (this.ports[type][from]) {

    this.ports[type][to] = JSON.parse(
      JSON.stringify(this.ports[type][from])
    );

    // update links pointing to us.
    // updates ioHandler also because it holds
    // references to these links
    // TODO: pid/id warning...
    // renaming will only update this instance.
    // accidently these links will make each instance
    // point to the new ports, however not each instance
    // has it's port renamed..
    // For rename it's better to stop the graph
    // update the definition itself then start it again
    // Because for instance the io handler will still send
    // to old ports.
    for (id in this.links) {
      if (type === 'input' &&
        this.links[id].target.id === this.id &&
        this.links[id].target.port === from) {

        this.links[id].target.port = to;

      }
      else if (type === 'output' &&
        this.links[id].source.id === this.id &&
        this.links[id].source.port === from) {

        this.links[id].source.port = to;
      }
    }

    delete this.ports[type][from];

    this.emit('renamePort', {
      node: this.export(),
      from: from,
      to: to
    });

  }

};

Flow.prototype.addPort = function(type, name, def) {

  // add it to known ports
  if (!this.ports[type]) {
    this.ports[type] = {};
  }

  this.ports[type][name] = def;

  if (type === 'input') {
    this.inPorts = Object.keys(this.ports[type]);
  }
  else {
    this.outPorts = Object.keys(this.ports[type]);
  }
};

/**
 *
 * Close the port of the node we are relaying for
 * and also close our own port.
 *
 * @param {String} port
 */
Flow.prototype.closePort = function(port) {
  // delegate this to the real node
  // only if this is one of _our_ exposed nodes.
  var portDef = this.getPortDefinition(port, 'input');

  if (port !== ':start') {

    this.getNode(portDef.nodeId).closePort(portDef.name);
    // this._forks.forEach(function(fork) {
    //  fork.getNode(portDef.nodeId).closePort(portDef.name);
    //});
  }

  if (this.ports.input[port]) {
    this._openPorts.splice(
      this._openPorts.indexOf(port), 1
    );
  }

  this._connections[port].pop();

};

Flow.prototype.hasConnections = function() {
  return this._openPorts.length;
};

/**
 *
 * Puts this flow on hold.
 *
 * NOT IMPLEMENTED YET
 *
 * This should stop each and every fork.
 *
 */
Flow.prototype.hold = function() {

  // implement later, holds input for _this_ flow
  this._hold = true;
  this.stop();
  /*
  this._forks.forEach(function(fork) {
    fork.stop();
  });
  */
};

/**
 *
 * Releases the node if it was on hold
 *
 * This should resume each and every fork.
 *
 * @public
 */
Flow.prototype.release = function() {

  // TODO: these are all just on the actor, not sure Flow also needs it.

  this._hold = false;
  this.resume();
  /*
  this._forks.forEach(function(fork) {
    fork.resume();
  });
  */
};

/**
 *
 * Complete function
 *
 * @public
 */
Flow.prototype.complete = function() {

  // todo: check this.ready stuff logic.
  this.ready = false;
  this.active = false;

};

Flow.prototype.portHasConnection = function(port, link) {
  if (this._connections.hasOwnProperty(port)) {
    return this._connections[port].indexOf(link) >= 0;
  }
  else {
    return false;
  }
};

Flow.prototype.portHasConnections = function(port) {
  if (this._connections.hasOwnProperty(port)) {
    return this._connections[port].length >= 0;
  }
  else {
    return false;
  }
};

Flow.prototype.portGetConnections = function(port) {
  return this._connections[port];
};

/**
 *
 * Listen for output on 'our' ports
 *
 * The internal Actor will actually listen just like the normal actor.
 *
 * @public
 */
Flow.prototype.listenForOutput = function() {

  var port;
  var internalPort;
  var self = this;

  // not really used yet, but this would envolve just
  // commanding all nodes to shutdown,
  // which will be a simple loop.
  // baseActor loop doesn't make much sense but ah well.
  //
  function outputHandler(port, internalPort) {
    return function internalPortHandlerFlow(data) {
      if (internalPort === data.port) {

        debug('%s:%s output', self.identifier, port);
        self.sendPortOutput(port, data.out);

        // there is no real way to say a graph has executed.
        // So just consider each output as an execution.
        // TODO: a bit expensive
        self.event(':executed', {
          node: self.export()
        });

      }
    };
  }

  function freePortHandler(externalPort, internalPort) {

    return function freePortHandlerFlow(event) {

      if (internalPort === event.port) {

        if (self._connections.hasOwnProperty(externalPort)) {

          var extLink;
          var conns = self._connections[externalPort];
          for (var i = 0; i < conns.length; i++) {
            if (conns[i].internalLink === event.link) {
              extLink = conns[i];
              break; // yeay..
            }
          }

          if (!extLink) {
            throw Error('Cannot determine outer link');
          }
          else {
            debug('%s:%s :freePort', self.identifier, externalPort);
            self.event(':freePort', {
              node: self.export(),
              link: extLink,
              port: externalPort
            });

            self.emit('freePort', {
              node: self.export(),
              link: extLink,
              port: externalPort
            });
          }

        }
        else {
          // no connections.
        }

      }
    };
  }

  var internalNode;
  if (this.ports.output) {
    for (port in this.ports.output) {
      if (this.ports.output.hasOwnProperty(port)) {
        internalPort = this.ports.output[port];
        // These bypass the IOHandler, but that's ok, they
        // are just external internal port mappings.
        internalNode = this.getNode(internalPort.nodeId);
        internalNode.on('output', outputHandler(port, internalPort.name));
      }
    }
  }

  if (this.ports.input) {
    for (port in this.ports.input) {
      if (this.ports.input.hasOwnProperty(port)) {
        internalPort = this.ports.input[port];
        // These bypass the IOHandler, but that's ok, they
        // are just external internal port mappings.
        internalNode = this.getNode(internalPort.nodeId);
        internalNode.on('freePort', freePortHandler(port, internalPort.name));
      }
    }
  }
};

/**
 *
 * Runs the shutdown method of the blackbox
 *
 * NOT IMPLEMENTED
 *
 * @public
 */
Flow.prototype.shutdown = function() {

  // not really used yet, but this would envolve just
  // commanding all nodes to shutdown,
  // which will be a simple loop.
};

/**
 *
 * Return a serializable export of this flow.
 *
 * @public
 */
Flow.prototype.export = function() {

  return {

    id: this.id,
    pid: this.pid,
    ns: this.ns,
    name: this.name,
    identifier: this.identifier,
    ports: this.ports,
    // cycles: this.cycles,
    inPorts: this.inPorts,
    outPorts: this.outPorts,
    //filled: this.filled,
    // context: this.context,
    active: this.active,
    provider: this.provider,
    // input: this._filteredInput(),
    openPorts: this._openPorts,
    // nodeTimeout: this.nodeTimeout,
    // inputTimeout: this.inputTimeout
  };

};

/**
 *
 * Export this modified instance to a nodedefinition.
 *
 * @public
 */
Flow.prototype.toJSON = function() {

  var def = {
    id: this.id,
    ns: this.ns,
    name: this.name,
    title: this.title,
    type: this.type,
    description: this.description,
    // should not be the full nodes
    nodes: [],
    links: [],
    ports: this.ports,
    providers: this.providers
  };

  for (var name in this.nodes) {
    if (this.nodes.hasOwnProperty(name)) {
      def.nodes.push(this.nodes[name].toJSON());
    }
  }

  for (var id in this.links) {
    if (this.links.hasOwnProperty(id)) {
      def.links.push(this.links[id].toJSON());
    }
  }

  validate.flow(def);

  return def;

};

Flow.prototype.isStartable = function() {

  // err ok, how to determine this.
  // a flow is always startable?
  // ok for now it is..
  // it should'nt though..
  return true;

};

Flow.prototype.event = function(port, output) {
  var p = new Packet(output);
  this.sendPortOutput(port, p);
};

Flow.prototype.sendPortOutput = function(port, p) {

  // important identifies from what action this output came.
  // used by connections to determine if it should consume
  // the output.

  var out = {
    node: this.export(),
    port: port,
    out: p
  };

  if (this.isAction()) {
    out.action = self.action;
  }

  this.emit('output', out);

};

Flow.prototype.destroy = function() {

  // just ask all nodes to destroy themselves
  // and finally do the same with self
  for (var id in this.nodes) {
    if (this.nodes.hasOwnProperty(id)) {
      this.nodes.destroy();
    }
  }

};

Flow.prototype.setPid = function(pid) {

  this.pid = pid;

};

/**
 *
 * Create an xFlow
 *
 * Some kind of logic as the actor
 *
 * @api public
 */
Flow.create = function(map, loader, ioHandler, processManager) {

  var actor = new Flow(
    map.id,
    map,
    map.ns + ':' + map.name,
    loader,
    ioHandler,
    processManager
  );

  return actor;
};

Flow.prototype.reset = function() {

  this.runCount = 0;
  //this.filled = 0;

  // ask all our nodes to reset.
  // TODO: will be done double if the IO manager
  // also ask all nodes to reset itself.
  for (var id in this.nodes) {
    if (this.nodes.hasOwnProperty(id)) {
      this.nodes.reset();
    }
  }

};

/**
 *
 * Helper function to make the flow an npm module itself.
 *
 * Usage:
 *
 *   Ok, here is the clash...
 *   xFlow needs way to much information to initialize.
 *   It should have the same interface as actor.
 *
 *   var xflow = new xFlow:create(map, loader);
 *   xflow.addMap(map);
 *
 *   module.exports = xflow.expose;
 *
 *   ---
 *
 *   var flow = require('my-flow');
 *
 *   flow({
 *     in: 'some_data',
 *     in2: 'other_data'
 *   }, {
 *     out: function(data) {
 *       // do something with data..
 *     }
 *   });
 *
 * Ok, then what about the actions.
 *
 */
Flow.prototype.expose = function(input, output) {

  var iips = [];
  var key;
  var self = this;
  if (this.hasOwnProperty('ports')) {

    if (this.ports.hasOwnProperty('input')) {

      for (key in input) {

        if (input.hasOwnProperty(key)) {

          var iip;
          var inputPorts = this.ports.input;

          if (inputPorts.hasOwnProperty(key)) {

            iip = {
              target: {
                id: inputPorts[key].nodeId,
                port: inputPorts[key].name,
              },
              data: input[key]
            };

            iips.push(iip);

            // Within the exposed ports these should
            // already be set if they must be used.
            // (implement that) they are not properties
            // a caller should set.
            //
            // target.settings,
            // target.action

          }
          else {

            throw Error(util.format('No such input port %s', key));

          }

        }

      }

    }
    else {
      throw Error('The map provided does not have any input ports available');
    }

    if (output) {

      var cb = output;

      if (this.ports.hasOwnProperty('output')) {

        /////// setup callbacks
        this.on('output', function output(data) {
          if (data.node.id === self.id && cb.hasOwnProperty(data.port)) {
            cb[data.port](data.out);
          }
        });

      }
      else {
        throw Error(
          'The map provided does not have any output ports available'
        );
      }

    }

  }
  else {
    throw Error('The map provided does not have any ports available');
  }

  // start it all
  if (iips.length) {
    this.sendIIPs(iips);
  }

  this.push();

  return this;

};

Flow.prototype.getConnections = function() {
  return this._connections;
};

/**
 *
 * Adds the parent Actor.
 *
 * For now this is only used to copy the events.
 *
 * It causes all nested actors to report to the root
 * actor's listeners.
 *
 * Rather important, otherwise you would
 * only get the events from the first root Actor/Flow
 *
 * @param {Object} actor
 */
Flow.prototype.setParent = function(actor) {
  this.parent = actor;
};

Flow.prototype.getParent = function() {
  return this.parent;
};

Flow.prototype.hasParent = function() {
  return !!this.parent;
};

module.exports = Flow;

},{"./ConnectionMap":13,"./actor":14,"./link":20,"./packet":25,"./validate":34,"debug":42,"util":7}],18:[function(require,module,exports){
'use strict';

var util = require('util');

/**
 *
 * Handles the index
 *
 * @param {Link} link
 * @param {Packet} p
 * @api public
 */
module.exports = function handleIndex(link, p) {
  // TODO: data should be better defined and a typed object
  var index = link.source.get('index');
  if (/^\d+/.test(index)) {
    // numeric
    if (Array.isArray(p.data)) {
      if (index < p.data.length) {
        // new remember index.
        p.index = index;
        return p.data[index];
      }
      else {
        throw new Error(
          util.format(
            'index[] out-of-bounds on array output port `%s`',
            link.source.port
          )
        );
      }
    }
    else {
      throw new Error(
        util.format(
          'Got index[] on array output port `%s`, ' +
          'but data is not of the array type',
          link.source.port
        )
      );
    }
  }
  else {
    if (typeof p.data === 'object') {
      if (p.data.hasOwnProperty(index)) {
        // new remember index.
        p.index = index;
        return p.data[index];
      }
      else {
        // maybe do not fail hard and just send to the error port.
        console.log(p.data);
        throw new Error(
          util.format(
            'Property `%s` not found on object output port `%s`',
            index,
            link.source.port
          )
        );
      }
    }
    else {
      throw new Error(
        util.format(
          'Got index[] on non-object output port %s',
          link.source.port
        )
      );
    }
  }
};

},{"util":7}],19:[function(require,module,exports){
'use strict';
var Packet = require('../packet');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var CHI = require('chix-chi');
var uuid = require('uuid').v4;
var handleIndex = require('./indexHandler');
var isPlainObject = require('is-plain-object');
var DefaultQueueManager = require('../queue/defaultManager');
var debug = require('debug')('chix:io');

function cloneData(p, type) {
  /* function type does not mean the data itself is directly
   * a function, it can also be a plain object holding
   * functions. so what is specified is leading.
   */
  if (type === 'function') {
    return;
  }
  if (typeof p.data === 'object' && isPlainObject(p.data)) {
    p.data = JSON.parse(JSON.stringify(p.data));
  }
}

/**
 *
 * This is the IoMap Handler
 *
 * It should know:
 *
 *  - the connections.
 *  - address of the source UUID + port name
 *  - address of the target UUID + port name
 *  - relevant source & target connection settings.
 *
 * Connection settings can overlap with port settings.
 * Connection settings take precedence over port settings,
 * althought this is not set in stone.
 *
 * @constructor
 * @public
 *
 **/

function IoMapHandler() {
  this.CHI = new CHI();
  // todo: create maps from each of these and wrap them in a connections map
  // so all there wil be is this.connections.
  // connections.byTarget, connections.bySource etc.
  this.targetMap = {};
  this.connections = {};
  this.sourceMap = {};
  this.syncedTargetMap = {};
  this.pointerPorts = {};
  this._shutdown = false;
  this.addQueueManager(
    new DefaultQueueManager(this.receiveFromQueue.bind(this))
  );
  this.addCHI(this.CHI);
}

util.inherits(IoMapHandler, EventEmitter);

IoMapHandler.prototype.addCHI = function(CHI) {
  this.CHI = CHI;
  this.CHI.on('begingroup', this.beginGroup.bind(this));
  this.CHI.on('endgroup', this.sendGroup.bind(this));
  this.CHI.on('collected', this.collected.bind(this));
  this.CHI.on('synced', this.sendSynced.bind(this));
};

/**
 *
 * Connects ports together using the link information provided.
 *
 *  @param {xLink} link
 * @api public
 */
IoMapHandler.prototype.connect = function(link) {
  if (!link.source) {
    throw Error('Link requires a source');
  }
  if (!link.source.pid) {
    link.source.pid = link.source.id;
  }
  // TODO: quick fix, which never works..
  // ioHandler is the only one assigning these..
  // a link with ioid set should be rejected..
  if (!link.ioid) {
    link.ioid = uuid();
  }
  if (!link.target) {
    throw Error('Link requires a target');
  }
  if (!link.target.pid) {
    link.target.pid = link.target.id;
  }
  // register the connection
  this.connections[link.ioid] = link;
  if (!this.targetMap[link.source.pid]) {
    this.targetMap[link.source.pid] = [];
  }
  this.targetMap[link.source.pid].push(link);
  if (!this.sourceMap[link.target.pid]) {
    this.sourceMap[link.target.pid] = [];
  }
  this.sourceMap[link.target.pid].push(link);
  // build the syncedTargetMap, it contains a port array
  // (the group that wants a sync with some originId
  if (link.target.has('sync')) {
    if (!this.syncedTargetMap[link.target.pid]) {
      this.syncedTargetMap[link.target.pid] = {};
    }
    if (!this.syncedTargetMap[link.target.pid][link.target.get('sync')]) {
      this.syncedTargetMap[link.target.pid][link.target.get('sync')] = [];
    }
    this.syncedTargetMap[link.target.pid][link.target.get('sync')]
      .push(link.target.port);
    debug(
      '%s: syncing source port `%s` with target port %s',
      link.ioid, link.target.get('sync'), link.target.port
    );
  }
  if (link.source.get('pointer')) {
    if (!this.pointerPorts[link.source.pid]) {
      this.pointerPorts[link.source.pid] = [];
    }
    this.pointerPorts[link.source.pid].push(link.source.port);
    debug('%s: added pointer port `%s`', link.ioid, link.source.port);
  }

  debug('%s: link connected', link.ioid);

  this.emit('connect', link);
};

// TODO: ugly, source & target map
// should be one central place of registration.
// now a link is in two places.
IoMapHandler.prototype.get = function(link) {
  if (this.sourceMap[link.target.pid]) {
    return this.sourceMap[link.target.pid];
  }
};

IoMapHandler.prototype.lock = function(link) {
  debug('%s: lock', link.ioid);
  this.queueManager.lock(link.ioid);
};

IoMapHandler.prototype.unlock = function(link) {
  debug('%s: unlock', link.ioid);
  this.queueManager.unlock(link.ioid);
};

IoMapHandler.prototype.accept = function(link /*, p*/ ) {
  debug('%s: accept', link.ioid);
  // update the fill count.
  // normally belongs to a Port Object.
  link.fills++;
  // re-open queue for this link.
  if (this.queueManager.isLocked(link.ioid)) {
    // freePort will do this now.
    this.queueManager.unlock(link.ioid);
  }
};

IoMapHandler.prototype.reject = function(err, link, p) {
  // update the reject count.
  // normally belongs to a Port Object.
  link.rejects++;
  this.queueManager.lock(link.ioid);
  // Do not put it back in queue if there was a *real* error
  // Default error is `false`, which is just a normal reject.
  if (util.isError(err)) {
    debug('%s: reject (error)', link.ioid);
    // stays locked.
  }
  else {
    // put it back in queue.
    debug('%s: reject (requeue)', link.ioid);
    this.queueManager.unshift(link.ioid, p);
    // unlock again
    // stay locked, untill unlocked
    // IMPORTANT! unlock logic must just work
    // otherwise it goes beserk.
    // this.queueManager.unlock(link.ioid);
    // The process manager is listening for the node
    // which is already in error state
    // this.emit('error', err);
  }
};

/**
 *
 *  Disconnects a link
 *
 *  @param {xLink} link
 */
IoMapHandler.prototype.disconnect = function(link) {
  var src;
  var tgt;
  // unregister the connection
  if (this.connections.hasOwnProperty(link.ioid)) {
    delete this.connections[link.ioid];
  }
  else {
    throw Error('Cannot disconnect an unknown connection');
  }
  if (this.targetMap[link.source.pid]) {
    src = this.targetMap[link.source.pid];
    src.splice(src.indexOf(link), 1);
    if (src.length === 0) {
      delete this.targetMap[link.source.pid];
    }
  }
  if (this.sourceMap[link.target.pid]) {
    tgt = this.sourceMap[link.target.pid];
    tgt.splice(tgt.indexOf(link), 1);
    if (tgt.length === 0) {
      delete this.sourceMap[link.target.pid];
    }
  }
  if (this.syncedTargetMap[link.target.pid]) {
    tgt = this.syncedTargetMap[link.target.pid];
    tgt.splice(src.indexOf(link.target.port), 1);
    if (tgt.length === 0) {
      delete this.syncedTargetMap[link.target.pid];
    }
  }
  if (this.pointerPorts[link.source.pid]) {
    src = this.pointerPorts[link.source.pid];
    src.splice(src.indexOf(link.source.port), 1);
    if (src.length === 0) {
      delete this.pointerPorts[link.source.pid];
    }
  }
  debug('%s: disconnected', link.ioid);
  // prevents iip bug, where iip is still queued.
  // disconnect does not correctly take queueing into account.
  delete link.ioid;

  // used by actor to close ports
  this.emit('disconnect', link);
};

/**
 *
 * Get all node ids that target this node.
 *
 * TODO: return .id's not .pid ah well..
 *
 * @param {String} pid
 * @return {Array}
 * @api public
 */
IoMapHandler.prototype.getSourcePids = function(pid) {
  var i;
  var src;
  var ids = [];
  if (this.sourceMap.hasOwnProperty(pid)) {
    for (i = 0; i < this.sourceMap[pid].length; i++) {
      src = this.sourceMap[pid][i].source;
      if (ids.indexOf(src.pid) === -1) {
        ids.push(src.pid);
      }
    }
  }
  return ids;
};

/**
 *
 * Get all nodes that use this node as a source .
 *
 * @param {String} pid
 * @return {Array}
 * @api public
 */
IoMapHandler.prototype.getTargetPids = function(pid) {
  var i;
  var ids = [];
  if (this.targetMap.hasOwnProperty(pid)) {
    for (i = 0; i < this.targetMap[pid].length; i++) {
      ids.push(this.targetMap[pid][i].target.pid);
    }
  }
  return ids;
};

/**
 *
 * Get all node ids this node depends on.
 *
 * @param {String} pid
 * @return {Array}
 * @api public
 */
IoMapHandler.prototype.getAncestorPids = function(pid) {
  var i;
  var ids = [];
  var aIds = [];
  var u = [];
  aIds = ids = this.getSourcePids(pid);
  for (i = 0; i < ids.length; i++) {
    aIds = aIds.concat(this.getAncestorPids(ids[i]));
  }
  for (i = 0; i < aIds.length; i++) {
    if (u.indexOf(aIds[i]) === -1) {
      u.push(aIds[i]);
    }
  }
  return u;
};
IoMapHandler.prototype.reset = function(cb) {
  var self = this;
  this._shutdown = true;
  this.queueManager.reset(function() {
    // All writes should stop, queuemanager resets.
    // or maybe should wait for queuemanager to be empty.
    if (cb) {
      cb();
    }
    self._shutdown = false;
  });
};

IoMapHandler.prototype.receiveFromQueue = function(ioid, p) {
  debug('%s: receive from queue', ioid);
  if (this.connections.hasOwnProperty(ioid)) {
    this.send(this.connections[ioid], p);
  }
};

/**
 *
 * The method to provide input to this io handler.
 *
 * @param {Link} link
 * @param {Packet} p
 *
 */
IoMapHandler.prototype.send = function(link, p) {
  if (link.source.has('pointer')) { // is just a boolean
    debug('%s: handling pointer', link.ioid);
    var identifier;
    var pp;
    // THIS IS NOT THE PLACE TO CLONE, but let's try it.
    // WILL BREAK ANYWAY WITH references.
    //
    // Ok, what is _the_ location to clone.
    //
    // A package going different routes must clone.
    //
    // p = p.clone();
    // Create an identifier
    pp = this.getPointerPorts(link.source.pid);
    pp.unshift(link.source.pid);
    identifier = pp.join('-');
    // The source node+port are pointed to.
    // The packet has it's chi updated with the
    // source.pid as key and an assigned item id as value
    //
    this.CHI.pointer(
      link.source.pid,
      link.source.port,
      p,
      identifier
    );
  }
  if (link.target.has('sync')) {
    debug('%s: handling sync port', link.ioid);
    var syncPorts = this.getSyncedTargetPorts(link.target);
    this.CHI.sync(
      //link.target,
      link,
      link.target.get('sync'), // originId
      // TODO: should just only accept the packet
      p,
      syncPorts
    );
    // always return, react on CHI.on('synced')
    return;
  }
  this.__sendData(link, p);
};

/**
 *
 * The method to provide input to this io handler.
 *
 * Ok, what misses here is info on how to find the actor
 * Who needs the information
 *
 *
 * Actor:
 *
 *  ioHandler.listenTo(Object.keys(this.nodes),
 *
 * @param {Connector} target
 * @param {object} input
 * @param {object} chi
 * @private
 */

/*
 *
 * Send Data
 *
 * @param {xLink} link - Link to write to
 * @param {Any} data - The input data
 * @private
 */
IoMapHandler.prototype.__sendData = function(link, p) {
  if (this._shutdown) {
    // TODO:: probably does not both have to be dropped
    // during __sendData *and* during output
    this.drop(p, link);
  }
  else {
    var data;
    if (link.target.has('cyclic') &&
      Array.isArray(p.data) // second time it's not an array anymore
    ) {
      debug('%s: cycling', link.ioid);
      // grouping
      // The counter part will be 'collect'
      var g = this.CHI.group();
      if (p.data.length === 0) {
        return false;
      }
      // make a copy otherwise if output goes to several ports
      // it will receive a popped version.
      //
      // Ok, this has to be removed and source ports should set as cyclic.
      // Not target ports.
      data = JSON.parse(JSON.stringify(p.data));
      var i;
      for (i = 0; i < data.length; i++) {
        // create new packet
        var newp = new Packet(data[i]);
        // this is a copy taking place..
        newp.set('chi', p.chi ? JSON.parse(JSON.stringify(p.chi)) : {});
        g.item(newp.chi);
        this.queueManager.queue(link.ioid, newp);
      }
      // we are done grouping now.
      g.done();
      return; // RETURN
    }
    var cp = p; // current packet
    // too bad cannot check the receiver type.
    // TODO: maybe have p.type() so the packet can tell it's content type.
    // plain object is a bit harder though would have to introduce
    // PLAIN_OBJECT type or something
    // The packet itself should tell what it is,
    // not checking p.data externally like this.
    /*
    if (typeof cp.data === 'object' && isPlainObject(cp.data)) {
      cp.data = JSON.parse(JSON.stringify(cp.data));
    }
    */
    cloneData(cp, 'function');
    // TODO: not sure if index should stay within the packet.
    if (link.source.has('index') && !cp.hasOwnProperty('index')) {
      //if (link.source.has('index')) {
      // above already cloned if possible.
      // what is not cloned is CHI, so could cause a problem..
      cp.chi = JSON.parse(JSON.stringify(cp.chi));
      cp = p.clone(false); // important!
      if (undefined === cp.data[link.source.get('index')]) {
        // this is allowed now for async array ports.
        // the component will only send one index at a time.
        // this is useful for routing.
        // maybe only enable this with a certain setting on the port later on.
        debug('%s: INDEX UNDEFINED %s', link.ioid, link.source, cp.data);
        // does this stop the loop, because it should not.
        return; // nop
      }
      else {
        cp.data = handleIndex(link, cp);
      }
    }
    // TODO: probably just remove this emit. (chix-runtime is using it)
    this.emit('data', {
      link: link,
      data: cp.data // only emit the data
    });

    debug('%s: writing packet', link.ioid);

    link.write(cp);
    this.emit('receive', link);
  }
};

/**
 *
 * Handles the output of every node.
 *
 * This comes directly from the Actor, whom got it from the node.
 *
 * The emit should maybe come from the link write.
 *
 * If there is chi it will be passed along.
 *
 * @param {NodeEvent} event
 * @api public
 */
IoMapHandler.prototype.output = function(event) {
  // used by monitors
  this.emit('output', event);
  this.receive(event.node, event.port, event.out, event.action);
};

/**
 *
 * Monitor event types
 *
 * Optionally provided with a pid.
 *
 */
IoMapHandler.prototype.monitor = function(eventType, pid, cb) {
  this.__monitor(eventType, pid, cb, 'on');
};

IoMapHandler.prototype.monitorOnce = function(eventType, pid, cb) {
  this.__monitor(eventType, pid, cb, 'once');
};

IoMapHandler.prototype.__monitor = function(eventType, pid, cb, how) {
  debug('start monitoring %s', eventType);
  if (!cb) {
    cb = pid;
    pid = undefined;
  }
  var monitor = (function(pid, eventType, cb) {
    return function monitorCallback(event) {
      if (event.port === eventType) {
        if (!pid || event.node.pid === pid) {
          cb(event.out);
        }
      }
    };
  })(pid, eventType, cb);
  this[how]('output', monitor);
};

/**
 *
 * Handles the output of every node.
 *
 * If there is chi it will be passed along.
 *
 * @param {Object} dat
 * @private
 */

/*
 *  source.id
 *  source.port
 *  action should be in the source?
 *
 *  action is target information, but is the only setting used..
 *  so just have the third parameter be action for now.
 *
 *  source is the full source node.
 **/
//  this.receive(dat.node, dat.port, dat.out, dat.action);
IoMapHandler.prototype.receive = function(source, port, p, action) {
  var i;
  // If the output of this node has any target nodes
  if (this.targetMap.hasOwnProperty(source.pid)) {
    // If there are any target nodes defined
    if (this.targetMap[source.pid].length) {
      // Iterate those targets
      for (i = 0; i < this.targetMap[source.pid].length; i++) {
        // Process this link
        var xlink = this.targetMap[source.pid][i];
        // If the link is about this source port
        if (port === xlink.source.port) {
          // did this output came from an action
          // if so, is it an action we are listening for.
          if (!action || xlink.source.action === action) {
            if (xlink.source.get('collect')) {
              debug('%s: collecting packets', xlink.ioid);
              this.CHI.collect(xlink, p);
              continue; // will be handled by event
            }
            //var noQueue = xlink.target.has('noqueue');
            var noQueue = false;
            this.emit('send', xlink);
            // queue must always be used otherwise persist
            // will not work..
            if (noQueue) {
              // must be sure, really no queue, also not after input.
              this.send(xlink, p);
            }
            else {
              debug('%s: queueing', xlink.ioid);
              this.queueManager.queue(xlink.ioid, p);
            }
          }
        }
      }
    }
  }
};

// collected is about the link
// a group is collected for that link
// and is thus always an array.
// this means the target should be used to re-send
// the collected input.
// the group information is actually not interesting.
// we only know we want the data from the last group.
// and use it.
IoMapHandler.prototype.collected = function( /*target, p*/ ) {
  /*
  data.data
  data.link
  */
};

IoMapHandler.prototype.beginGroup = function( /*group*/ ) {};
IoMapHandler.prototype.sendGroup = function( /*group, data*/ ) {
  /*
  data.data
  data.link
  */
};

/**
 *
 * Add Queue Manager.
 *
 * @param {QueueManager} qm
 * @api private
 *
 */
IoMapHandler.prototype.addQueueManager = function(qm) {
  this.queueManager = qm;
};

IoMapHandler.prototype.getSyncedTargetPorts = function(target) {
  var originId = target.get('sync');
  if (!this.syncedTargetMap.hasOwnProperty(target.pid)) {
    throw new Error(util.format('Unkown sync: `%s`', target.pid));
  }
  if (!this.syncedTargetMap[target.pid].hasOwnProperty(originId)) {
    throw new Error(util.format('Unkown sync with: `%s`', originId));
  }
  // returns the ports array, those who wanna sync with originId
  return this.syncedTargetMap[target.pid][originId];
};

IoMapHandler.prototype.getPointerPorts = function(originId) {
  if (this.pointerPorts.hasOwnProperty(originId)) {
    return this.pointerPorts[originId];
  }
  else {
    throw new Error(util.format('%s has no pointer ports', originId));
  }
};

/**
 *
 * Send synchronized input
 *
 * TODO: Input is synced here then we
 *   throw it into the input sender.
 *   They probably stay synced, but
 *   it's not enforced anywhere after this.
 *
 * @param {string} targetId
 * @param {object} data
 */
IoMapHandler.prototype.sendSynced = function(targetId, data) {
  for (var targetPort in data) {
    if (data.hasOwnProperty(targetPort)) {
      var synced = data[targetPort];
      // opens all queues, a it radical..
      this.queueManager.flushAll();
      // keep in sync, do not use setImmediate
      debug('%s: sendSynced', synced.link.ioid);
      this.__sendData(synced.link, synced.p);
    }
  }
};

IoMapHandler.prototype.drop = function(packet, origin) {
  // TODO: drop data/packet gracefully
  debug('IoMapHandler: Dropping packet %s %s', packet, origin);
  this.emit('drop', packet);
};

module.exports = IoMapHandler;

},{"../packet":25,"../queue/defaultManager":29,"./indexHandler":18,"chix-chi":8,"debug":42,"events":2,"is-plain-object":91,"util":7,"uuid":114}],20:[function(require,module,exports){
'use strict';

var util = require('util');
var uuid = require('uuid').v4;
var Connector = require('./connector');
var Setting = require('./setting');
var validate = require('./validate');

/**
 *
 * xLink
 *
 *
 * Settings:
 *
 *   - ttl
 *   - expire
 *   - dispose: true
 *
 * Just need something to indicate it's an iip.
 *
 * @constructor
 * @public
 */
function Link(id, ioid) {

  this.fills = 0;
  this.writes = 0;
  this.rejects = 0;
  this.id = id === undefined ? uuid() : id;
  this.ioid = ioid || uuid();
  this.metadata = {};

}

util.inherits(Link, Setting);

Link.create = function(ln) {

  ln = ln || {};

  var link = new Link(ln.id, ln.ioid);

  if (ln.source || ln.target) {
    link.build(ln);
  }

  return link;

};

Link.prototype.build = function(ln) {

  if (!ln.source) {
    throw Error('Create link expects a source');
  }

  if (!ln.target) {
    throw Error('Create link expects a target');
  }

  validate.link(ln);

  this.setSource(
    ln.source.id,
    ln.source.port,
    ln.source.setting,
    ln.source.action
  );

  if (ln.metadata) {
    this.setMetadata(ln.metadata);
  } else {
    this.setMetadata({});
  }

  this.setTarget(
    ln.target.id,
    ln.target.port,
    ln.target.setting,
    ln.target.action
  );

};

/**
 *
 * Set target
 *
 * @param {String} targetId
 * @param {String} port
 * @param {Object} settings
 * @param {String} action
 * @public
 */
Link.prototype.setTarget = function(targetId, port, settings, action) {

  this.target = new Connector(settings);
  this.target.wire = this;
  this.target.plug(targetId, port, action);

};

Link.prototype.write = function(p) {

  this.writes++;

  // just re-emit
  this.emit('data', p);

};

/**
 *
 * Set Source
 *
 * @param {Object} sourceId
 * @param {String} port
 * @param {Object} settings
 * @param {String} action
 * @public
 */
Link.prototype.setSource = function(sourceId, port, settings, action) {

  this.source = new Connector(settings);
  this.source.wire = this;
  this.source.plug(sourceId, port, action);

};

/**
 *
 * Setting of pid's is delayed.
 * I would like them to be available during plug.
 * but whatever.
 *
 */

Link.prototype.setSourcePid = function(pid) {
  this.source.setPid(pid);
};

Link.prototype.setTargetPid = function(pid) {
  this.target.setPid(pid);
};

Link.prototype.setMetadata = function(metadata) {
  this.metadata = metadata;
};

Link.prototype.setMeta = function(key, val) {
  this.metadata[key] = val;
};

/**
 *
 * Set Title
 *
 * @param {String} title
 * @public
 */
Link.prototype.setTitle = function(title) {

  this.setMeta('title', title);

  this.emit('change', this, 'metadata', this.metadata);

};

Link.prototype.clear = function() {

  this.fills = 0;
  this.writes = 0;
  this.rejects = 0;

  this.emit('clear', this);

};

/**
 *
 * Update link by passing it a full object.
 *
 * Will only emit one change event.
 *
 */
Link.prototype.update = function(ln) {

  this.build(ln);

  this.emit('change', this);

};

Link.prototype.toJSON = function() {

  // TODO: use schema validation for toJSON
  if (!this.hasOwnProperty('source')) {
    console.log(this);
    throw Error('Link should have a source property');
  }
  if (!this.hasOwnProperty('target')) {
    throw Error('Link should have a target property');
  }

  var link = {
    id: this.id,
    source: this.source.toJSON(),
    target: this.target.toJSON()
  };

  if (this.metadata) {
    link.metadata = this.metadata;
  }

  if (this.fills) {
    link.fills = this.fills;
  }

  if (this.rejects) {
    link.rejects = this.rejects;
  }

  if (this.writes) {
    link.writes = this.writes;
  }

  if (this.data !== undefined) {
    link.data = JSON.parse(JSON.stringify(this.data));
  }

  return link;
};

module.exports = Link;

},{"./connector":15,"./setting":33,"./validate":34,"util":7,"uuid":114}],21:[function(require,module,exports){
'use strict';

/**
 * Function to sort multidimensional array
 *
 * Simplified version of:
 *
 *   https://coderwall.com/p/5fu9xw
 *
 * @param {array} a
 * @param {array} b
 * @param {array} columns List of columns to sort
 * @param {array} orderBy List of directions (ASC, DESC)
 * @param {array} index
 * @returns {array}
 */
function multisortRecursive(a, b, columns, orderBy, index) {
  var direction = orderBy[index] === 'DESC' ? 1 : 0;

  var x = a[columns[index]];
  var y = b[columns[index]];

  if (x < y) {
    return direction === 0 ? -1 : 1;
  }

  if (x === y)  {
    return columns.length - 1 > index ?
      multisortRecursive(a, b, columns, orderBy, index + 1) : 0;
  }

  return direction === 0 ? 1 : -1;
}

module.exports = function(arr, columns, orderBy) {

  var x;
  if (typeof columns === 'undefined') {
    columns = [];
    for (x = 0; x < arr[0].length; x++) {
      columns.push(x);
    }
  }

  if (typeof orderBy === 'undefined') {
    orderBy = [];
    for (x = 0; x < arr[0].length; x++) {
      orderBy.push('ASC');
    }
  }

  return arr.sort(function(a, b) {
    return multisortRecursive(a, b, columns, orderBy, 0);
  });
};

},{}],22:[function(require,module,exports){
'use strict';

/* jshint -W040 */

var Packet = require('./packet');
var Connector = require('./connector');
var util = require('util');
var NodeBox = require('./sandbox/node');
var PortBox = require('./sandbox/port');
var BaseNode = require('./node/interface');
var Port = require('./port');
var debug = require('debug')('chix:node');
var portFiller = require('./port/filler');

// Running within vm is also possible and api should stay
// compatible with that, but disable for now.
// vm = require('vm'),

/**
 * Error Event.
 *
 * @event Node#error
 * @type {object}
 * @property {object} node - An export of this node
 * @property {string} msg - The error message
 */

/**
 * Executed Event.
 *
 * @event Node#executed
 * @type {object}
 * @property {object} node - An export of this node
 */

/**
 * Context Update event.
 *
 * @event Node#contextUpdate
 */

/**
 * Output Event.
 *
 * Fired multiple times on output
 *
 * Once for every output port.
 *
 * @event Node#output
 * @type {object}
 * @property {object} node - An export of this node
 * @property {string} port - The output port
 * @property {string} out - A (reference) to the output
 */

/**
 *
 * Node
 *
 * TODO:
 *   do not copy all those properties extend the node object itself.
 *   however, do not forget the difference between a nodeDefinition
 *   and a node.
 *
 *   node contains the process definition, which is the node
 *   definition merged with the instance configuration.
 *
 * @author Rob Halff <rob.halff@gmail.com>
 * @param {String} id
 * @param {Object} node
 * @param {String} identifier
 * @param {CHI} CHI
 * @constructor
 * @public
 */
function xNode(id, node, identifier, CHI) {

  if (!(this instanceof xNode)) {
    return new xNode(id, node, identifier, CHI);
  }

  // detection of async is still needed.
  // Really should all just be different classes.
  // Problem now, we have to run the nodebox to
  // determine async, which is a super hacky way.
  this.async = node.type === 'async' ? true : false;
  this.async = node.async ? true : this.async;

  xNode.super_.apply(this, [id, node, identifier, CHI]);

  this.type = 'node';

  this.state = {};

  // remember def for .compile()
  this.def = node;

  /**
   *
   * Indicates whether this instance is active.
   *
   * This works together with the active state
   * of the sandbox.
   *
   * When a blackbox sends async output done()
   * should be used to inform us it is done.
   *
   * @member {Boolean} active
   * @public
   */
  this.active = false;

  /**
   *
   * Indicates whether this node expects async input.
   *
   * Async input listening is done by:
   *
   *   on.input.<port-name> = function() {}
   *
   * Any node can send async output.
   *
   * Async nodes are handled differently, their function body
   * is only executed once, during startup.
   *
   * I think the port input function can be handled the same
   * as a normal function body, we'll just have several
   * functions to execute based on what input port is targeted.
   *
   * The common state is represented in the `state` object.
   * This is the only variable which is accessible to all ports
   * and during startup.
   *
   */
  this.nodebox = new NodeBox();

  // done() is added to the nodebox
  this.nodebox.set('done', this.complete.bind(this));
  this.nodebox.set('cb', this._asyncOutput.bind(this));
  this.nodebox.set('state', this.state);

  this._setup();

  /** @member {Mixed} chi */
  this.chi = {};

  /** delay interval */
  this.interval = 100;

  /** @member {Object} input */
  this.input = {};

  /** @member {Object} context */
  this.context = {};

  /** @member {Object} dependencies */
  this.dependencies = node.dependencies || {};

  /** @member {Array} expose */
  this.expose = node.expose;

  /** @member {String} fn */
  this.fn = node.fn;

  /**
   * @member {Numeric} nodeTimeout
   * @default 3000
   */
  this.nodeTimeout = node.nodeTimeout || 3000;

  /**
   *
   * inputTimeout in milliseconds
   *
   * If inputTimeout === `false` there will be no timeout
   *
   * @member {Mixed} inputTimeout
   * @default 3000
   */
  this.inputTimeout = typeof node.inputTimeout === 'undefined' ?
    3000 : node.inputTimeout;

  /** @private */
  this.__halted = false; // was halted by a hold

  /** @private */
  this._inputTimeout = null;

  // Solving yet another `design` problem
  // object containing the current connections in use
  // will be reset during free Port.
  // Also belongs to the port objects.
  this._activeConnections = {};

  this.status = 'init';

  // setup the core
  this._fillCore();

  // If this node is async, run it once
  // all ports will be setup and sandbox state will be filled.
  if (this._isPreloaded()) {

    // still need to add the precompiled function
    if (this.fn) {
      //this.nodebox.fill(this.fn);
      // not tested..
      this.nodebox.fill(this.fn);
    }

    if (this.async) {
      // how about nodebox.state?
      // state is now in the definition itself..
      // this should really also be a deep copy.
      this.nodebox.state = node.state;
      this._loadAsync();
    }

  }
  else {

    this.nodebox.compile(this.fn);

    if (this.async) {

      // This collects the port definitions they
      // attach to `on`
      this.nodebox.run();

      this._loadAsync();
    }
  }

}

util.inherits(xNode, BaseNode);

// TODO: this generic, however options does not exists anymore, it's settings
xNode.prototype._setup = function() {

  for (var port in this.ports.input) {
    if (this.ports.input.hasOwnProperty(port)) {
      if (this.ports.input[port].options) {
        for (var opt in this.ports.input[port].options) {
          if (this.ports.input[port].options.hasOwnProperty(opt)) {
            this.setPortOption(
              'input',
              port,
              opt,
              this.ports.input[port].options[opt]);
          }
        }
      }
    }
  }

};

xNode.prototype.start = function() {

  var sb;

  if (this.status === 'created') {

    this.setStatus('started');
    debug('%s: running on start', this.identifier);
    if (this.nodebox.on.start) {
      // Run onStart functionality first
      if (typeof this.nodebox.on.start === 'function') {
        sb = this._createPortBox(this.nodebox.on.start);
      } else {
        sb = this._createPortBox(this.nodebox.on.start.toString());
      }
      sb.run(this);
      this.nodebox.state = this.state = sb.state;
    }

    this.emit('started', {
      node: this.export()
    });

  }

};

xNode.prototype.hasData = function(port) {
  return undefined !== this.input[port];
};

xNode.prototype.fill = function(target, data, settings) {

  var p = data instanceof Packet ? data : new Packet(data);

  // allow for simple api
  if (typeof target === 'string') {
    var port = target;
    target = new Connector(settings || {});
    target.plug(this.id, port);
    // target.set('dispose', true); should be on wire
    if (settings) {
      target.set('persist', true);
    }
    this.plug(target);
  }

  var ret = this._receive(target, p);

  debug('%s:%s receive  %s', this.identifier, target.port, ret);

  if (ret !== true) { // Error or `false`
    if (this.ports.input.hasOwnProperty(target.port)) {
      this.ports.input[target.port].rejects++;
      this.ports.input[target.port].lastError = ret;
    }
  }

  return ret;

};

/**
 * Usage of `$`
 *
 * Idea is to do the reverse of super() all extending `classes`
 * only have $ methods.
 *
 * @param {type} port
 * @param {type} data
 * @returns {undefined}
 * @shielded
 */
xNode.prototype.$setContextProperty = function(port, data) {
  debug('%s:%s set context', this.identifier, port);
  this.context[port] = data;
};

xNode.prototype.clearContextProperty = function(port) {

  debug('%s:%s clear context', this.identifier, port);

  delete this.context[port];

  this.event(':contextClear', {
    node: this,
    port: port
  });
};

/**
 *
 * Starts the node
 *
 * TODO: dependencies are always the same, only input is different.
 * dependencies must be created during createScript.
 * also they must be wrapped within a function.
 * otherwise you cannot overwrite window and document etc.
 * ...Maybe statewise it's a good thing, dependencies are re-required.
 *
 * FIXME: this method does too much on it's own.
 *
 * Note: start is totally unprotected, it assumes the input is validated
 * and all required ports are filled.
 * Start should never really be called directly, the node starts when
 * input is ready.
 *
 * @param {Function} fn
 * @param {String} name
 * @fires Node#error
 * @fires Node#require
 * @fires Node#expose
 * @private
 */
xNode.prototype._delay = 0;

xNode.prototype.__start = function() {

  if (this.active) {
    // try again, note: this is different from input queueing..
    // used for longer running processes.
    debug('%s: node still active delaying', this.identifier);
    this._delay = this._delay + this.interval;
    setTimeout(this.start.bind(this), 500 + this._delay);
    return false;
  }

  // set active state.
  this.active = true;

  // Note: moved to the beginning.
  this.runCount++;

  if (!this.async) {
    if (this.nodebox.on) {
      if (this.nodebox.on.shutdown) {
        debug('%s: running shutdown', this.identifier);
        this.shutdown();
      }
    }
  }

  this.nodebox.input = this.input;

  // difference in notation, TODO: explain these constructions.
  // done before compile.
  // this.nodebox.output = this.async ? this._asyncOutput.bind(this) : {};

  this._runOnce();

};

/**
 *
 * Runs the node
 *
 * @fires Node#nodeTimeout
 * @fires Node#start
 * @fires Node#executed
 * @private
 */
xNode.prototype._runOnce = function() {

  var t = setTimeout(function() {

    debug('%s: node timeout', this.identifier);

    /**
     * Timeout Event.
     *
     * @event Node#nodeTimeout
     * @type {object}
     * @property {object} node - An export of this node
     */
    this.event(':nodeTimeout', {
      node: this.export()
    });

  }.bind(this), this.nodeTimeout);

  /**
   * Start Event.
   *
   * @event Node#start
   * @type {object}
   * @property {object} node - An export of this node
   */
  this.event(':start', {
    node: this.export()
  });

  //this.nodebox.runInNewContext(this.sandbox);
  //
  // ok, this depends on what is the code whether it's running or not...
  // that's why async should be definied per port.
  this.setStatus('running');

  this.nodebox.run();
  this.state = this.nodebox.state;

  debug('%s: nodebox executed', this.identifier);

  this.emit('executed', {
    node: this
  });
  this.event(':executed', {
    node: this
  });

  clearTimeout(t);

  this._output(this.nodebox.output);
};

/**
 *
 * Fills the core of this node with functionality.
 *
 * @fires Node#fillCore
 * @private
 */
xNode.prototype._fillCore = function() {

  debug('%s: fill core', this.identifier);

  /**
   * Fill Core Event.
   *
   * @event Node#fillCore
   * @type {object}
   * @property {object} node - An export of this node
   * @property {function} fn - The function being installed
   * @property {string} fn - The name of the function
   */
  this.event(':fillCore', {
    node: this.export(),
    fn: this.fn,
    name: this.name
  });

  this.nodebox.require(this.dependencies.npm);
  this.nodebox.expose(this.expose, this.CHI);

  this.nodebox.set('output', this.async ? this._asyncOutput.bind(this) : {});

  this.setStatus('created');

};

/**
 *
 * Executes the async variant
 *
 * state is the only variable which will persist.
 *
 * @param {string} fn - Portbox Function Body
 * @returns {PortBox}
 * @private
 */
xNode.prototype._createPortBox = function(fn, name) {

  debug('%s: creating portbox `%s`', this.identifier, name);

  var portbox = new PortBox(name);
  portbox.set('state', this.nodebox.state);
  portbox.set('output', this._asyncOutput.bind(this));

  // also absorbes already required.
  portbox.require(this.dependencies.npm, true);
  portbox.expose(this.expose, this.CHI);

  if (typeof fn !== 'function') {
    fn = fn.slice(
      fn.indexOf('{') + 1,
      fn.lastIndexOf('}')
    );
    portbox.compile(fn);
  } else {
    portbox.fill(fn);
  }

  return portbox;

};

/**
 *
 * Test whether this is a preloaded node.
 *
 * @private
 */
xNode.prototype._isPreloaded = function() {

  var ret;

  if (typeof this.fn === 'function') {
    return true;
  }

  for (var port in this.ports.input) {
    if (this.ports.input.hasOwnProperty(port)) {
      ret = !!this.ports.input[port].fn;
      if (ret) {
        return true;
      }
    }
  }

  return false;

};

/**
 *
 * @private
 */
xNode.prototype._loadAsync = function() {

  for (var port in this.ports.input) {

    if (this.ports.input.hasOwnProperty(port)) {

      // If there is a port function defined for this port
      // it means it's async
      if (this.nodebox.on.input.hasOwnProperty(port)) {

        this.ports.input[port].fn = this._createPortBox(
          this.nodebox.on.input[port].toString(), ('__' + port + '__')
          .toUpperCase()
        );

        this.async = true;
        this.ports.input[port].async = true;

      } else if (this.ports.input[port].fn) {

        // pre-compiled
        this.ports.input[port].fn = this._createPortBox(
          this.ports.input[port].fn, ('__' + port + '__').toUpperCase()
        );

        this.async = true;
        this.ports.input[port].async = true;

      }
      else {

        // It is a sync port

      }

    }
  }

  this.setStatus('created');

  // could just act on general status change event, who uses this?
  this.emit('created', {
    node: this.export()
  });

  this.state = this.nodebox.state;

};

/**
 *
 * Generic Callback wrapper
 *
 * Will collect the arguments and pass them on to the next node
 *
 * So technically the next node is the callback.
 *
 * Parameters are defined on the output as ports.
 *
 * Each callback argument must be defined as output port in the callee's schema
 *
 * e.g.
 *
 *  node style callback:
 *
 *  ports.output: { err: ..., result: ... }
 *
 *  connect style callback:
 *
 *  ports.output: { req: ..., res: ..., next: ... }
 *
 * The order of appearance of arguments must match those of the ports within
 * the json schema.
 *
 * TODO: Within the schema you must define the correct type otherwise output
 * will be refused
 *
 *
 * @private
 */
xNode.prototype._callbackWrapper = function() {

  var i;
  var obj = {};
  var ports;

  ports = this.outPorts;

  for (i = 0; i < arguments.length; i++) {

    if (!ports[i]) {

      // TODO: eventemitter expects a new Error()
      // not the object I send
      // Not sure what to do here, it's not really fatal.
      this.event(':error', {
        msg: Error(
          util.format('Unexpected extra port of type %s',
            typeof arguments[i] === 'object' ?
            arguments[i].constructor.name : typeof arguments[i]
          )
        )
      });

    }
    else {

      obj[ports[i]] = arguments[i];

    }
  }

  this._output(obj);

};

/**
 *
 * Execute the delegated callback for this node.
 *
 * [fs, 'readFile', '/etc/passwd']
 *
 * will execute:
 *
 * fs['readFile']('/etc/passwd', this.callbackWrapper);
 *
 * @param {Object} output
 * @fires Node#branching
 * @private
 */
xNode.prototype._delegate = function(output) {

  var fn = output.splice(0, 1).pop();
  var method = output.splice(0, 1).pop();

  output.push(this._callbackWrapper.bind(this));
  fn[method].apply(fn, output);
};

/**
 *
 * This node handles the output of the `blackbox`
 *
 * It is specific to the API of the internal Chix node function.
 *
 * out = { port1: data, port2: data }
 * out = [fs.readFile, arg1, arg2 ]
 *
 * Upon output the input will be freed.
 *
 * @param {Object} output
 * @param {Object} chi
 * @fires Node#output
 * @private
 */
xNode.prototype._asyncOutput = function(output, chi) {

  var port;

  // Ok, delegate and object output has
  // synchronous output on _all_ ports
  // however we do not know if we we're called from
  // the function type of output..
  for (port in output) {
    if (output.hasOwnProperty(port)) {
      this.sendPortOutput(port, output[port], chi);
    }
  }

};

/**
 *
 * Output
 *
 * Directs the output to the correct handler.
 *
 * If output is a function it is handled by asyncOutput.
 *
 * If it's an array, it means it's the shorthand variant
 *
 * e.g. output = [fs, 'readFile']
 *
 * This will be handled by the delegate() method.
 *
 * Otherwise it is a normal output object containing the output for the ports.
 *
 * e.g. { out1: ...,  out2: ...,  error: ... } etc.
 *
 * TODO: not sure if this should always call complete.
 *
 * @param {Object} output
 * @private
 */
xNode.prototype._output = function(output) {

  var port;

  if (typeof output === 'function') {
    output.call(this, this._asyncOutput.bind(this));
    return;
  }

  if (Array.isArray(output)) {
    this._delegate(output);
    return;
  }

  for (port in output) {
    if (output.hasOwnProperty(port)) {
      this.sendPortOutput(port, output[port]);
    }
  }

  this.complete();

};

/**
 *
 * @param {string} port
 * @private
 */

xNode.prototype._runPortBox = function(port) {

  var sb = this.ports.input[port].fn;
  // fill in the values

  this.event(':start', {
    node: this.export()
  });

  sb.set('data', this.input[port]);
  sb.set('x', this.chi);
  sb.set('state', this.state);
  // sb.set('source', source); is not used I hope
  sb.set('input', this.input); // add all (sync) input.

  this.setStatus('running');

  var ret = sb.run(this);

  this.nodebox.state = this.state = sb.state;

  if (ret === false) {
    // if ret === false input should be revoked and re-queued.
    // which means it must look like we didn't accept the packet in
    // the first place.

    // this.setStatus('idle');
    var d = this.input[port];

    // freePort somehow doesn't work
    // only the below + unlock during unshift works.
    // but has the danger of creating an infinite loop.
    // if rejection is always false.
    delete this.input[port];
    delete this._activeConnections[port];

    this.event(':portReject', {
      node: this.export(),
      port: port,
      data: d // TODO: other portReject emits full packet instead of data.
    });

    return false;
  }

  // todo portbox itself should probably also
  // maintain it's runcount, this one is cumulative
  this.runCount++;

  debug('%s:%s() executed', this.identifier, port);

  this.emit('executed', {
    node: this,
    port: port
  });

  this.event(':executed', {
    node: this,
    port: port
  });

};

/**
*
* Contains much of the port's logic, this should be abstracted out
* into port objects.
*
* For now just add extra functionality overhere.
*
* TODO:
*  - Detect if the input port is defined as Array.
*  - If it is an array, detect what is it's behaviour
*
* Behaviours:
*  - Multiple non-array ports are connected: wait until all have send
*    their input and release the array of data.
*  - One port is connect of the type Array, just accept it and run
*  - Multiple array ports give input/are connected... same as the above
*  Arrays will be handled one by one.
*  - So basically, if we receive an array, we process it.
*  If it is not we will join multiple connections.
*  - If there is only one port connected and it is not of an array type
*    We will just sit there and wait forever,
*    because we cannot make an array out of it.
* - I think the rules should be simple, if you want it more complex,
*   just solve it within the flow by adding extra nodes.
*   What a port does must be understandable.  So that's why it's also good if
*   you can specify different kind of port behaviour.
*   So if you do not like a certain kind of behaviour, just select another one.
*   Yet all should be simple to grasp. You could also explain an array as being
*   a port that expects multiple.
*
*   The filled concept stays the same, the only thing changing is when we
*   consider something to be filled.
*
*   So.. where is the port type information.
*
// TODO: once a connection overwrites a setting.
// it will not be put back, this is a choice.
// at what point do we set persistent from a link btw?
//
// TODO: has become a bit of a weird method now.
*/

xNode.prototype.handlePortSettings = function(port) {
  if (this.ports.input.hasOwnProperty(port)) {}
};

/**
 * Fill one of our ports.
 *
 * First the input data will be validated. A port
 * will only be filled if the data is of the correct type
 * or even structure.
 *
 * The following events will be emitted:
 *
 *   - `portFill`
 *   - `inputTimeout`
 *   - `clearTimeout` (TODO: remove this)
 *
 * FIXME:
 *  - options are set and overwritten on portFill
 *    which is probably undesired in most cases.
 *
 *  - portFill is the one who triggers the start of a node
 *    it's probably better to trigger an inputReady event.
 *    and start the node based on that.
 *
 * @param {Connector} target
 * @param {Packet} p
 * @returns {Node.error.error|Boolean}
 * #private
 */
xNode.prototype._fillPort = function(target, p) {

  var res;

  // this is too early, defaults do not get filled this way.
  if (this.ports.input[target.port].async === true &&
    !this._allConnectedSyncFilled()) {

    this.event(':portReject', {
      node: this.export(),
      port: target.port,
      data: p
    });

    // do not accept
    return false;
  }

  if (undefined === p.data) {
    return Error('data may not be `undefined`');
  }

  // Not used
  //this.handlePortSettings(target.port);

  // PACKET WRITE, TEST THIS
  p.data = this._handleFunctionType(target.port, p.data);

  res = this._validateInput(target.port, p.data);

  if (util.isError(res)) {

    return res;

  }
  else {

    // todo: this logic must be externalized.
    // node doesn't know about persist
    if (!target.has('persist')) {

      try {

        // CHI MERGING check this.
        // Or is this to early, can we still get a reject?
        this.CHI.merge(this.chi, p.chi);
      }
      catch (e) {
        // this means chi was not cleared,
        // yet the input which caused the chi setting
        // freed the port, so how is this possible.
        return this.error(util.format(
          '%s: chi item overlap during fill of port `%s`\n' +
          'chi arriving:\n%s\nchi already collected:\n%s',
          this.identifier,
          target.port,
          JSON.stringify(p.chi),
          JSON.stringify(this.chi)
        ));
      }

    }

    // this.filled++;

    if (!this._inputTimeout &&
      this.inputTimeout &&
      //!this.getPortOption('input', port, 'persist')
      !target.has('persist')
    ) {

      this._inputTimeout = setTimeout(function() {

        /**
         * Input Timeout Event.
         *
         * Occurs when there is an input timeout for this node.
         *
         * This depends on the inputTimeout property of the node.
         * If inputTimeout is false, this event will never occur.
         *
         * @event Node#inputTimeout
         * @type {object}
         * @property {object} node - An export of this node
         */
        this.event(':inputTimeout', {
          node: this.export()
        });

      }.bind(this), this.inputTimeout);
    }

    // used during free port to find back our connections.
    // Should belong to the port object (non existant yet)
    if (target.wire) { // direct node.fill() does not have it

      // does not really happen can be removed..
      if (this._activeConnections[target.port]) {
        throw Error('There still is a connection active');
      }
      else {
        this._activeConnections[target.port] = target.wire;
      }
    }

    // set input port data
    // this could be changed to still contain the Packet.
    this._fillInputPort(target.port, p.data);

    /**
     * Port Fill Event.
     *
     * Occurs when a port is filled with data
     *
     * At this point the data is already validated
     *
     * @event Node#portFill
     * @type {object}
     * @property {object} node - An export of this node
     * @property {string} port - Name of the port
     */
    //this.event(':portFill', {
    //todo: not all events are useful to send as output
    //TODO: just _do_ emit both
    this.emit('portFill', {
      node: this.export(),
      link: target.wire,
      port: target.port
    });

    this.event(':portFill', {
      node: this.export(),
      link: target.wire,
      port: target.port
    });

    var ret = this._readyOrNot();
    return ret;

  }

};

/**
 *
 * @param {string} port
 * @param {Mixed} value
 * @private
 */
xNode.prototype._fillInputPort = function(port, value) {

  debug('%s:%s fill', this.identifier, port);

  this.input[port] = value;

  // increment fill counter
  this.ports.input[port].fills++;

};

/* Unused?
xNode.prototype.syncFilled = function() {

  var port;

  for (port in this.input) {
    if (!this.ports.input[port].async &&
       typeof this.input[port] === 'undefined') {
      return false;
    }
  }

  return true;

};

xNode.prototype.syncFilledCount = function() {

  var port;

  var cnt = 0;
  for (port in this.input) {
    if (!this.ports.input[port].async &&
       typeof this.input[port] !== 'undefined') {
      cnt++;
    }
  }

  return cnt;

};
*/

/***
 *
 * Async problem.
 *
 * start() -> isStartable()
 *
 * If links are not connected yet, this logic will not work.
 * However, how to know we are complete.
 * addnode addnode addlink addlink etk
 *
 *
 *
 */
// ok, nice, multiple ip's will not be possible?, yep..
xNode.prototype.isStartable = function() {

  if (this.hasConnections()) {
    // should never happen with IIPs so fix that bug first
    return false;
  }

  var fillable = 0;
  for (var port in this.ports.input) {
    // null is possible..
    if (this.ports.input[port].default !== undefined) {
      fillable++;
    }
    else if (this.context[port]) {
      fillable++;
    }
    else if (port === ':start') {
      fillable++;
      //} else if (!this.ports.input[port].required) {
    }
    else if (this.ports.input[port].required === false) {
      fillable++;
    }
  }

  return fillable === this.inPorts.length;

};

/**
 *
 * Determines whether we are ready to go.
 * And starts the node accordingly.
 *
 * TODO: it's probably not so smart to consider default
 * it means we can never send an IIP to a port with a default.
 * Because the default will already trigger the node to run.
 *
 * @private
 */
xNode.prototype._readyOrNot = function() {

  // all connected ports are filled.
  if (this._allConnectedSyncFilled()) {

    if (this._inputTimeout) {
      clearTimeout(this._inputTimeout);
    }

    // Check context/defaults etc. and fill it
    var ret = portFiller.fill(
      this.ports.input,
      this.input,
      this.context
    );

    // TODO: if all are async, just skip all the above
    // async must be as free flow as possible.
    if (util.isError(ret)) {

      debug('%s: filler error `%s`', this.identifier, ret);

      return ret;

    }
    else {

      // temp for debug
      //this.ready = true;

      // todo better to check for ready..
      if (this.status !== 'hold') {

        if (this.async) {

          // really have no clue why these must run together
          // and why I try to support 4 different ways of writing
          // a component and sqeeze it into one class.

          var async_ran = 0;
          for (var port in this.ports.input) {

            // run all async which have input.
            // persistent async will have input etc.
            if ((this.ports.input[port].async ||
              this.ports.input[port].fn) &&
              this.input[port] !== undefined) {

              ret = this._runPortBox(port);

              if (ret === false) {
                // revoke input
                if (async_ran > 0) {
                  // only problem now is the multpile async ports.
                  //
                  throw Error('Input revoked, yet one async already ran');
                }

                debug('%s:%s() revoked input', this.identifier, port);

                return Port.INPUT_REVOKED;
              }

              async_ran++;

            }
          }

          if (async_ran > 0) {
            this.freeInput();
          }

        }
        else { // not async

          if (Object.keys(this.input).length !== this.inPorts.length) {

            //return this.error(util.format(
            return Error(util.format(
              'Input does not match, Input: %s, InPorts: %s',
              Object.keys(this.input).toString(),
              this.inPorts.toString()
            ));

          }
          else {

            this.setStatus('running');
            this.__start();

          }

        }

      }
      else {
        this.__halted = true;
      }

    }

    return true;
  }

  // OK, this false has nothing to do with fill return codes..
  // yet above for async I treat false as a failed fill.
  // console.log('SYNC NOT FILLED!', ret, this.identifier);
  //return false;
  return true;

};

/**
 *
 * Frees the input
 *
 * After a node has run the input ports are freed,
 * removing their reference.
 *
 * Exceptions:
 *
 *  - If the port is set to persistent, it will keep it's
 *    reference to the variable and stay filled.
 *
 * NOTE: at the moment a port doesn't have a filled state.
 *  we only count how many ports are filled to determine
 *  if we are ready to run.
 *
 * if a node is still in active state it's input can also not
 * be freed... at the moment it will do so, which is bad.
 *
 * @public
 */
xNode.prototype.freeInput = function() {

  var i;

  // this.filled = 0;

  // Reset this.chi.
  // must be before freePort otherwise chi will overlap
  this.chi = {};

  var port;

  var freed = [];
  for (i = 0; i < this.inPorts.length; i++) {

    port = this.inPorts[i];

    // TODO: don't call freeInput in the first place if undefined
    if (this.input[port] !== undefined) {
      this.freePort(port);
      freed.push(port);
    }
  }

};

xNode.prototype.$portIsFilled = function(port) {
  return this.input.hasOwnProperty(port);
};

xNode.prototype.clearInput = function(port) {
  delete this.input[port];
};

xNode.prototype.freePort = function(port) {

  var persist = this.getPortOption('input', port, 'persist');
  if (persist) {
    // persist, chi, hmz, seeze to exist.
    // but wouldn't matter much, with peristent ports.
    // TODO: this.filled is not used anymore.
    debug('%s:%s persisting', this.identifier, port);

    // indexes are persisted per index.
    if (Array.isArray(persist)) {
      for (var k in this.input[port]) {
        if (persist.indexOf(k) === -1) {
          debug('%s:%s[%s] persisting', this.identifier, port, k);
          // remove
          delete this.input[port][k];
        }
      }
    }

  }
  else {

    // this also removes context and default..
    this.clearInput(port);

    debug('%s:%s :freePort event', this.identifier, port);
    this.event(':freePort', {
      node: this.export(),
      link: this._activeConnections[port], // can be undefined, ok
      port: port
    });

    this.emit('freePort', {
      node: this.export(),
      link: this._activeConnections[port],
      port: port
    });

    // delete reference to active connection (if there was one)
    // delete this._activeConnections[port];
    this._activeConnections[port] = null;
  }

};

/**
 *
 * Checks whether all required ports are filled
 *
 * Used to determine if this node should start running.
 *
 * @public
 */
xNode.prototype.allConnectedFilled = function() {
  for (var port in this.openPorts) {
    if (this.input[port] === undefined) {
      return Node.ALL_CONNECTED_NOT_FILLED;
    }
  }
  return true;
};

xNode.SYNC_NOT_FILLED = false;
xNode.ALL_CONNECTED_NOT_FILLED = false;

/**
 *
 * @private
 */
xNode.prototype._allConnectedSyncFilled = function() {

  for (var i = 0; i < this.openPorts.length; i++) {
    var port = this.openPorts[i];

    // .async test can be removed, .fn is enough
    if (!this.ports.input[port].async ||
      !this.ports.input[port].fn) {

      if (this.ports.input[port].indexed) {
        if (/object/i.test(this.ports.input[port].type)) {
          return this._objectPortIsFilled(port);
        }
        else {
          return this._arrayPortIsFilled(port);
        }
      }
      else if (this.input[port] === undefined) {
        return xNode.SYNC_NOT_FILLED;
      }
    }
  }

  return true;
};

/**
 *
 * Wires a source port to one of our ports
 *
 * target is the target object of the connection.
 * which consist of a source and target object.
 *
 * So in this calink.se the target is _our_ port.
 *
 * If a connection is made to the virtual `:start` port
 * it will be created automatically if it does not exist already.
 *
 * The port will be set to the open state and the connection
 * will be registered.
 *
 * A port can have multiple connections.
 *
 * TODO: the idea was to also keep track of
 *       what sources are connected.
 *
 * @private
 */
xNode.prototype._initStartPort = function() {
  // add it to known ports
  if (!this.portExists('input', ':start')) {
    debug('%s:%s initialized', this.identifier, ':start');
    this.addPort('input', ':start', {
      type: 'any',
      rejects: 0,
      fills: 0
    });
  }
};

/**
 *
 * Holds all input until release is called
 *
 * @public
 */
xNode.prototype.hold = function() {
  this.setStatus('hold');
};

/**
 *
 * Releases the node if it was on hold
 *
 * @public
 */
xNode.prototype.release = function() {

  this.setStatus('ready');

  if (this.__halted) {
    this.__halted = false;
  }
  return this._readyOrNot();
};

xNode.prototype.isHalted = function() {
  return this.__halted;
};

/**
 *
 * Node completion
 *
 * Sends an empty string to the :complete port.
 * Each node automatically has one of those available.
 *
 * Emits the complete event and frees all input ports.
 *
 * @private
 */
xNode.prototype.complete = function() {

  this.active = false;

  // uses this.event() now.
  // this.sendPortOutput(':complete', '', this.chi);

  /**
   * Complete Event.
   *
   * The node has completed.
   *
   * TODO: a node can set itself as being active
   * active must be taken into account before calling
   * a node complete. As long as a node is active
   * it is not complete.
   *
   * @event Node#complete
   * @type {object}
   * @property {object} node - An export of this node
   */

  this.freeInput();

  this.setStatus('complete');

  this.event(':complete', {
    node: this.export()
  });

};

/**
 *
 * Runs the shutdown method of the blackbox
 *
 * An asynchronous node can define a shutdown function:
 *
 *   on.shutdown = function() {
 *
 *     // do shutdown stuff
 *
 *   }
 *
 * When a network shuts down, this function will be called.
 * To make sure all nodes shutdown gracefully.
 *
 * e.g. A node starting a http server can use this
 *      method to shutdown the server.
 *
 * @param {function} cb
 * @returns {undefined}
 * @public
 */
xNode.prototype.shutdown = function(cb) {
  if (this.nodebox.on && this.nodebox.on.shutdown) {

    // TODO: nodes now do nothing with the callback, they should..
    // otherwise we will hang
    this.nodebox.on.shutdown(cb);

    // TODO: send the nodebox, or just the node export?
    this.event(':shutdown', this.nodebox);

  }
  else {
    if (cb) {
      cb();
    }
  }
};

/**
 *
 * Cleanup
 *
 * @public
 */
xNode.prototype.destroy = function() {
  for (var i = 0; i < xNode.events.length; i++) {
    this.removeAllListeners(xNode.events[i]);
  }
};

/**
 *
 * Live reset, connections, etc. stay alive.
 *
 */
xNode.prototype.reset = function() {

  debug('%s: reset', this.identifier);

  // clear persistence
  this.persist = {};

  // clear any input
  this.freeInput();

  // reset status
  // note: also will retrigger the .start thing on nodebox.
  this.status = 'created';

  // reset any internal state.
  this.state = {};

  this.runCount = 0;

};

module.exports = xNode;

},{"./connector":15,"./node/interface":23,"./packet":25,"./port":26,"./port/filler":27,"./sandbox/node":31,"./sandbox/port":32,"debug":42,"util":7}],23:[function(require,module,exports){
'use strict';

/* jshint -W040 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var X = require('chix-chi');
var Port = require('../port');
var Packet = require('../packet');
var validate = require('../validate');
var Connections = require('../ConnectionMap');
var debug = require('debug')('chix:inode');

function INode(id, node, identifier, CHI) {

  if (!(this instanceof INode)) {
    return new INode(id, node, identifier, CHI);
  }

  this.pid = null;

  this.provider = node.provider;

  /**
   * @member {String} status
   * @public
   */
  this.status = 'unknown';

  /**
   * @member {String} id
   * @public
   */
  this.id = id;

  /**
   * @member {String} name
   * @public
   */
  this.name = node.name;

  /**
   * @member {String} ns
   * @public
   */
  this.ns = node.ns;

  /**
   * @member {String} title
   * @public
   */
  this.title = node.title;

  /**
   * @member {String} description
   * @public
   */
  this.description = node.description;

  /**
   * @member {Object} metadata
   * @public
   */
  this.metadata = node.metadata || {};

  /**
   * @member {String} identifier
   * @public
   */
  this.identifier = identifier || node.ns + ':' + node.name;

  if (!node.hasOwnProperty('ports')) {
    throw Error('INodeDefinition does not declare any ports');
  }

  if (!node.ports.output) {
    node.ports.output = {};
  }

  if (!node.ports.input) {
    node.ports.input = {};
  }

  if (CHI && CHI.constructor.name !== 'CHI') {
    throw Error('CHI should be instance of CHI');
  }

  this.CHI = CHI || new X();

  // let the node `interface` instantiate all port objects.
  // each extended will already have port object setup.

  /**
   *
   * Ports which are opened by openPort.
   *
   * The Actor opens each port when it connects to it.
   *
   * Also for IIPs the port will have to be opened first.
   *
   * @private
   **/
  this.openPorts = [];

  /**
   *
   * Will keep a list of connections to each port.
   *
   */
  this._connections = new Connections();

  /** @member {Object} ports */
  this.ports = this._clonePorts(node.ports);

  // how many times this node has run
  /** @member {Numeric} runCount */
  this.runCount = 0;

  // how many times this node gave port output
  /** @member {Numeric} outputCount */
  this.outputCount = 0;

  /** @member {Array} inPorts */
  Object.defineProperty(this, 'inPorts', {
    enumerable: true,
    get: function() {
      return Object.keys(this.ports.input);
    }
  });

  /** @member {Array} outPorts */
  Object.defineProperty(this, 'outPorts', {
    enumerable: true,
    get: function() {
      return Object.keys(this.ports.output);
    }
  });

  /** @member {Numeric} filled */
  Object.defineProperty(this, 'filled', {
    enumerable: true,
    configurable: false,
    get: function() {
      return Object.keys(this.input).length;
    }
  });

  // Always add complete port, :start port will be added
  // dynamicaly
  this.ports.output[':complete'] = {
    type: 'any'
  };

  var key;
  // TODO: should just be proper port objects.
  for (key in this.ports.input) {
    if (this.ports.input.hasOwnProperty(key)) {
      this.ports.input[key].fills = 0;
      this.ports.input[key].rejects = 0;
    }
  }

  for (key in this.ports.output) {
    if (this.ports.output.hasOwnProperty(key)) {
      this.ports.output[key].fills = 0;
    }
  }

}

util.inherits(INode, EventEmitter);

/**
 *
 * Create a Node
 *
 * @api public
 */
INode.create = function(id, def, identifier, CHI) {
  return new INode(id, def, identifier, CHI);
};

INode.prototype.getPid = function() {
  return this.pid;
};

INode.prototype._clonePorts = function(ports) {
  var type;
  var port;
  var copy = JSON.parse(JSON.stringify(ports));

  // keep fn in tact.
  // all same `instances` share this function.
  for (type in ports) {
    if (ports.hasOwnProperty(type)) {
      for (port in ports[type]) {
        if (ports[type].hasOwnProperty(port)) {
          if (ports[type][port].fn) {
            copy[type][port].fn = ports[type][port].fn;
            this.async = true; // TODO: remove the need of this flagging.
          }
        }
      }
    }
  }

  return copy;
};

/**
 *
 * @param {type} pid
 * @public
 */
INode.prototype.setPid = function(pid) {
  this.pid = pid;
};

/**
 *
 * Set Title
 *
 * Used to set the title of a node *within* a graph.
 * This property overwrites the setting of the node definition
 * and is returned during toJSON()
 *
 * @param {string} title
 * @public
 */
INode.prototype.setTitle = function(title) {
  this.title = title;
};

/**
 *
 * Set Description
 *
 * Used to set the description of a node *within* a graph.
 * This property overwrites the setting of the node definition
 * and is returned during toJSON()
 *
 * @param {string} description
 * @public
 */
INode.prototype.setDescription = function(description) {
  this.description = description;
};

/**
 *
 * Set metadata
 *
 * Currently:
 *
 *   x: x position hint for display
 *   y: y position hint for display
 *
 * These values are returned during toJSON()
 *
 * @param {object} metadata
 * @public
 */
INode.prototype.setMetadata = function(metadata) {
  for (var k in metadata) {
    if (metadata.hasOwnProperty(k)) {
      this.setMeta(k, metadata[k]);
    }
  }
};

/**
 *
 * Returns the node representation to be stored along
 * with the graph.
 *
 * This is not the full definition of the node itself.
 *
 * The full definition can be found using the ns/name pair
 * along with the provider property.
 *
 */
INode.prototype.toJSON = function() {

  var self = this;

  var json = {
    id: this.id,
    ns: this.ns,
    name: this.name
  };

  [
    'title',
    'description',
    'metadata',
    'provider'
  ].forEach(function(prop) {
    if (self[prop]) {
      if (typeof self[prop] !== 'object' ||
        Object.keys(self[prop]).length > 0) {
        json[prop] = self[prop];
      }
    }
  });

  return json;

};

/**
 *
 * @returns {Object}
 * @public
 */

INode.prototype.report = function() {

  return {
    id: this.id,
    identifier: this.identifier,
    title: this.title,
    filled: this.filled,
    runCount: this.runCount,
    outputCount: this.outputCount,
    status: this.status,
    input: this._filteredInput(),
    context: this.context,
    ports: this.ports,
    state: this.state,
    openPorts: this.openPorts,
    connections: this._connections.toJSON()
  };

};

/**
 *
 * @param {string} key
 * @param {any} value
 */
INode.prototype.setMeta = function(key, value) {
  this.metadata[key] = value;
};

/**
 *
 * Set node status.
 *
 * This is unused at the moment.
 *
 * Should probably contain states like:
 *
 *  - Hold
 *  - Complete
 *  - Ready
 *  - Error
 *  - Timeout
 *  - etc.
 *
 * Maybe something like Idle could also be implemented.
 * This would probably only make sense if there are persistent ports
 * which hold a reference to an instance upon which we can call methods.
 *
 * Such an `idle` state would indicate the node is ready to accept new
 * input.
 *
 * @param {String} status
 * @private
 */
INode.prototype.setStatus = function(status) {

  this.status = status;

  /**
   * Status Update Event.
   *
   * Fired multiple times on output
   *
   * Once for every output port.
   *
   * @event INode#statusUpdate
   * @type {object}
   * @property {object} node - An export of this node
   * @property {string} status - The status
   */
  this.event(':statusUpdate', {
    node: this.export(),
    status: this.status
  });

};

/**
 *
 * Get the current node status.
 *
 * This is unused at the moment.
 *
 * @public
 */
INode.prototype.getStatus = function() {

  return this.status;

};

INode.prototype.getParent = function() {
  return this.parent;
};

INode.prototype.setParent = function(node) {
  this.parent = node;
};

INode.prototype.hasParent = function() {
  return !!this.parent;
};

INode.events = [
  ':closePort',
  ':contextUpdate',
  ':contextClear',
  ':complete',
  ':error',
  ':executed',
  ':expose',
  ':fillCore',
  ':freePort',
  ':index',
  ':inputTimeout',
  ':inputValidated',
  ':nodeTimeout',
  ':openPort',
  ':output',
  ':plug',
  ':unplug',
  ':portFill',
  ':portReject',
  ':require',
  ':statusUpdate',
  ':start',
  ':shutdown'
];

/**
 *
 * @param {string} port
 * @param {Mixed} data
 * @private
 */
INode.prototype._handleFunctionType = function(port, data) {
  var portObj = this.getPort('input', port);
  // convert function if it's not already a function
  if (portObj.type === 'function' &&
    typeof data === 'string') {
    // args, can be used as a hint for named parms
    // if there are no arg names defined, use arguments
    var args = portObj.args ? portObj.args : [];
    data = new Function(args, data);
  }

  return data;
};

/**
 *
 * Fills the port.
 *
 * Does the same as fillPort, however it also checks:
 *
 *   - port availability
 *   - port settings
 *
 * FIXME: fill & fillPort can just be merged probably.
 *
 * @param {Object} target
 * @public
 */
INode.prototype.handleLinkSettings = function(target) {

  // FIX: hold is not handled anywhere as setting anymore
  if (target.has('hold')) {
    this.hold();
  }
  else if (target.has('persist')) {
    // FIX ME: has become a weird construction now
    //
    // THIS IS NOW BROKEN, on purpose.. :-)
    var index = target.get('index');

    // specialized case, make this more clear.
    // persist can be a boolean, or it becomes an array of
    // indexes to persist.
    if (index) {
      if (!Array.isArray(this.ports.input[target.port].persist)) {
        this.ports.input[target.port].persist = [];
      }
      this.ports.input[target.port].persist.push(index);
    }
    else {
      this.ports.input[target.port].persist = true;
    }
  }
};

INode.prototype._receive = function(target, p) {

  if (this.status === 'error') {
    return new Error('Port fill refused process is in error state');
  }

  if (!this.portExists('input', target.port)) {

    return new Error(util.format(
      'Process %s has no input port named `%s`\n\n' +
      '\tInput ports available:\n\n\t%s',
      this.identifier,
      target.port,
      this._portsAvailable()
    ));

  }

  if (!this.portIsOpen(target.port)) {
    return Error(util.format(
      'Trying to send to a closed port open it first: %s',
      target.port
    ));
  }

  // should probably moved somewhere later
  this.handleLinkSettings(target);

  var type = this.ports.input[target.port].type;

  if (type === 'array' && target.has('index')) {
    return this._handleArrayPort(target, p);
  }

  if (type === 'object' && target.has('index')) {
    return this._handleObjectPort(target, p);
  }

  // queue manager could just act on the false return
  // instead of checking inputPortAvailable by itself
  var ret = this.inputPortAvailable(target);
  if (!ret || util.isError(ret)) {

    /**
     * Port Reject Event.
     *
     * Fired when input on a port is rejected.
     *
     * @event INode#portReject
     * @type {object}
     * @property {object} node - An export of this node
     * @property {string} port - Name of the port this rejection occured
     */
    this.event(':portReject', {
      node: this.export(),
      port: target.port,
      data: p
    });

    return ret;

  }
  else {

    ret = this._fillPort(target, p);
    return ret;

  }

};

/**
 *
 * Handles an Array port
 *
 * [0,1,2]
 *
 * When sending IIPs the following can also happen:
 * [undefined, undefined, 2]
 * IIPs in this way must be send as a group.
 * That group will be added in reverse order.
 * This way 2 will create an array of length 3
 * This is important because we will check the length
 * whether we are ready to go.
 *
 * If 0 was added first, the length will be 1 and
 * it seems like we are ready to go, then 1 comes
 * and finds the process is already running..
 *
 * [undefined, undefined, 2]
 *
 * Connections:
 * [undefined, undefined, 2]
 *
 * @param {Connector} target
 * @param {Packet} p
 * @private
 */
INode.prototype._handleArrayPort = function(target, p) {

  // start building the array.
  if (target.has('index')) {

    // Marked the port as being indexed
    this.ports.input[target.port].indexed = true;

    // we have an index.
    // ok, one problem, with async, this.input
    // is never really filled...
    // look at that, will cause dangling data.
    if (!this.input[target.port]) {
      this.input[target.port] = [];
    }

    if (typeof this.input[target.port][target.get('index')] !== 'undefined') {
      // input not available, it will be queued.
      // (queue manager also stores [])
      return Port.INDEX_NOT_AVAILABLE;
    }
    else {

      this.event(':index', {
        node: this.export(),
        port: target.port,
        index: target.get('index')
      });

      this.input[target.port][target.get('index')] = p.data;
    }

    // it should at least be our length
    if (this._arrayPortIsFilled(target.port)) {

      // packet writing, CHECK THIS.
      p.data = this.input[target.port]; // the array we've created.

      // Unmark the port as being indexed
      delete this.ports.input[target.port].indexed;

      // ok, above all return true or false
      // this one is either returning true or an error.
      return this._fillPort(target, p);

    }
    else {

      // input length less than known connections length.
      return Port.AWAITING_INDEX;
    }

  }
  else {

    throw Error(util.format(
      '%s: `%s` value arriving at Array port `%s`, but no index[] is set',
      this.identifier,
      typeof p.data,
      target.port
    ));

  }
};

/**
 *
 * Handles an Object port
 *
 * @param {String} port
 * @param {Object} data
 * @param {Object} chi
 * @param {Object} source
 * @private
 */
// todo, the name of the variable should be target not source.
// source is only handled during output.
INode.prototype._handleObjectPort = function(target, p) {

  // start building the array.
  if (target.has('index')) {

    // we have a key.

    // Marked the port as being indexed
    this.ports.input[target.port].indexed = true;

    // Initialize empty object
    if (!this.input[target.port]) {
      this.input[target.port] = {};
    }

    // input not available, it will be queued.
    // (queue manager also stores [])
    if (typeof this.input[target.port][target.get('index')] !== 'undefined') {
      return false;
    }
    else {

      this.event(':index', {
        node: this.export(),
        port: target.port,
        index: target.get('index')
      });

      // define the key
      this.input[target.port][target.get('index')] = p.data;
    }

    // it should at least be our length
    //
    // Bug:
    //
    // This check is not executed when another port triggers
    // execution. the input object is filled, so it will
    // start anyway.
    //
    if (this._objectPortIsFilled(target.port)) {

      // PACKET WRITING CHECK THIS.
      p.data = this.input[target.port];

      // Unmark the port as being indexed
      delete this.ports.input[target.port].indexed;

      return this._fillPort(target, p);

    }
    else {
      // input length less than known connections length.
      return Port.AWAITING_INDEX;
    }

  }
  else {

    throw Error(util.format(
      '%s: `%s` value arriving at Object port `%s`, but no index[] is set',
      this.identifier,
      typeof p.data,
      target.port
    ));

  }
};

/**
 *
 * @param {string} port
 * @private
 */
INode.prototype._arrayPortIsFilled = function(port) {

  // Not even initialized
  if (typeof this.input[port] === undefined) {
    return false;
  }

  if (this.input[port].length < this._connections[port].length) {
    return false;
  }

  // Make sure we do not have undefined (unfulfilled ports)
  // (Should not really happen)
  for (var i = 0; i < this.input[port].length; i++) {
    if (this.input[port][i] === undefined) {
      return false;
    }
  }

  // Extra check for weird condition
  if (this.input[port].length > this._connections[port].length) {

    this.error(util.format(
      '%s: Array length out-of-bounds for port',
      this.identifier,
      port
    ));

    return false;

  }

  return true;

};

/**
 *
 * @param {string} port
 * @private
 */
INode.prototype._objectPortIsFilled = function(port) {

  // Not even initialized
  if (typeof this.input[port] === undefined) {
    return false;
  }

  // Not all connections have provided input yet
  if (Object.keys(this.input[port]).length < this._connections[port].length) {
    return false;
  }

  // Make sure we do not have undefined (unfulfilled ports)
  // (Should not really happen)
  for (var key in this.input[port]) {
    if (this.input[port][key] === undefined) {
      return false;
    }
  }

  // Extra check for weird condition
  if (Object.keys(this.input[port]).length > this._connections[port].length) {

    this.error(util.format(
      '%s: Object keys length out-of-bounds for port `%s`',
      this.identifier,
      port
    ));

    return false;

  }

  return true;

};

/**
 *
 * @param {string} port
 * @param {Mixed} data
 * @private
 */
INode.prototype._validateInput = function(port, data) {

  if (!this.ports.input.hasOwnProperty(port)) {

    var msg = Error(util.format('no such port: **%s**', port));

    return Error(msg);
  }

  if (!validate.data(this.ports.input[port].type, data)) {

    // TODO: emit these errors, with error constants
    var expected = this.ports.input[port].type;
    var real = Object.prototype.toString.call(data).match(/\s(\w+)/)[1];

    if (data && typeof data === 'object' &&
      data.constructor.name === 'Object') {
      var tmp = Object.getPrototypeOf(data).constructor.name;

      if (tmp) {
        // not sure, sometimes there is no name?
        // in witch case all you can do is type your name as being an 'object'
        real = tmp;
      }
    }

    return Error(util.format(
      'Expected `%s` got `%s` on port `%s`',
      expected, real, port));
  }

  /**
   * Input Validated Event.
   *
   * Occurs when a port was succesfully validated
   *
   * @event INode#inputValidated
   * @type {object}
   * @property {object} node - An export of this node
   * @property {string} port - Name of the port
   */
  this.event(':inputValidated', {
    node: this.export(),
    port: port
  });

  return true;
};

INode.prototype.sendPortOutput = function(port, output, chi) {

  if (!chi) {
    chi = {};
  }

  this.CHI.merge(chi, this.chi, false);

  if (output === undefined) {
    throw Error(
      util.format(
        '%s: Undefined output is not allowed `%s`', this.identifier, port
      )
    );
  }

  if (port === 'error' && output === null) {

    // allow nodes to send null error, but don't trigger it as output.

  }
  else {

    if (this.ports.output.hasOwnProperty(port) ||
      INode.events.indexOf(port) !== -1 // system events
    ) {

      if (this.ports.output.hasOwnProperty(port)) {
        this.ports.output[port].fills++;
        this.outputCount++;
      }

      // so basically all output is a new packet.
      // with chi sustained or enriched.
      var p = new Packet(output);
      p.set('chi', chi);

      debug('%s:%s output', this.identifier, port);

      this.emit('output', {
        node: this.export(),
        port: port,
        out: p
      });

    }
    else {
      throw Error(this.identifier + ': no such output port ' + port);
    }

  }

};

/**
 *
 * Validate a single value
 *
 * TODO: Object (and function) validation could be expanded
 * to match an expected object structure, this information
 * is already available.
 *
 * @param {String} type
 * @param {Object} data
 * @private
 */

/**
 *
 * Does both send events through output ports
 * and emits them.
 *
 * Not sure whether sending the chi is really necessary..
 *
 * @param {string} eventName
 * @param {Packet} p
 * @protected
 */
INode.prototype.event = function(eventName, p) {

  // event ports are prefixed with `:`
  this.sendPortOutput(eventName, p);

};

/**
 *
 * Could be used to externally set a node into error state
 *
 * INode.error(node, Error('you are bad');
 *
 * @param {Error} err
 * @returns {Error}
 */
INode.prototype.error = function(err) {

  var error = util.isError(err) ? err : Error(err);

  // Update our own status
  this.setStatus('error');

  // TODO: better to have full (custom) error objects
  var eobj = {
    //node: node.export(),
    node: this, // do not export so soon.
    msg: err
  };

  // Used for in graph sending
  this.event(':error', eobj);

  // Used by Process Manager or whoever handles the node
  this.emit('error', eobj);

  return error;
};

/**
 *
 * Add context.
 *
 * Must be set in one go.
 *
 * @param {Object} context
 * @public
 */
INode.prototype.addContext = function(context) {
  var port;
  for (port in context) {
    if (context.hasOwnProperty(port)) {
      this.setContextProperty(port, context[port]);
    }
  }
};

/**
 *
 * Do a lightweight export of this node.
 *
 * Used in emit's to give node information
 *
 *
 * @return {Object}
 * @public
 */
INode.prototype.export = function() {

  return {

    id: this.id,
    ns: this.ns,
    name: this.name,
    title: this.title,
    pid: this.pid,
    identifier: this.identifier,
    ports: this.ports,
    cycles: this.cycles,
    inPorts: this.inPorts,
    outPorts: this.outPorts,
    filled: this.filled,
    context: this.context,
    require: this.require,
    status: this.status,
    runCount: this.runCount,
    expose: this.expose,
    active: this.active,
    metadata: this.metadata,
    provider: this.provider,
    input: this._filteredInput(),
    openPorts: this.openPorts,
    nodeTimeout: this.nodeTimeout,
    inputTimeout: this.inputTimeout
  };

};

/**
 *
 * Set context to a port.
 *
 * Can be changed during runtime, but will never trigger
 * a start.
 *
 * Adding the whole context in one go could trigger a start.
 *
 * Packet wise thise content is anonymous.
 *
 * @param {String} port
 * @param {Mixed} data
 * @fires INode#contextUpdate
 * @private
 */
INode.prototype.setContextProperty = function(port, data) {

  if (port === ':start') {
    this.initStartPort();
  }

  var res = this._validateInput(port, data);

  if (util.isError(res)) {

    this.event(':error', {
      node: this.export(),
      msg: Error('setContextProperty: ' + res.message)
    });

  }
  else {

    data = this._handleFunctionType(port, data);

    this.$setContextProperty(port, data);

    this.event(':contextUpdate', {
      node: this,
      port: port,
      data: data
    });

  }
};

INode.prototype.setContext = INode.prototype.setContextProperty;

/**
 *
 * Filters the input for export.
 *
 * Leaving out everything defined as a function
 *
 * Note: depends on the stage of emit whether this value contains anything
 *
 * @return {Object} Filtered Input
 * @private
 */
INode.prototype._filteredInput = function() {
  var port;
  var type;
  var input = {};

  for (port in this.input) {
    if (this.portExists('input', port)) {
      type = this.ports.input[port].type;

      if (type === 'string' ||
        type === 'number' ||
        type === 'enum' ||
        type === 'boolean') {
        input[port] = this.input[port];
      }
      else {
        // can't think of anything better right now
        input[port] = Object.prototype.toString.call(this.input[port]);
      }

    }
    else {

      // faulty but used during export so we want to know
      input[port] = this.input[port];

    }
  }

  return input;
};

// TODO: these port function only make sense for a graph
//       or a dynamic node.

INode.prototype.addPort = function(type, port, def) {
  if (!this.portExists(type, port)) {
    this.ports[type][port] = def;
    return true;
  }
  else {
    return Error('Port already exists');
  }
};

INode.prototype.removePort = function(type, port) {
  if (this.portExists(type, port)) {
    delete this.ports[type][port];
    if (type === 'input') {
      this.clearInput(port);
      this.clearContextProperty(port);
      return true;
    }
  }
  else {
    //return Error(this, 'No such port');
    return Error('No such port');
  }
};

INode.prototype.renamePort = function(type, from, to) {
  if (this.portExists(type, from)) {
    this.ports[type][to] = this.ports[type][from];
    delete this.ports[type][from];
    return true;
  }
  else {
    //return Error(this, 'No such port');
    return Error('No such port');
  }
};

INode.prototype.getPort = function(type, name) {
  if (this.ports.hasOwnProperty(type) &&
    this.ports[type].hasOwnProperty(name)) {
    return this.ports[type][name];
  }
  else {
    throw new Error('Port `' + name + '` does not exist');
  }
};

INode.prototype.getPortOption = function(type, name, opt) {
  var port = this.getPort(type, name);
  if (port.hasOwnProperty(opt)) {
    return port[opt];
  }
  else {
    return undefined;
  }
};

INode.prototype.portExists = function(type, port) {
  return (this.ports[type] && this.ports[type].hasOwnProperty(port)) ||
    (type === 'output' && INode.events.indexOf(port) >= 0);
};

/**
 *
 *
 * @param {String} port
 * @public
 */
INode.prototype.openPort = function(port) {

  if (this.portExists('input', port)) {

    if (this.openPorts.indexOf(port) === -1) {

      this.openPorts.push(port);

      this.event(':openPort', {
        node: this.export(),
        port: port,
        connections: this._connections.hasOwnProperty(port) ?
          this._connections[port].length : // enough info for now
          0 // set by context
      });

    }

    // opening twice is allowed.
    return true;

  }
  else {

    // TODO: make these error codes, used many times, etc.
    return Error(util.format('no such port: **%s**', port));

  }

};

/**
 *
 * @param {string} port
 * @returns {Boolean}
 */
INode.prototype.closePort = function(port) {

  if (this.portExists('input', port)) {

    this.openPorts.splice(this.openPorts.indexOf(port), 1);

    this.event(':closePort', {
      node: this.export(),
      port: port
    });

    return true;

  }
  else {

    // TODO: make these error codes, used many times, etc.
    //return Error(this, util.format('no such port: **%s**', port));
    return Error(util.format('no such port: **%s**', port));

  }

};

/**
 * Whether a port is currently opened
 *
 * @param {String} port
 * @return {Boolean}
 * @private
 */
INode.prototype.portIsOpen = function(port) {
  return this.openPorts.indexOf(port) >= 0;
};

/**
 *
 * Checks whether the input port is available
 *
 * @param {Connector}  target
 * @public
 */
INode.prototype.inputPortAvailable = function(target) {

  if (target.has('index')) {

    if (this.ports.input[target.port].type !== 'array' &&
      this.ports.input[target.port].type !== 'object') {

      return Error([
        this.identifier,
        'Unexpected Index[] information on non array port:',
        target.port
      ].join(' '));
    }

    // not defined yet
    if (!this.input.hasOwnProperty(target.port)) {
      return Port.AVAILABLE;
    }

    // only available if [] is not already filled.
    if (this.input[target.port][target.get('index')] !== undefined) {
      return Port.INDEX_NOT_AVAILABLE;
    }

    if (this.input.length === this._connections[target.port].length) {
      return Port.ARRAY_PORT_FULL;
    }

    return Port.INDEX_AVAILABLE;

  }

  var ret = !this.$portIsFilled(target.port) ?
    Port.AVAILABLE : Port.UNAVAILABLE;
  return ret;

};

/**
 *
 * @param {Connector} target
 * @returns {Boolean}
 * @public
 */
INode.prototype.plug = function(target) {

  if (target.port === ':start') {
    this._initStartPort();
  }

  if (this.portExists('input', target.port)) {

    if (!this._connections[target.port]) {
      this._connections[target.port] = [];
    }

    // direct node fill does not have it.
    if (target.wire) {
      this._connections[target.port].push(target.wire);
    }

    this.event(':plug', {
      node: this.export(),
      port: target.port,
      connections: this._connections[target.port].length
    });

    this.openPort(target.port);

    return true;

  }
  else {

    // problem of whoever tries to attach
    return Error(util.format(
      'Process `%s` has no input port named `%s`\n\n\t' +
      'Input ports available: %s\n\n\t',
      this.identifier,
      target.port,
      this._portsAvailable()
    ));

  }

};

INode.prototype._portsAvailable = function() {
  var ports = [];
  var self = this;
  Object.keys(this.ports.input).forEach(function(port) {
    if (
      (!self.ports.input[port].hasOwnProperty('required') ||
        self.ports.input[port].required === true) &&
      !self.ports.input[port].hasOwnProperty('default')) {
      ports.push(port + '*');
    }
    else {
      ports.push(port);
    }
  });
  return ports.join(', ');
};

/**
 *
 * Determine whether this node has any connections
 *
 * FIX this.
 *
 * @return {Boolean}
 * @public
 */
INode.prototype.hasConnections = function() {
  //return this.openPorts.length;
  var port;
  for (port in this._connections) {
    if (this._connections[port] &&
      this._connections[port].length) {
      return true;
    }
  }

  return false;
};

/**
 *
 * Unplugs a connection from a port
 *
 * Will decrease the amount of connections to a port.
 *
 * TODO: make sure we remove the exact target
 *       right now it just uses pop()
 *
 * @param {Connector} target
 * @public
 */
INode.prototype.unplug = function(target) {

  if (this.portExists('input', target.port)) {

    // direct node fill does not have it
    if (target.wire) {

      if (!this._connections[target.port] ||
        !this._connections[target.port].length) {
        return this.error('No such connection');
      }

      var pos = this._connections[target.port].indexOf(target.wire);
      if (pos === -1) {
        // problem of whoever tries to unplug it
        //return Error(this, 'Link is not connected to this port');
        return Error('Link is not connected to this port');
      }

      this._connections[target.port].splice(pos, 1);
    }

    this.event(':unplug', {
      node: this.export(),
      port: target.port,
      connections: this._connections[target.port].length
    });

    // ok port should only be closed if there are no connections to it
    if (!this.portHasConnections(target.port)) {
      this.closePort(target.port);
    }

    // if this is the :start port also remove it from inports
    // this port is re-added next time during open port
    // TODO: figure out what happens with multiple connections to a :start port
    // because that's also possible, when true connections are made to it,
    // not iip onces,
    if (target.port === ':start' &&
      target.wire.source.port === ':iip' && // start always has a wire.
      this._connections[target.port].length === 0) {
      this.removePort('input', ':start');
    }

    return true;

  }
  else {

    // :start is dynamic, maybe the throw below is no necessary at all
    // no harm in unplugging something non-existent
    if (target.port !== ':start') {

      // problem of whoever tries to unplug
      return Error(util.format(
        'Process `%s` has no input port named `%s`\n\n\t' +
        'Input ports available: \n\n\t%s',
        this.identifier,
        target.port,
        this._portsAvailable()
      ));

    }

  }

};

INode.prototype.start = function() {
  throw Error('INode needs to implement start()');
};

/**
 *
 * Sets an input port option.
 *
 * The node schema for instance can specifiy whether a port is persistent.
 *
 * At the moment a connection can override these values.
 * It's a way of saying I give you this once so take care of it.
 *
 * @param {string} type
 * @param {string} name
 * @param {string} opt
 * @param {any} value
 * @returns {undefined}
 */
INode.prototype.setPortOption = function(type, name, opt, value) {
  var port = this.getPort(type, name);
  port[opt] = value;
};

INode.prototype.setPortOptions = function(type, options) {
  var opt;
  var port;
  for (port in options) {
    if (options.hasOwnProperty(port)) {
      for (opt in options[port]) {
        if (options[port].hasOwnProperty(opt)) {
          if (options.hasOwnProperty(opt)) {
            this.setPortOption(type, port, opt, options[opt]);
          }
        }
      }
    }
  }
};

// Connection Stuff, should be in the Port object
INode.prototype.portHasConnection = function(port, link) {
  return this._connections[port] && this._connections[port].indexOf(link) >= 0;
};
INode.prototype.portHasConnections = function(port) {
  return !!(this._connections[port] && this._connections[port].length > 0);
};

INode.prototype.portGetConnections = function(port) {
  return this._connections[port] || [];
};

INode.prototype.getConnections = function() {
  return this._connections;
};

module.exports = INode;

},{"../ConnectionMap":13,"../packet":25,"../port":26,"../validate":34,"chix-chi":8,"debug":42,"events":2,"util":7}],24:[function(require,module,exports){
'use strict';

/* global document */

var util = require('util');
var Packet = require('../packet');
var xNode = require('./interface');

/**
 *
 * This whole context, default thing is handled differently here.
 * They only make sense on startup as defaults.
 *
 * Since all they are is attributes.
 *
 * For non attribute input ports context & default make no sense.
 * so are ignored.
 *
 * @param {type} id
 * @param {type} node
 * @param {type} identifier
 * @param {type} CHI
 * @returns {PolymerNode}
 */

function PolymerNode(id, node, identifier, CHI) {

  // not sure where to call this yet.
  PolymerNode.super_.apply(this, arguments);

  var self = this;

  this.id = id;

  this.ns = node.ns;
  this.name = node.name;

  this.type = 'polymer';

  this.identifier = identifier;

  this.chi = {};

  this.CHI = CHI;

  /* wanna use this with a Polymer node? */
  this.input = {};

  var da = this.id.split('');
  da.forEach(function(v, i, arr) {
    if (/[A-Z]/.test(v)) {
      arr.splice(i, 1, (i > 0 ? '-' : '') + v.toLowerCase());
    }
  });

  this.elementId = da.join('');

  // TODO: will I use this.ports?
  // for required, default, type etc I still need it.

  /**
   *
   * Problem here is I use uuid's
   * This can be solved by not generating them.
   *
   **/
  this.wc = document.getElementById(this.elementId);
  if (!this.wc) {
    // automatically create the element
    console.log('creating', this.name);
    this.wc = document.createElement(this.name);
    this.wc.setAttribute('id', this.elementId);
    document.querySelector('body').appendChild(this.wc);
  }

  if (!this.wc) {
    throw Error('Polymer Web Component could not be found');
  }

  // TODO: do some basic check whether this really is a polymer element

  // there should be dynamic stuff for e.g. on-tap
  // Ok it's also clear .fbp graphs become just as nested
  // as the components itself, other wise it will not work.
  // one graph means one component.
  // Also if there are then template variable they need to be described.
  // blargh. :-)
  // Ok but these node definitions are so they are selectable within
  // the .fbp that's kinda solved.
  // I should not try to do to much logic for the UI itself.
  // that's not necessary and undoable.
  // So the best example is chix-configurator and the reason I've
  // created it in the first place.
  /*
  Problem a component is composite, defines properties.

  Graph is composite defines external ports.

  Fbpx Graph !== Composite Webcomponent.

  However I treat the composite component as a node Definition.
  So then I have the problem of the same component.
  representing a nodeDefinion but also a graph.

  Which would almost indicate a webcomponent is always also
  a graph, which could be possible, because a graph is also
  a nodeDefinition in chix.

  err, it is possible, but a bit complex.

  which means a polymerNode is closer to xFlow then to xNode.

  */
  function sendPortOutput(port) {
    return function(ev) {
      self.emit('output', {
        node: self.export(),
        port: port,
        out: new Packet(ev)
      });
    };
  }

  if (Object.keys(node.ports.output).length) {
    for (var port in node.ports.output) {
      if (node.ports.output.hasOwnProperty(port)) {
        this.wc.addEventListener(port, sendPortOutput(port));
      }
    }
  }

  this.status = 'ready';

}

util.inherits(PolymerNode, xNode);

PolymerNode.prototype.start = function() {
  /* nothing to do really */
  return true;
};

/**
 *
 * Must do the same kind of logic as xNode
 * Therefor having Ports at this point would be handy
 * Let's at least start by putting those methods in the `interface`.
 */
PolymerNode.prototype.fill = function(target, p) {

  /* input can be an attribute, or one of our methods */
  if (typeof this.wc[target.port] === 'function') {
    this.wc[target.port](p.data);
  }
  else {
    // must be an attribute
    this.wc.setAttribute(target.port, p.data);
  }

};

PolymerNode.prototype.$portIsFilled = function( /*port*/ ) {
  //return this.input.hasOwnProperty(port);
  return false;
};

/**
 *
 * Holds all input until release is called
 *
 * @public
 */
PolymerNode.prototype.hold = function() {
  this.setStatus('hold');
};

/**
 *
 * Releases the node if it was on hold
 *
 * @public
 */
PolymerNode.prototype.release = function() {

  this.setStatus('ready');

  if (this.__halted) {
    this.__halted = false;
    // not much to do
  }
};

module.exports = PolymerNode;

},{"../packet":25,"./interface":23,"util":7}],25:[function(require,module,exports){
'use strict';

/**
 *
 * A packet wraps the data.
 *
 * Enabling tracking and adding metadata
 *
 * Filters are not really creating new packets.
 * But modify the data.
 *
 * Maybe use getters and setters?
 *
 * var p = new Packet(data);
 *
 * drop(p);
 *
 * Packet containing it's own map of source & target.
 * Could be possible, only what will happen on split.
 *
 */
var nr = 10000000000;
function Packet(data, n, c) {

  this.data = data;
  this.chi = {};
  this.nr = n ? n : nr++;
  this.c = c ? c : 0; // clone version
  this.owner = undefined;

  // probably too much info for a basic packet.
  // this.created_at =
  // this.updated_at =

}

Packet.prototype.read = function() {
  return this.data;
};

Packet.prototype.write = function(data) {
  this.data = data;
};

// clone can only take place on plain object data.

/**
 * Clone the current packet
 *
 * In case of non plain objects it's mostly desired
 * not to clone the data itself, however do create a *new*
 * packet with the other cloned information.
 *
 * To enable this set cloneData to true.
 *
 * @param {Boolean} cloneData Whether or not to clone the data.
 */
Packet.prototype.clone = function(cloneData) {
  var p = new Packet(
    cloneData === undefined ?
    JSON.parse(JSON.stringify(this.data)) :
    this.data,
    this.nr,
    ++this.c
  );
  p.set('chi', JSON.parse(JSON.stringify(this.chi)));
  return p;
};

Packet.prototype.set = function(prop, val) {
  this[prop] = val;
};

Packet.prototype.get = function(prop) {
  return this[prop];
};

Packet.prototype.del = function(prop) {
  delete this[prop];
};

Packet.prototype.has = function(prop) {
  return this.hasOwnProperty(prop);
};

module.exports = Packet;

},{}],26:[function(require,module,exports){
'use strict';

/**
 *
 * Port
 *
 * Distinct between input & output port
 * Most methods are for input ports.
 *
 * @example
 *
 *  var port = new Port();
 *  port.receive(p);
 *  port.receive(p); // rejected
 *  port.read();
 *  port.read();
 *  port.receive(p);
 *
 */
function Port() {

  //if (!(this instanceof Port)) return new Port(options);

  // important to just name it input for refactor.
	// eventually can be renamed to something else.
  //
	// node.input[port] becomes node.getPort(port).input
  //
  this.input = undefined;

  this._open = false;

  // If async the value will pass right through a.k.a. non-blocking
	// If there are multiple async ports, the code implementation
	// consequently must be a state machine.
	// async + sync is still possible. One async port is just one
	// function call and thus not a state machine.
  this.async = false;
  this._connections = [];

}

// Important to make clear for debugging
// during port fill the message comes back.
// these names though are confusing.
// I want these to be like Errors but not errors.

// requeue
Port.INPUT_REVOKED       = false; // removed by a portbox
Port.NOT_FILLED          = false; // ??

// ok there is a mixture of functionality here.
// Port.AVAILABLE for example is just a return code for availability
// and does not indicate whether the port was filled.
/*
  Port.AVAILABLE;
  Port.INDEX_NOT_AVAILABLE;
  Port.ARRAY_PORT_FULL;
  Port.INDEX_AVAILABLE;
 Port.AVAILABLE : Port.UNAVAILABLE;
*/

// success

// used in input port available
Port.AVAILABLE           = true; // non index port was set
Port.UNAVAILABLE         = false; // not an index port but input is already set
Port.INDEX_AVAILABLE     = true; // index was set
Port.INDEX_NOT_AVAILABLE = false; // index already filled
// could be the same as index not available,
// this just tells it's full and will be processed
Port.ARRAY_PORT_FULL     = false;

// index was set, but waiting others to be filled
Port.AWAITING_INDEX      = true;

// this is a weird return code,
// because it's probably not about the filled port itself
Port.CONTEXT_SET         = true;
Port.PERSISTED_SET       = true; // idem
Port.DEFAULT_SET         = true; // idem
Port.NOT_REQUIRED        = true; // idem
Port.FILLED              = true; // port was filled.

/**
 *
 * Used from within a component to receive the port data
 *
 */
Port.prototype.receive = function() {
};

/**
 *
 * Used from within a component to close the port
 *
 * A component receives an open port.
 * When the port closes it's ready to be filled.
 * This also means there are two sides on a port
 * Open for input and open for output to the component.
 *
 */
Port.prototype.close = function() {
  this._open = false;
};

Port.prototype.open = function() {
  this._open = true;
};

// TODO: after refactor these will end up elsewhere
Port.prototype.hasConnection = function(link) {
  return this._connections && this._connections.indexOf(link) >= 0;
};
Port.prototype.hasConnections = function() {
  return this._connections.length > 0;
};

Port.prototype.getConnections = function() {
  return this._connections;
};

// this seems to be a wrong check?
// ah no, no property means not filled.
// but this is just wrong. array port for example is not filled, if it's set.
// it's being taken care of, but only causes more code to be necessary
Port.prototype.isFilled = function() {
  return this.input !== undefined;
};

Port.prototype.clearInput = function() {
  this.input = undefined;
};

Port.prototype.isAvailable = function() {
};

// Node freePort
Port.prototype.free = function() {

  var persist = this.getOption('persist');
  if (persist) {
    // persist, chi, hmz, seeze to exist.
    // but wouldn't matter much, with peristent ports.
    // TODO: this.filled is not used anymore.

    // indexes are persisted per index.
    if (Array.isArray(persist)) {
      for (var k in this.input) {
        if (persist.indexOf(k) === -1) {
          // remove
          delete this.input[k];
        }
      }
    }

  } else {

    // not sure, activeConnections could stay a node thing.

    // this also removes context and default..
    this.clearInput();

    this.event(':freePort', {
      node: this.export(),
      link: this._activeConnections,
      port: this.name
    });

    this.emit('freePort', {
      node: this.export(),
      link: this._activeConnections,
      port: this.name
    });

    // delete reference to active connection (if there was one)
    delete this._activeConnections;
  }

};

//Node.prototype.getPortOption = function(type, name, opt) {

// could become this.setting[opt], but that will change things too much
Port.prototype.getOption = function(opt) {
  if (this.hasOwnProperty(opt)) {
    return this[opt];
  } else {
    return undefined;
  }
};

/**
 *
 * Sets an input port option.
 *
 * The node schema for instance can specifiy whether a port is persistent.
 *
 * At the moment a connection can override these values.
 * It's a way of saying I give you this once so take care of it.
 *
 */
//Node.prototype.setPortOption = function(type, name, opt, value) {
Port.prototype.setOption = function(opt, value) {
  this[opt] = value;
};

//Node.prototype.setPortOptions = function(type, options) {
Port.prototype.setOptions = function(options) {
  var opt;
  var port;
  for (port in options) {
    if (options.hasOwnProperty(port)) {
      for (opt in options[port]) {
        if (options[port].hasOwnProperty(opt)) {
          if (options.hasOwnProperty(opt)) {
            this.setOption(opt, options[opt]);
          }
        }
      }
    }
  }
};

module.exports = Port;

},{}],27:[function(require,module,exports){
'use strict';

var Port = require('../port');
var util = require('util');

var portFill;

module.exports = portFill = exports;

exports.fill = function(ports, input, context) {

  var ret;

  for (var port in ports) {
    if (ports.hasOwnProperty(port)) {
      ret = portFill.defaulter(
        port,
        ports,
        input,
        context
      );
      if (util.isError(ret)) {
        return ret;
      }
    }
  }

  return true;

};

exports.check = function(obj, key, input, context, persist) {
  var ret;

  if (obj[key].properties) { //
    var init;

    if (!input[key]) {
      input[key] = {};
      init = true;
    }

    for (var k in obj[key].properties) {
      if (obj[key].properties.hasOwnProperty(k)) {

        ret = !portFill.check(
          obj[key].properties,
          k,
          input[key],
          context ? context[key] : {},
          persist ? persist[key] : {}
        );

        if (!ret) {

          // use this again, just return the value
          // this will have checked the nested schema definitions.
          // return ret;
          /*
                  throw new Error([
                    this.identifier + ': Cannot determine input for property:',
                    key + '[' + k + ']'
                  ].join(' '));
          */
        }
      }
    }

    if (!Object.keys(input[key]).length && init) {
      // remove empty object again
      delete input[key]; // er ref will not work probably.
    }

    // not sure, but at least should be true.
    return Port.FILLED;

  }
  else {

    // check whether input was defined for this port
    if (!input.hasOwnProperty(key)) {
      // if there is context, use that.
      if (context && context.hasOwnProperty(key)) {
        input[key] = context[key];
        return Port.CONTEXT_SET;
        // check the existance of default (a value of null is also valid)
      }
      else if (persist && persist.hasOwnProperty(key)) {
        input[key] = persist[key];
        return Port.PERSISTED_SET;
      }
      else if (obj[key].hasOwnProperty('default')) {
        input[key] = obj[key].default;
        return Port.DEFAULT_SET;
      }
      else if (obj[key].required === false) {
        // filled but empty let the node handle it.
        input[key] = null;
        return Port.NOT_REQUIRED;
      }
      else {
        return Port.NOT_FILLED;
      }

    }
    else {
      return Port.FILLED;
    }

  }
};

// also fill the defaults one level deep..
/**
 *
 * @param {string} port
 * @private
 */
exports.defaulter = function(port, ports, input, context) {
  if (!portFill.check(
      ports,
      port,
      input,
      context
    ) && !ports[port].async) {

    if (port[0] !== ':') {
      return Port.SYNC_PORTS_UNFULFILLED;
      /*
            // fail hard
            return Error(util.format(
              '%s: Cannot determine input for port `%s`',
              this.identifier,
              port
            ));
      */

    }

  }
};

},{"../port":26,"util":7}],28:[function(require,module,exports){
(function (process){
'use strict';

var util = require('util');
var uuid = require('uuid').v4;
var EventEmitter = require('events').EventEmitter;

var onExit = [];
if (process.on) { // old browserify
  process.on('exit', function onExitHandlerProcessManager() {
    onExit.forEach(function(instance) {

      var key;
      var process;
      var report;
      var reports = {};

      for (key in instance.processes) {
        if (instance.processes.hasOwnProperty(key)) {
          process = instance.processes[key];
          if (process.type === 'flow') {
            report = process.report();
            if (!report.ok) {
              reports[key] = report;
            }
          }
        }
      }

      if (Object.keys(reports).length) {
        instance.emit('report', reports);
      }

    });
  });
}

/**
 *
 * Default Process Manager
 *
 * @constructor
 * @public
 *
 */
function ProcessManager() {

  this.processes = {};

  onExit.push(this);

}

util.inherits(ProcessManager, EventEmitter);

ProcessManager.prototype.getMainGraph = function() {
  return this.getMainGraphs().pop();
};

ProcessManager.prototype.getMainGraphs = function() {

  var main = [];
  var key;
  var p;

  for (key in this.processes) {
    if (this.processes.hasOwnProperty(key)) {
      p = this.processes[key];
      if (p.type === 'flow' && !p.hasParent()) {
        main.push(p);
      }
    }
  }

  return main;

};

ProcessManager.prototype.onProcessStartHandler = function(event) {
  this.emit('startProcess', event.node);
};
ProcessManager.prototype.onProcessStopHandler = function(event) {
  this.emit('stopProcess', event.node);
};
ProcessManager.prototype.register = function(node) {

  if (node.pid) {
    throw new Error('Refusing to add node with existing process id');
  }

  var pid = uuid();
  node.setPid(pid);
  this.processes[pid] = node;

  // Note: at the moment only subgraphs emit the start event.
  // and only subgraphs can be stopped, this is good I think.
  // The process manager itself holds *all* nodes.
  // Start is a push on the actor.
  // However, when we start a network we only care about
  // the push on the main actor, not the subgraphs.
  // So this is something to think about when you listen
  // for startProcess.
  // Maybe for single stop and start of nodes the actor should be used
  // and the actor emits the stop & start events, with the node info
  // To stop a node: this.get(graphId).hold(nodeId);
  // Ok you just do not stop single nodes, you hold them.
  // Stop a node and your network is borked.
  this.processes[pid].on('start', this.onProcessStartHandler.bind(this));
  this.processes[pid].on('stop', this.onProcessStopHandler.bind(this));

  // Process manager handles all errors.
  // or in fact, ok we have to add a errorHandler ourselfes also
  // but the process manager will be able to do maintainance?
  node.on('error', this.processErrorHandler.bind(this));

  // pid is in node.pid
  this.emit('addProcess', node);

};

/**
 *
 * Process Error Handler.
 *
 * The only errors we receive come from the nodes themselves.
 * It's also garanteed if we receive an error the process itself
 * Is already within an error state.
 *
 */
ProcessManager.prototype.processErrorHandler = function(event) {

  if (event.node.status !== 'error') {
    console.log('STATUS', event.node.status);
    throw Error('Process is not within error state', event.node.status);
  }

  // Emit it, humans must solve this.
  this.emit('error', event);

};

ProcessManager.prototype.changePid = function(from, to) {

  if (this.processes.hasOwnProperty(from)) {
    this.processes[to] = this.processes[from];
    delete this.processes[from];
  }
  else {
    throw Error('Process id not found');
  }

  this.emit('changePid', {
    from: from,
    to: to
  });

};

// TODO: improve start, stop, hold, release logic..
ProcessManager.prototype.start = function(node) {

  // allow by pid and by node object
  var pid = typeof node === 'object' ? node.pid : node;

  if (this.processes.hasOwnProperty(pid)) {
    if (this.processes[pid].type === 'flow') {
      this.processes[pid].start();
    }
    else {
      this.processes[pid].release();
    }
  }
  else {
    throw Error('Process id not found');
  }
};

ProcessManager.prototype.stop = function(node, cb) {

  // allow by pid and by node object
  var pid = typeof node === 'object' ? node.pid : node;

  if (this.processes.hasOwnProperty(pid)) {
    if (this.processes[pid].type === 'flow') {
      this.processes[pid].stop(cb);
    }
    else {
      this.processes[pid].hold(cb);
    }
  }
  else {
    throw Error('Process id not found');
  }
};

// TODO: just deleting is not enough.
// links also contains the pids
// on remove process those links should also be removed.
ProcessManager.prototype.unregister = function(node, cb) {

  var self = this;

  if (!node.pid) {
    throw new Error('Process id not found');
  }

  function onUnregister(node, cb) {

    /*
    node.removeListener('start', self.onProcessStartHandler);
    node.removeListener('stop', self.onProcessStopHandler);
    node.removeListener('error', self.processErrorHandler);
    */

    node.removeAllListeners('start');
    node.removeAllListeners('stop');
    node.removeAllListeners('error');

    delete self.processes[node.pid];

    // remove pid
    delete node.pid;

    // todo maybe normal nodes should also use stop + cb?
    if (cb) {
      cb(node);
    }

    self.emit('removeProcess', node);

  }

  if (this.processes[node.pid].type === 'flow') {

    // wait for `subnet` to be finished
    self.stop(node, onUnregister.bind(this, node, cb));

  }
  else {

    node.shutdown(onUnregister.bind(this, node, cb));

  }

};

/**
 *
 * Get Process
 * Either by id or it's pid.
 *
 */
ProcessManager.prototype.get = function(pid) {

  return this.processes[pid];

};

/**
 *
 * Using the same subgraph id for processes can work for a while.
 *
 * This method makes it possible to find graphs by id.
 *
 * Will throw an error if there is a process id conflict.
 *
 * If a containing actor is passed as second parameter
 * the uniqueness of the node is garanteed.
 *
 */
ProcessManager.prototype.getById = function(id, actor) {
  return this.findBy('id', id, actor);
};

ProcessManager.prototype.findBy = function(prop, value, actor) {
  var found;
  var process;
  var node;
  for (process in this.processes) {
    if (this.processes.hasOwnProperty(process)) {
      node = this.processes[process];
      if (node[prop] === value &&
        (!actor || actor.hasNode(node.id))) {
        if (found) {
          console.log(this.processes);
          throw Error(
            'conflict: multiple ' + prop + 's matching ' + value
          );
        }
        found = node;
      }
    }
  }
  return found;
};

ProcessManager.prototype.filterByStatus = function(status) {
  return this.filterBy('status', status);
};

ProcessManager.prototype.filterBy = function(prop, value) {

  var id;
  var filtered = [];

  for (id in this.processes) {
    if (this.processes.hasOwnProperty(id)) {
      if (this.processes[id][prop] === value) {
        filtered.push(this.processes[id]);
      }
    }
  }

  return filtered;

};

module.exports = ProcessManager;

}).call(this,require("DbRmao"))
},{"DbRmao":5,"events":2,"util":7,"uuid":114}],29:[function(require,module,exports){
'use strict';

var util = require('util');
var debug = require('debug')('chix:queue');

function Queue() {
  this.lock = false;
  this.queue = [];
  this.pounders = 0;
}

/**
 *
 * Default Queue Manager
 *
 * @constructor
 * @public
 *
 */
function QueueManager(dataHandler) {

  this.queues = {};
  this._shutdown = false;

  this.locks = {}; /* node locks */

  this.pounders = 0; /* cumulative count */

  Object.defineProperty(this, 'inQueue', {
    enumerable: true,
    get: function() {
      // snapshot of queueLength
      var id;
      var inQ = 0;
      for (id in this.queues) {
        if (this.queues.hasOwnProperty(id)) {
          inQ += this.queues[id].queue.length;
        }
      }
      return inQ;
    }
  });

  this.onData(dataHandler);
}

QueueManager.prototype.onData = function(handler) {
  this.sendData = handler;
};

QueueManager.prototype.pounder = function() {

  var self = this.self;
  if (!self.queues.hasOwnProperty(this.id)) {
    throw Error('Unclean shutdown: Pounding on non-exist substance');
  }

  var queue = self.queues[this.id];
  queue.pounders--;
  self.pounders--;

  var inQueue = queue.queue.length;
  if (inQueue === 0) {
    throw Error('nothing in queue this should not happen!');
  }

  var p = self.pick(this.id);

  if (self._shutdown) {

    self.drop('queued', this.id, p);

  }
  else if (self.isLocked(this.id)) {
    self.unshift(this.id, p);

  }
  else {
    debug('%s:%s.%s send data', this.id, p.nr, p.c);
    self.sendData(this.id, p);
  }

};

QueueManager.prototype.getQueue = function(id) {

  if (this.queues.hasOwnProperty(id)) {
    return this.queues[id];
  }

  throw Error(util.format('queue id: `%s` is unmanaged', id));

};

QueueManager.prototype.pound = function(id) {

  if (!id) {
    throw Error('no id!');
  }

  this.getQueue(id).pounders++;
  this.pounders++;

  setTimeout(
    this.pounder.bind({
      id: id,
      self: this
    }), 0
  );

};

QueueManager.prototype.get = function(id) {
  return this.getQueue(id).queue;
};

/**
 *
 * Queue data for the link given
 *
 * @param {string} id
 * @param {Packet} p
 * @public
 */
QueueManager.prototype.queue = function(id, p) {

  if (p.constructor.name !== 'Packet') {
    throw Error('not an instance of Packet');
  }

  if (this._shutdown) {
    this.drop('queue', id, p);
  }
  else {

    this.init(id);
    this.getQueue(id).queue.push(p);

    // as many pounds as there are items within queue.
    // the callback is just picking the last item not per se
    // the item we have just put within queue.
    this.pound(id);

  }

};

QueueManager.prototype.init = function(id) {
  if (!this.queues.hasOwnProperty(id)) {
    this.queues[id] = new Queue();
  }
};

QueueManager.prototype.unshift = function(id, p) {

  var queue = this.getQueue(id);
  queue.queue.unshift(p);

};

/**
 *
 * Pick an item from the queue.
 *
 * @param {id} id
 * @public
 */
QueueManager.prototype.pick = function(id) {
  if (this.hasQueue(id)) {
    return this.queues[id].queue.shift();
  }
};

/**
 *
 * Determine whether there is a queue for this link.
 *
 * @param {string} id
 * @public
 */
QueueManager.prototype.hasQueue = function(id) {
  return this.queues[id] && this.queues[id].queue.length > 0;
};

QueueManager.prototype.isManaged = function(id) {
  return this.queues.hasOwnProperty(id);
};

QueueManager.prototype.size = function(id) {
  return this.getQueue(id).queue.length;
};

/**
 *
 * Reset this queue manager
 *
 * @public
 */
QueueManager.prototype.reset = function(cb) {

  var self = this;
  var retries;
  var countdown;

  this._shutdown = true;

  // all unlocked
  this.unlockAll();

  countdown = retries = 10; // 1000;

  var func = function ShutdownQueManager() {

    if (countdown === 0) {
      debug('Failed to stop queue after %s cycles', retries);
    }

    if (self.inQueue === 0 || countdown === 0) {

      self.queues = {};

      self._shutdown = false;

      if (cb) {
        cb();
      }

    }
    else {

      countdown--;
      setTimeout(func, 0);

    }

  };

  // put ourselves at the back of all unlocks.
  setTimeout(func, 0);

};

QueueManager.prototype.isLocked = function(id) {
  // means whether it has queue length..
  if (!this.isManaged(id)) {
    return false;
  }
  var q = this.getQueue(id);
  return q.lock;
};

QueueManager.prototype.lock = function(id) {
  debug('%s: lock', id);
  this.init(id);
  var q = this.getQueue(id);
  q.lock = true;

};

QueueManager.prototype.flushAll = function() {
  debug('flush all');
  var id;
  for (id in this.queues) {
    if (this.queues.hasOwnProperty(id)) {
      this.flush(id);
    }
  }
};

QueueManager.prototype.purgeAll = function() {
  debug('purge all');
  var id;
  for (id in this.queues) {
    if (this.queues.hasOwnProperty(id)) {
      this.purge(this.queues[id]);
    }
  }
};

QueueManager.prototype.purge = function(q) {
  debug('%s: purge', q.id);
  while (q.queue.length) {
    this.drop('purge', q.queue.pop());
  }
};

QueueManager.prototype.unlockAll = function() {
  debug('unlock all');
  var id;
  for (id in this.queues) {
    if (this.queues.hasOwnProperty(id)) {
      this.unlock(id);
    }
  }
};

QueueManager.prototype.unlock = function(id) {
  debug('%s: unlock', id);
  if (this.isLocked(id)) {
    this.flush(id);
  }
};

QueueManager.prototype.flush = function(id) {

  debug('%s: flush', id);
  var i;
  var q = this.getQueue(id);

  // first determine current length
  var currentLength = (q.queue.length - q.pounders);

  q.lock = false;

  for (i = 0; i < currentLength; i++) {
    this.pound(id);
  }
};

// not sure, maybe make only the ioHandler responsible for this?
QueueManager.prototype.drop = function(type) {
  debug('dropping packet: %s %s', type, this.inQueue);
};

/**
 *
 * Used to get all queues which have queues.
 * Maybe I should just remove queues.
 * But queues reappear so quickly it's not
 * worth removing it.
 *
 * Something to fix later, in that case this.queues
 * would always be queues which have items.
 *
 * Anyway for debugging it's also much easier
 * because there will not be a zillion empty queues.
 *
 * Usage:
 *
 * if (qm.inQueue()) {
 *   var queued = qm.getQueued();
 * }
 *
 */
QueueManager.prototype.getQueues = function() {

  var id;
  var queued = {};
  for (id in this.queues) {
    if (this.queues.hasOwnProperty(id)) {
      if (this.queues[id].queue.length > 0) {
        queued[id] = this.queues[id];
      }
    }
  }
  return queued;
};

module.exports = QueueManager;

},{"debug":42,"util":7}],30:[function(require,module,exports){
'use strict';

var DefaultContextProvider = require('./context/defaultProvider');

/**
 *
 * We will run inside an instance.
 *
 * At the moment the run context is purely the callback.
 * TODO: which fails hard
 *
 */
function Run(actor, callback) {

  var iId;

  this.actor = actor;

  // Used with callback handling
  // Keeps track of the number of exposed output ports
  this.outputPorts = [];

  // data we will give to the callback
  this.output = {};
  this.outputCount = 0;

  this.callback = callback;

  if (!actor.contextProvider) {
    actor.contextProvider = new DefaultContextProvider();
  }

  for (iId in actor.nodes) {
    if (actor.nodes.hasOwnProperty(iId)) {

      // Als deze node in onze view zit
      if (actor.view.indexOf(iId) >= 0) {

        if (
          this.callback &&
          actor.nodes[iId].ports &&
          actor.nodes[iId].ports.output
          ) {

          for (var key in actor.nodes[iId].ports.output) {
            // this is related to actions.
            // not sure If I want to keep that..
            // Anyway expose is gone, so this is never
            // called now.
            //
            // expose bestaat niet meer, de integrerende flow
            // krijgt gewoon de poorten nu.
            if (actor.nodes[iId].ports.output[key].expose) {
              this.outputPorts.push(key);
            }
          }

          actor.nodes[iId].on(
            'output',
            this.handleOutput.bind(this)
          );

        }
      }

    }

  }

  if (this.callback && !this.outputPorts.length) {

    throw new Error('No exposed output ports available for callback');

  }

  if (actor.trigger) {
    actor.sendIIP(actor.trigger, '');
  }

}

Run.prototype.handleOutput = function(data) {

  if (this.outputPorts.indexOf(data.port) >= 0) {

    if (!this.output.hasOwnProperty(data.node.id)) {
      this.output[data.node.id] = {};
    }

    this.output[data.node.id][data.port] = data.out;

    this.outputCount++;

    if (this.outputPorts.length === this.outputCount) {

      this.outputCount = 0; // reset

      this.callback.apply(this.actor, [this.output]);

      this.output = {};

    }

  }

};

module.exports = Run;

},{"./context/defaultProvider":16}],31:[function(require,module,exports){
(function (process,global){
'use strict';

var IOBox = require('iobox');
var util = require('util');
var path = require('path');

// taken from underscore.string.js
function _underscored(str) {
  // also underscore dot
  return str
    .replace(/([a-z\d])([A-Z]+)/g, '$1_$2')
    .replace(/[\.\-\s]+/g, '_')
    .toLowerCase();
}

/**
 *
 * NodeBox
 *
 * @constructor
 * @public
 *
 */
function NodeBox(name) {

  if (!(this instanceof NodeBox)) {
    return new NodeBox(name);
  }

  IOBox.apply(this, arguments);

  this.name = name || 'NodeBox';

  this.define();

}

util.inherits(NodeBox, IOBox);

NodeBox.prototype.define = function() {

  // Define the structure
  this.addArg('input', {});
  this.addArg('output', {});
  this.addArg('state', {});
  this.addArg('done', null);
  this.addArg('cb', null);
  //this.addArg('console', console);

  this.addArg('on', {
    input: {}
  }); // dynamic construction

  // what to return from the function
  this.addReturn('output');
  this.addReturn('state');
  this.addReturn('on');
};

/**
 *
 * Add requires to the sandbox.
 *
 * xNode should use check = true and then have
 * a try catch block.
 *
 * @param {Object} requires
 * @param {Boolean} check
 */
NodeBox.prototype.require = function(requires, check) {

  // Ok, the generic sandbox should do the same logic
  // for adding the requires but should not check if
  // they are available.
  var key;
  var ukey;

  // 'myrequire': '<version'
  for (key in requires) {

    if (requires.hasOwnProperty(key)) {

      // only take last part e.g. chix-flow/SomeThing-> some_thing
      ukey = _underscored(key.split('/').pop());

      this.emit('require', {
        require: key
      });

      if (check !== false) {

        if (typeof requires[key] !== 'string') {

          // assume it's already required.
          // the npm installed versions use this.
          // e.g. nodule-template
          this.addArg(ukey, requires[key]);

        }
        else {

          try {

            this.addArg(ukey, require(key));

          }
          catch (e) {

            // last resort, used by cli
            var p = path.resolve(
              process.cwd(),
              'node_modules',
              key
            );

            this.addArg(ukey, require(p));
          }

        }

      }
      else {

        // just register it, used for generate
        this.addArg(ukey, undefined);

      }
    }
  }
};

NodeBox.prototype.expose = function(expose, CHI) {

  var i;
  // created to allow window to be exposed to a node.
  // only meant to be used for dom nodes.
  var g = typeof window === 'undefined' ? global : window;

  if (expose) {

    for (i = 0; i < expose.length; i++) {

      this.emit('expose', {
        expose: expose[i]
      });

      if (expose[i] === 'window') {
        this.addArg('win', window);
      }
      else if (expose[i] === 'chi') {
        this.addArg('chi', CHI);
      }
      else if (expose[i] === 'self') {
        this.addArg('self', this);
      }
      else {
        // Do not re-expose anything already going in
        if (!this.args.hasOwnProperty(expose[i])) {
          this.addArg(expose[i], g[expose[i]]);
        }
      }
    }

  }
};

NodeBox.prototype.compile = function(fn) {

  return IOBox.prototype.compile.call(
    this, fn, true // return as object
  );

};

/**
 *
 * Runs the sandbox.
 *
 */
NodeBox.prototype.run = function(bind) {

  var k;
  var res = IOBox.prototype.run.apply(this, [bind]);
  var ret;

  // puts the result back into our args/state
  // TODO: I do not think this is needed?

  for (k in res) {
    if (k === 'return') {
      ret = res['return'];
    }
    else if (res.hasOwnProperty(k)) {
      this.set(k, res[k]);
    }
  }
  return ret; // original return value
};

module.exports = NodeBox;

}).call(this,require("DbRmao"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"DbRmao":5,"iobox":90,"path":4,"util":7}],32:[function(require,module,exports){
'use strict';

var NodeBox = require('./node');
var util = require('util');

/**
 *
 * PortBox
 *
 * @constructor
 * @public
 *
 */
function PortBox(name) {

  if (!(this instanceof PortBox)) {
    return new PortBox(name);
  }

  NodeBox.apply(this, arguments);

  this.name = name || 'PortBox';

}

util.inherits(PortBox, NodeBox);

PortBox.prototype.define = function() {
  // Define the structure
  this.addArg('data', null);
  this.addArg('x', {}); // not sure, _is_ used but set later
  this.addArg('source', null); // not sure..
  this.addArg('state', {});
  this.addArg('input', {});
  this.addArg('output', null); // output function should be set manually

  // what to return from the function.
  this.addReturn('state');
};

module.exports = PortBox;

},{"./node":31,"util":7}],33:[function(require,module,exports){
'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 *
 * Setting
 *
 * Both used by Connector and xLink
 *
 * @constructor
 * @public
 *
 */
function Setting(settings) {

  for (var key in settings) {
    if (settings.hasOwnProperty(key)) {
      this.set(key, settings[key]);
    }
  }
}

util.inherits(Setting, EventEmitter);

/**
 *
 * Set
 *
 * Sets a setting
 *
 * @param {String} name
 * @param {Any} val
 */
Setting.prototype.set = function(name, val) {
  if (undefined !== val) {
    if (!this.setting) {
      this.setting = {};
    }
    this.setting[name] = val;

    this.emit('change', this, 'setting', this.setting);
  }
};

/**
 *
 * Get
 *
 * Returns the setting or undefined.
 *
 * @returns {Any}
 */
Setting.prototype.get = function(name) {
  return this.setting ? this.setting[name] : undefined;
};

/**
 *
 * Delete a setting
 *
 * @returns {Any}
 */
Setting.prototype.del = function(name) {
  if (this.setting && this.setting.hasOwnProperty(name)) {
    delete this.setting[name];
  }
};

/**
 *
 * Check whether a setting is set.
 *
 * @returns {Any}
 */
Setting.prototype.has = function(name) {
  return this.setting && this.setting.hasOwnProperty(name);
};

module.exports = Setting;

},{"events":2,"util":7}],34:[function(require,module,exports){
'use strict';

var jsongate = require('json-gate');
var mSjson = require('../schemas/map.json');
var nDjson = require('../schemas/node.json');
var ljson = require('../schemas/link.json');
var mapSchema = jsongate.createSchema(mSjson);
var nodeSchema = jsongate.createSchema(nDjson);
var linkSchema = jsongate.createSchema(ljson);
var isPlainObject = require('is-plain-object');
var instanceOf = require('instance-of');

function ValidationError(message, id, obj) {
  this.message = message;
  this.id = id;
  this.obj = obj;
  this.name = 'ValidationError';
}

/**
 *
 * Check if we are not adding a (rotten) flow. Where there are id's which
 * overlap other ids in other flows.
 *
 * This shouldn't happen but just perform this check always.
 *
 */
function _checkIds(flow, nodeDefinitions) {

  var i;
  var knownIds = [];
  var nodes = {};
  var node;
  var link;
  var source;
  var target;

  if (flow.nodes.length > 0 && !nodeDefinitions) {
    throw new Error('Cannot validate without nodeDefinitions');
  }

  // we will not add the flow, we will show a warning and stop adding the
  // flow.
  for (i = 0; i < flow.nodes.length; i++) {

    node = flow.nodes[i];

    // nodeDefinition should be loaded
    if (!node.ns) {
      throw new ValidationError(
          'NodeDefinition without namespace: ' + node.name
          );
    }
    if (!nodeDefinitions[node.ns]) {
      throw new ValidationError(
          'Cannot find nodeDefinition namespace: ' + node.ns
          );
    }
    if (!nodeDefinitions[node.ns][node.name]) {
      throw new ValidationError(
          'Cannot find nodeDefinition name ' + node.ns + ' ' + node.name
          );
    }

    knownIds.push(node.id);
    nodes[node.id] = node;

    //_checkPortDefinitions(nodeDefinitions[node.ns][node.name]);
  }

  for (i = 0; i < flow.links.length; i++) {

    link = flow.links[i];

    // links should not point to non-existing nodes.
    if (knownIds.indexOf(link.source.id) === -1) {
      throw new ValidationError(
        'Source node does not exist ' + link.source.id
      );
    }
    if (knownIds.indexOf(link.target.id) === -1) {
      throw new ValidationError(
        'Target node does not exist ' + link.target.id
      );
    }

    // check if what is specified as port.out is an input port on the target
    source = nodes[link.source.id];
    target = nodes[link.target.id];

    // allow :start
    if (link.source.port[0] !== ':' &&
        !nodeDefinitions[source.ns][source.name]
        .ports.output[link.source.port]) {
      throw new ValidationError([
          'Process',
          link.source.id,
          'has no output port named',
          link.source.port,
          '\n\n\tOutput ports available:',
          '\n\n\t',
          Object.keys(
            nodeDefinitions[source.ns][source.name].ports.output
            ).join(', ')
          ].join(' '));
    }

    if (link.target.port[0] !== ':' &&
        !nodeDefinitions[target.ns][target.name]
        .ports.input[link.target.port]) {
      throw new ValidationError([
          'Process',
          link.target.id,
          'has no input port named',
          link.target.port,
          '\n\n\tInput ports available:',
          '\n\n\t',
          Object.keys(
            nodeDefinitions[target.ns][target.name].ports.input
            ).join(', ')
          ].join(' '));
    }

  }

  return true;

}

/**
 *
 * Validates a nodeDefinition
 *
 */
function validateNodeDefinition(nodeDef) {

  nodeSchema.validate(nodeDef);

  // _checkIds(flow, nodeDefinitions);

  // make sure the id's are correct

}

function validateLink(ln) {
  linkSchema.validate(ln);
}

/**
 *
 * Validates the flow
 *
 */
function validateFlow(flow) {

  mapSchema.validate(flow);

  // _checkIds(flow, nodeDefinitions);

  // make sure the id's are correct

}

function validateData(type, data) {

  switch (type) {

    case 'string':
      return typeof data === 'string';

    case 'array':
      return Object.prototype.toString.call(data) === '[object Array]';

    case 'integer':
    case 'number':
      return Object.prototype.toString.call(data) === '[object Number]';

    case 'null':
      type = type.charAt(0).toUpperCase() + type.slice(1);
      return Object.prototype.toString.call(data) === '[object ' + type + ']';

    case 'boolean':
    case 'bool':
      return data === true || data === false || data === 0 || data === 1;

    case 'any':
      return true;
    case 'object':
      if (isPlainObject(data)) {
        return true;
      }
      // TODO: not sure if I meant to return all objects as valid objects.
      return instanceOf(data, type);
    case 'function':
      return true;

    default:
      return instanceOf(data, type);
  }

}

module.exports = {
  data: validateData,
  flow: validateFlow,
  link: validateLink,
  nodeDefinition: validateNodeDefinition,
  nodeDefinitions: _checkIds
};

},{"../schemas/link.json":37,"../schemas/map.json":38,"../schemas/node.json":39,"instance-of":89,"is-plain-object":91,"json-gate":94}],"chix-flow":[function(require,module,exports){
module.exports=require('jXAsbI');
},{}],"jXAsbI":[function(require,module,exports){
'use strict';

var xNode = require('./lib/node');
var xFlow = require('./lib/flow');
var xLink = require('./lib/link');
var Actor = require('./lib/actor');
var mapSchema = require('./schemas/map.json');
var nodeSchema = require('./schemas/node.json');
var stageSchema = require('./schemas/stage.json');
var Validate = require('./lib/validate');

module.exports = {
  Node: xNode,
  Flow: xFlow,
  Link: xLink,
  Actor: Actor,
  Validate: Validate,
  Schema: {
    Map: mapSchema,
    Node: nodeSchema,
    Stage: stageSchema
  }
};

},{"./lib/actor":14,"./lib/flow":17,"./lib/link":20,"./lib/node":22,"./lib/validate":34,"./schemas/map.json":38,"./schemas/node.json":39,"./schemas/stage.json":40}],37:[function(require,module,exports){
module.exports={
  "type": "object",
  "title": "Chiχ Link",
  "properties": {
    "id": {
      "type": "string",
      "required": false
    },
    "source": {
      "type": "object",
      "required": true,
      "properties": {
        "id": {
          "type": "string",
          "required": true
        },
        "port": {
          "type": "string",
          "required": true
        },
        "index": {
          "type": ["string", "number"],
          "required": false
        },
        "settings": {
          "type": "object"
        }
      }
    },
    "target": {
      "type": "object",
      "required": true,
      "properties": {
        "id": {
          "type": "string",
          "required": true
        },
        "port": {
          "type": "string",
          "required": true
        },
        "index": {
          "type": ["string", "number"],
          "required": false
        },
        "settings": {
          "type": "object",
          "properties": {
            "persist": {
              "type": "boolean"
            },
            "sync": {
              "type": "string"
            },
            "cyclic": {
              "type": "boolean"
            }
          }
        }
      }
    },
    "settings": {
      "type": "object",
      "properties": {
        "dispose": {
          "type": "boolean"
        }
      }
    },
    "metadata": {
      "type": "object"
    }
  },
  "additionalProperties": false
}

},{}],38:[function(require,module,exports){
module.exports={
  "type":"object",
  "title":"Chiχ Map",
  "collectionName": "flows",
  "properties":{
    "id": {
      "type":"string",
      "required": false
    },
    "type": {
      "type":"string",
      "required": true
    },
    "env": {
      "type":"string",
      "required": false
    },
    "ns": {
      "type":"string",
      "required": false
    },
    "name": {
      "type":"string",
      "required": false
    },
    "title": {
      "type":"string",
      "required": false
    },
    "description": {
      "type":"string"
    },
    "provider": {
      "type":"string"
    },
    "providers": {
      "type":"object"
    },
    "keywords": {
      "type":"array"
    },
    "nodeDefinitions": {
      "type": "object"
    },
    "ports": {
      "type":"object",
      "properties": {
        "input": {
          "type":"object"
        },
        "output": {
          "type":"object"
        }
      }
    },
    "nodes": {
      "type":"array",
      "title":"Nodes",
      "required": true,
      "items": {
        "type": "object",
        "title": "Node",
        "properties":{
          "id": {
            "type":"string",
            "required": true
          },
          "ns": {
            "type":"string",
            "required": true
          },
          "name": {
            "type":"string",
            "required": true
          },
          "version": {
            "type":"string",
            "required": false
          },
          "context": {
            "type":"object",
            "required": false
          }
        }
      }
    },
    "links": {
      "type":"array",
      "title":"Links",
      "required": false,
      "items": {
        "type": "object",
        "title": "Link",
        "properties":{
          "id": {
            "type":"string",
            "required": false
          },
          "source": {
            "type":"object",
            "required": true,
             "properties":{
               "id": {
                 "type": "string",
                 "required": true
               },
               "port": {
                 "type": "string",
                 "required": true
               },
               "index": {
                 "type": ["string","number"],
                 "required": false
               }
             }
          },
          "target": {
            "type":"object",
            "required": true,
             "properties":{
               "id": {
                 "type": "string",
                 "required": true
               },
               "port": {
                 "type": "string",
                 "required": true
               },
               "index": {
                 "type": ["string","number"],
                 "required": false
               }
             }
          },
          "settings": {
            "persist": {
              "type":"boolean",
              "required": false
            },
            "cyclic": {
              "type":"boolean",
              "required": false
            }
          }
        }
      }
    }
  },
  "additionalProperties": false
}

},{}],39:[function(require,module,exports){
module.exports={
  "type":"object",
  "title":"Chiχ Nodes",
  "properties":{
    "title": {
      "type":"string",
      "required": false
    },
    "description": {
      "type":"string",
      "required": false
    },
    "_id": {
      "type":"string"
    },
    "name": {
      "type":"string",
      "required": true
    },
    "ns": {
      "type":"string",
      "required": true
    },
    "state": {
      "type":"any"
    },
    "phrases": {
      "type":"object"
    },
    "env": {
      "type":"string",
      "enum": ["server","browser","polymer","phonegap"]
    },
    "async": {
      "type":"boolean",
      "required": false
    },
    "dependencies": {
      "type":"object",
      "required": false
    },
    "provider": {
      "required": false,
      "type":"string"
    },
    "providers": {
      "required": false,
      "type":"object"
    },
    "expose": {
      "type":"array",
      "required": false
    },
    "fn": {
      "type":"string",
      "required": false
    },
    "ports": {
      "type":"object",
      "required": true,
      "properties":{
        "input": {
          "type":"object"
        },
        "output": {
          "type":"object"
        },
        "event": {
          "type":"object"
        }
      }
    },
    "type": {
      "enum":["node","flow","provider","data","polymer"],
      "required": false
    }
  },
  "additionalProperties": false
}

},{}],40:[function(require,module,exports){
module.exports={
  "type":"object",
  "title":"Chiχ Stage",
  "properties":{
    "id": {
      "type":"string",
      "required": false
    },
    "env": {
      "type":"string",
      "required": false
    },
    "title": {
      "type":"string",
      "required": true
    },
    "description": {
      "type":"string",
      "required": true
    },
    "actors": {
      "type":"array",
      "title":"Actors",
      "required": true,
      "items": {
        "type": "object",
        "title": "Actor",
        "properties":{
          "id": {
            "type":"string",
            "required": true
          },
          "ns": {
            "type":"string",
            "required": true
          },
          "name": {
            "type":"string",
            "required": true
          },
          "version": {
            "type":"string",
            "required": false
          },
          "context": {
            "type":"object",
            "required": false
          }
        }
      }
    },
    "links": {
      "type":"array",
      "title":"Links",
      "required": true,
      "items": {
        "type": "object",
        "title": "Link",
        "properties":{
          "id": {
            "type":"string",
            "required": false
          },
          "source": {
            "type":"string",
            "required": true
          },
          "target": {
            "type":"string",
            "required": true
          },
          "out": {
            "type":"string",
            "required": false
          },
          "in": {
            "type":"string",
            "required": false
          },
          "settings": {
            "persist": {
              "type":"boolean",
              "required": false
            },
            "cyclic": {
              "type":"boolean",
              "required": false
            }
          }
        }
      }
    }
  }
}

},{}],41:[function(require,module,exports){
'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

/**
 *
 * Loader
 *
 * This is the base loader class
 * Ít can be used to implement a definition loader
 * for Chix
 *
 * @api public
 * @author Rob Halff <rob.halff@gmail.com>
 * @constructor
 */
function Loader() {

  this.dependencies = {};

  /**
   *
   * Format:
   *
   * Keeps track of all known nodeDefinitions.
   *
   * {
   *  'http://....': { // url in this case is the identifier
   *
   *    fs: {
   *       readFile:  <definition>
   *       writeFile: <definition>
   *    }
   *
   *  }
   *
   * }
   *
   */
  this.nodeDefinitions = {};

}

util.inherits(Loader, EventEmitter);

/**
 *
 * This is the main method all child classes should implement.
 *
 * @param {Object} graphs
 * @param {Function} callback
 * @api public
 */
Loader.prototype.load = function(graphs, callback /*, update dependencies*/) {

  return callback(
    new Error([
      this.constructor.name,
      'must implement a load method'
    ].join(' ')
    )
  );

};

/**
 *
 * Add node definitions
 *
 * Used to `statically` add nodeDefinitions.
 *
 * @param {String} identifier
 * @param {Object} nodeDefs
 * @api public
 */
Loader.prototype.addNodeDefinitions = function(identifier, nodeDefs) {

  var ns;
  var name;
  var i;

  if (Array.isArray(nodeDefs)) {

    for (i = 0; i < nodeDefs.length; i++) {
      this.addNodeDefinition(identifier, nodeDefs[i]);
    }

  } else {

    for (ns in nodeDefs) {
      if (nodeDefs.hasOwnProperty(ns)) {
        for (name in nodeDefs[ns]) {
          if (nodeDefs[ns].hasOwnProperty(name)) {
            this.addNodeDefinition(identifier, nodeDefs[ns][name]);
          }
        }
      }
    }

  }
};

/**
 *
 * Add a node definition
 *
 * @param {String} identifier
 * @param {Object} nodeDef
 * @api public
 */
Loader.prototype.addNodeDefinition = function(identifier, nodeDef) {

  if (!nodeDef.hasOwnProperty('ns')) {
    throw new Error([
      'Nodefinition for',
      identifier,
      'lacks an ns property'
    ].join(' '));
  }

  if (!nodeDef.hasOwnProperty('name')) {
    throw new Error([
      'Nodefinition for',
      identifier,
      'lacks an name property'
    ].join(' '));
  }

  // store the provider url along with the nodeDefinition
  // Needed for fetching back from storage.
  nodeDef.provider = identifier;

  if (nodeDef.type !== 'flow') {

    // Do normal nodeDefinition stuff
    this.dependencies = this._parseDependencies(this.dependencies, nodeDef);

  } else {
    // also setting default provider here?
    // check this later, if addNodeDefinition(s) is used
    // there will otherwise be no default provider.
    // where is default provider, in chix-loader-remote.. err..
    // I think addNodefinition(s) should set it maybe
    // It's also a bit weird, because if you only add them manually
    // there ain't really an url or path.
    if (!nodeDef.providers || Object.keys(nodeDef.providers).length === 0) {
      nodeDef.providers = {
        '@': {
          url: identifier
        }
      };
    }
  }

  if (!this.nodeDefinitions.hasOwnProperty(identifier)) {
    this.nodeDefinitions[identifier] = {};
  }

  if (!this.nodeDefinitions[identifier].hasOwnProperty(nodeDef.ns)) {
    this.nodeDefinitions[identifier][nodeDef.ns] = {};
  }

  if (!this.nodeDefinitions[identifier][nodeDef.ns]
    .hasOwnProperty([nodeDef.name])) {
    this.nodeDefinitions[identifier][nodeDef.ns][nodeDef.name] = nodeDef;
  }

};

Loader.prototype._parseDependencies = function(dependencies, nodeDef) {
  var r;
  var type;

  if (nodeDef.require) {
    throw Error(
      nodeDef.ns + '/' + nodeDef.name +
      ': nodeDef.require is DEPRECATED, use nodeDef.dependencies'
    );
  }

  if (nodeDef.dependencies) {
    for (type in nodeDef.dependencies) {
      if (nodeDef.dependencies.hasOwnProperty(type)) {

        for (r in nodeDef.dependencies[type]) {

          if (nodeDef.dependencies[type].hasOwnProperty(r)) {

            if (type === 'npm') {
              if (nodeDef.dependencies.npm[r] !== 'builtin') {
                // translate to require string, bower should do the same
                //
                // I think this should be delayed, to when the actual
                // require takes place.
                /*
                requireString = r + '@' + nodeDef.dependencies.npm[r];
                if (requires.indexOf(requireString) === -1) {
                  requires.push(requireString);
                }
                */
                if (!dependencies.hasOwnProperty('npm')) {
                  dependencies.npm = {};
                }

                // TODO: check for duplicates and pick the latest one.
                dependencies.npm[r] = nodeDef.dependencies.npm[r];

              }
            } else if (type === 'bower') {

              if (!dependencies.hasOwnProperty('bower')) {
                dependencies.bower = {};
              }

              // TODO: check for duplicates and pick the latest one.
              dependencies.bower[r] = nodeDef.dependencies.bower[r];

            } else {

              throw Error('Unkown package manager:' + type);

            }

          }

        }

      }
    }
  }
  return dependencies;
};

Loader.prototype.saveNodeDefinition = function() {

  throw new Error([
    this.constructor.name,
    'must implement a save method'
  ].join(' '));

};

/**
 *
 * Ok now it becomes intresting.
 *
 * We will read the definition and are going to detect whether this
 * definition is about a flow, if it is about a flow.
 * We are also going to load those definitions, unless we already
 * have that definition ofcourse.
 *
 * This way we only have to provide the actor with ourselves.
 * The loader. The loader will then already know about all the
 * node definitions it needs. This keeps the actor simpler.
 * All it has to do is .getNodeDefinition() wherever in
 * the hierarchy it is.
 *
 */

/**
 *
 * Check whether we have the definition
 *
 * @param {String} providerUrl
 * @param {String} ns
 * @param {String} name
 * @api public
 */
Loader.prototype.hasNodeDefinition = function(providerUrl, ns, name) {
  return this.nodeDefinitions.hasOwnProperty(providerUrl) &&
    this.nodeDefinitions[providerUrl].hasOwnProperty(ns) &&
    this.nodeDefinitions[providerUrl][ns].hasOwnProperty(name);

};

/**
 *
 * Easier method to just get an already loaded definition
 * TODO: Unrafel getNodeDefinition and make it simpler
 *
 * Anyway, this is the way, we do not want to keep a store of id's
 * in the loader also, so getById can go also.
 */
Loader.prototype.getNodeDefinitionFrom = function(provider, ns, name) {

  if (this.hasNodeDefinition(provider, ns, name)) {
    return this.nodeDefinitions[provider][ns][name];
  }

};

/**
 *
 * Loads the NodeDefinition for a node.
 *
 * In order to do so each node must know the provider url
 * it was loaded from.
 *
 * This is normally not stored directly into flows,
 * but the flow is saved with the namespaces in used.
 *
 * TODO: this really should just be (provider, name, ns, version)
 * Else use the load method.
 *
 * ah this is the exact same as loadDefnition only without callback.
 *
 */
Loader.prototype.getNodeDefinition = function(node, map) {

  var def = this.loadNodeDefinition(node, map);

  // merge the schema of the internal node.
  if (node.type === 'flow') {
    this._mergeSchema(def); // in place
  }

  return def;

};

// this is still the map so nodes are an array
// saves us from having to maintain a nodes list.
// making this mergeSchema more self-reliant
Loader.prototype.findNodeWithinGraph = function(nodeId, graph) {

  for (var i = 0; i < graph.nodes.length; i++) {
    if (nodeId === graph.nodes[i].id) {
      // ok that's the node, but still it needs to be resolved
      // we need to get it's definition
      return graph.nodes[i];
    }
  }

  throw Error('Could not find internal node within graph');

};

Loader.prototype._mergeSchema = function(graph) {
  for (var type in graph.ports) {
    if (graph.ports.hasOwnProperty(type)) {
      for (var port in graph.ports[type]) {
        if (graph.ports[type].hasOwnProperty(port)) {
          var externalPort = graph.ports[type][port];
          if (externalPort.hasOwnProperty('nodeId')) {
            var internalDef = this.getNodeDefinition(
              this.findNodeWithinGraph(externalPort.nodeId, graph),
              graph
            );
            var copy    = JSON.parse(
              JSON.stringify(internalDef.ports[type][externalPort.name])
            );
            copy.title  = externalPort.title;
            copy.name   = externalPort.name;
            copy.nodeId = externalPort.nodeId;
            graph.ports[type][port] = copy;
          } else {
            // not pointing to an internal node. :start etc.
          }
        }
      }
    }
  }
};

/***
 *
 * Recursivly returns the requires.
 *
 * Assumes the map, node is already loaded.
 *
 * Note: Will break if node.provider is an url already.
 *
 * @private
 */
Loader.prototype._collectDependencies = function(dependencies, def) {

  var self = this;
  def.nodes.forEach(function(node) {
    var provider;

    // Just makes this a simple function, used in several locations.
    if (/:\/\//.test(node.provider)) {
      provider = node.provider;
    } else {
      var da = node.provider ? node.provider : '@';
      provider = def.providers[da].url || def.providers[da].path;
    }

    var nDef = self.nodeDefinitions[provider][node.ns][node.name];
    if (node.type === 'flow') {
      dependencies = self._collectDependencies(dependencies, nDef);
    } else {
      dependencies = self._parseDependencies(dependencies, nDef);
    }
  });

  return dependencies;

};

/**
 *
 * Get the dependencies for a certain provider.
 *
 * @param {Object} def
 * @private
 */
Loader.prototype._loadDependencies = function(def) {

  var dependencies = {};

  if (def.type === 'flow') {
    dependencies = this._collectDependencies(dependencies, def);
    return dependencies;
  } else {
    dependencies = this._parseDependencies(dependencies, def);
    return dependencies;
  }

};

// Loader itself only expects preloaded nodes.
// There is no actual load going on.
// Remote loader does implement loading.
Loader.prototype.loadNode = function(providerDef, cb) {

  var provider = providerDef.providerLocation;
  var ns       = providerDef.ns;
  var name     = providerDef.name;
  if (this.nodeDefinitions[provider] &&
    this.nodeDefinitions[provider].hasOwnProperty(ns) &&
    this.nodeDefinitions[provider][ns].hasOwnProperty(name)) {

    cb(null, {
      nodeDef: this.nodeDefinitions[provider][ns][name]
    });

  } else {

    cb(
      Error(
        util.format('Could not load node %s/%s from %s', ns, name, provider)
      )
    );

  }

};

Loader.prototype.loadNodeDefinitionFrom =
  function(provider, ns, name, callback) {

  var self = this;

  // I want cumulative dependencies.
  // Instead of only knowing all dependencies known
  // or only the dependency from the current node.
  // self.load could send this within the callback
  // and then also remember the dependency from this single node.
  // for self.load it's the second argument of the callback.
  var dependencies = {};

  this.loadNode({
    ns: ns,
    name: name,
    url: provider.replace('{ns}', ns).replace('{name}', name),
    providerLocation: provider
  }, function(err, res) {

    if (err) {
      throw err;
    }

    var nodeDef = res.nodeDef;
    // res.providerLocation

    dependencies = self._parseDependencies(dependencies, nodeDef);

    // quick hacking
    if (!self.nodeDefinitions[provider]) {
      self.nodeDefinitions[provider] = {};
    }
    if (!self.nodeDefinitions[provider].hasOwnProperty(ns)) {
      self.nodeDefinitions[provider][ns] = {};
    }
    self.nodeDefinitions[provider][ns][name] = nodeDef;

    if (nodeDef.type === 'flow') {

      self.load(nodeDef, function(/*err, ret*/) {
        callback(
          self.nodeDefinitions[provider][ns][name],
          self._loadDependencies(
            self.nodeDefinitions[provider][ns][name]
          )
        );
      }, false, dependencies);

    } else {
      callback(
        self.nodeDefinitions[provider][ns][name],
        self._loadDependencies(
          self.nodeDefinitions[provider][ns][name]
        )
      );
    }

  });

};

// Ok this, seems weird, it is loading the map?
// I give it a node which has either a provider as short key
// or the full url, the map is needed to resolve that.
// but then I start loading the full map.
// which seems weird, to say the least.
Loader.prototype.loadNodeDefinition = function(node, map, callback) {

  var location;
  var provider;
  var self = this;

  if (node.provider && node.provider.indexOf('://') >= 0) {
    // it's already an url
    location = node.provider;

  } else if (!node.provider && (!map || !map.providers)) {
    // for direct additions (only @ is possible)
    location = '@';

  } else {

    if (!map) {

      throw Error(
        'loadNodeDefinition needs a map or a node with a full provider url'
      );

    }

    if (node.provider) {
      // 'x': ..
      provider = map.providers[node.provider];
    } else {
      provider = map.providers['@'];
    }

    // fix: find provider by path or url, has to do with provider
    // already resolved (sub.sub.graphs)
    if (!provider) {
      for (var key in map.providers) {
        if (map.providers[key].url === node.provider ||
          map.providers[key].path === node.provider) {
          provider = map.providers[key];
        }
      }
      if (!provider) {
        throw Error('unable to find provider');
      }
    }

    if (provider.hasOwnProperty('path')) {

      location = provider.path;

    } else if (provider.hasOwnProperty('url')) {

      location = provider.url;

    } else {
      throw new Error('Do not know how to handle provider');
    }

    // Remember the provider, this is important to call getDefinition
    // at a later stage, see actor.addMap and createNode.
    // createNode is called without a map.
    // not perfect this, so redo this later.
    // when empty maps are added, createNode should also be
    // able to figure out where it's definitions are.
    // this means the map should be preloaded.
    // This preload should be done with an URL not with @
    // The along with that getNodeDefinitionFrom(providerUrl)
    // should be used. providerUrl is the only way subgraphs
    // are indexed correctly '@' by itself is not unique enough
    // to serve as a provider key. it is for single graphs but
    // is not useable anything beyond that.
    // Also however when a graph is saved the expanded
    // urls should be translated back into short form (fix that)
    // by looking up the provider within providers and putting
    // the key back where now the expanded url is.
    node.provider = location;

  }

  if (!this.nodeDefinitions.hasOwnProperty(location) ||
    !this.nodeDefinitions[location].hasOwnProperty(node.ns) ||
    !this.nodeDefinitions[location][node.ns].hasOwnProperty(node.name)) {

    if (!callback) {
      return false;
    } else {
      // not sure.. node has a full url.
      // but it's not loaded, then we ask to load the full map.
      // which works if provider is x but not if it's already expanded.
      //
      this.load(map, function() {
        callback(self.nodeDefinitions[location][node.ns][node.name]);
      });
    }

  } else {

    if (callback) {
      callback(this.nodeDefinitions[location][node.ns][node.name]);
    } else {
      return this.nodeDefinitions[location][node.ns][node.name];
    }

  }

};

/**
 *
 * Get dependencies for the type given.
 *
 * type is either `npm` or `bower`
 *
 * If no type is given will return all dependencies.
 *
 * Note: this method changed in behavior, used to be
 *  what _loadDependencies is now. which used to be getRequires()...
 *
 * @param {string} type
 * @public
 */
Loader.prototype.getDependencies = function(type) {
  if (type) {
    if (this.dependencies.hasOwnProperty(type)) {
      return this.dependencies[type];
    } else {
      return {};
    }
  } else {
    return this.dependencies;
  }
};

/**
 *
 * Checks whether there are any dependencies.
 *
 * Type can be `npm` or `bower`
 *
 * If no type is given it will tell whether there are *any* dependencies
 *
 * @param {string} type
 * @public
 **/
Loader.prototype.hasDependencies = function(type) {

  if (type) {
    if (this.dependencies.hasOwnProperty(type)) {
      return Object.keys(this.dependencies[type]).length;
    }
  } else {
    for (type in this.dependencies) {
      if (this.dependencies.hasOwnProperty(type)) {
        if (this.hasDependencies(type)) {
          return true;
        }
      }
    }
  }
  return false;
};

/**
 *
 * Get Nodedefinitions
 *
 * Optionally with a provider url so it returns only the node definitions
 * at that provider.
 *
 * @param {String} provider (Optional)
 */
Loader.prototype.getNodeDefinitions = function(provider) {

  if (provider) {
    return this.nodeDefinitions[provider];
  } else {
    return this.nodeDefinitions;
  }

};

module.exports = Loader;

},{"events":2,"util":7}],42:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":43}],43:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":98}],"discore-closest":[function(require,module,exports){
module.exports=require('iekHuh');
},{}],"iekHuh":[function(require,module,exports){
var matches = require('matches-selector')

module.exports = function (element, selector, checkYoSelf, root) {
  element = checkYoSelf ? {parentNode: element} : element

  root = root || document

  // Make sure `element !== document` and `element != null`
  // otherwise we get an illegal invocation
  while ((element = element.parentNode) && element !== document) {
    if (matches(element, selector))
      return element
    // After `matches` on the edge case that
    // the selector matches the root
    // (when the root is not the document)
    if (element === root)
      return  
  }
}
},{"matches-selector":97}],46:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _handlebarsRuntime = require('./handlebars.runtime');

var _handlebarsRuntime2 = _interopRequireDefault(_handlebarsRuntime);

// Compiler imports

var _handlebarsCompilerAst = require('./handlebars/compiler/ast');

var _handlebarsCompilerAst2 = _interopRequireDefault(_handlebarsCompilerAst);

var _handlebarsCompilerBase = require('./handlebars/compiler/base');

var _handlebarsCompilerCompiler = require('./handlebars/compiler/compiler');

var _handlebarsCompilerJavascriptCompiler = require('./handlebars/compiler/javascript-compiler');

var _handlebarsCompilerJavascriptCompiler2 = _interopRequireDefault(_handlebarsCompilerJavascriptCompiler);

var _handlebarsCompilerVisitor = require('./handlebars/compiler/visitor');

var _handlebarsCompilerVisitor2 = _interopRequireDefault(_handlebarsCompilerVisitor);

var _handlebarsNoConflict = require('./handlebars/no-conflict');

var _handlebarsNoConflict2 = _interopRequireDefault(_handlebarsNoConflict);

var _create = _handlebarsRuntime2['default'].create;
function create() {
  var hb = _create();

  hb.compile = function (input, options) {
    return _handlebarsCompilerCompiler.compile(input, options, hb);
  };
  hb.precompile = function (input, options) {
    return _handlebarsCompilerCompiler.precompile(input, options, hb);
  };

  hb.AST = _handlebarsCompilerAst2['default'];
  hb.Compiler = _handlebarsCompilerCompiler.Compiler;
  hb.JavaScriptCompiler = _handlebarsCompilerJavascriptCompiler2['default'];
  hb.Parser = _handlebarsCompilerBase.parser;
  hb.parse = _handlebarsCompilerBase.parse;

  return hb;
}

var inst = create();
inst.create = create;

_handlebarsNoConflict2['default'](inst);

inst.Visitor = _handlebarsCompilerVisitor2['default'];

inst['default'] = inst;

exports['default'] = inst;
module.exports = exports['default'];


},{"./handlebars.runtime":47,"./handlebars/compiler/ast":49,"./handlebars/compiler/base":50,"./handlebars/compiler/compiler":52,"./handlebars/compiler/javascript-compiler":54,"./handlebars/compiler/visitor":57,"./handlebars/no-conflict":71}],47:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _handlebarsBase = require('./handlebars/base');

var base = _interopRequireWildcard(_handlebarsBase);

// Each of these augment the Handlebars object. No need to setup here.
// (This is done to easily share code between commonjs and browse envs)

var _handlebarsSafeString = require('./handlebars/safe-string');

var _handlebarsSafeString2 = _interopRequireDefault(_handlebarsSafeString);

var _handlebarsException = require('./handlebars/exception');

var _handlebarsException2 = _interopRequireDefault(_handlebarsException);

var _handlebarsUtils = require('./handlebars/utils');

var Utils = _interopRequireWildcard(_handlebarsUtils);

var _handlebarsRuntime = require('./handlebars/runtime');

var runtime = _interopRequireWildcard(_handlebarsRuntime);

var _handlebarsNoConflict = require('./handlebars/no-conflict');

var _handlebarsNoConflict2 = _interopRequireDefault(_handlebarsNoConflict);

// For compatibility and usage outside of module systems, make the Handlebars object a namespace
function create() {
  var hb = new base.HandlebarsEnvironment();

  Utils.extend(hb, base);
  hb.SafeString = _handlebarsSafeString2['default'];
  hb.Exception = _handlebarsException2['default'];
  hb.Utils = Utils;
  hb.escapeExpression = Utils.escapeExpression;

  hb.VM = runtime;
  hb.template = function (spec) {
    return runtime.template(spec, hb);
  };

  return hb;
}

var inst = create();
inst.create = create;

_handlebarsNoConflict2['default'](inst);

inst['default'] = inst;

exports['default'] = inst;
module.exports = exports['default'];


},{"./handlebars/base":48,"./handlebars/exception":61,"./handlebars/no-conflict":71,"./handlebars/runtime":72,"./handlebars/safe-string":73,"./handlebars/utils":74}],48:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.HandlebarsEnvironment = HandlebarsEnvironment;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('./utils');

var _exception = require('./exception');

var _exception2 = _interopRequireDefault(_exception);

var _helpers = require('./helpers');

var _decorators = require('./decorators');

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var VERSION = '4.0.5';
exports.VERSION = VERSION;
var COMPILER_REVISION = 7;

exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '== 1.x.x',
  5: '== 2.0.0-alpha.x',
  6: '>= 2.0.0-beta.1',
  7: '>= 4.0.0'
};

exports.REVISION_CHANGES = REVISION_CHANGES;
var objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials, decorators) {
  this.helpers = helpers || {};
  this.partials = partials || {};
  this.decorators = decorators || {};

  _helpers.registerDefaultHelpers(this);
  _decorators.registerDefaultDecorators(this);
}

HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: _logger2['default'],
  log: _logger2['default'].log,

  registerHelper: function registerHelper(name, fn) {
    if (_utils.toString.call(name) === objectType) {
      if (fn) {
        throw new _exception2['default']('Arg not supported with multiple helpers');
      }
      _utils.extend(this.helpers, name);
    } else {
      this.helpers[name] = fn;
    }
  },
  unregisterHelper: function unregisterHelper(name) {
    delete this.helpers[name];
  },

  registerPartial: function registerPartial(name, partial) {
    if (_utils.toString.call(name) === objectType) {
      _utils.extend(this.partials, name);
    } else {
      if (typeof partial === 'undefined') {
        throw new _exception2['default']('Attempting to register a partial called "' + name + '" as undefined');
      }
      this.partials[name] = partial;
    }
  },
  unregisterPartial: function unregisterPartial(name) {
    delete this.partials[name];
  },

  registerDecorator: function registerDecorator(name, fn) {
    if (_utils.toString.call(name) === objectType) {
      if (fn) {
        throw new _exception2['default']('Arg not supported with multiple decorators');
      }
      _utils.extend(this.decorators, name);
    } else {
      this.decorators[name] = fn;
    }
  },
  unregisterDecorator: function unregisterDecorator(name) {
    delete this.decorators[name];
  }
};

var log = _logger2['default'].log;

exports.log = log;
exports.createFrame = _utils.createFrame;
exports.logger = _logger2['default'];


},{"./decorators":59,"./exception":61,"./helpers":62,"./logger":70,"./utils":74}],49:[function(require,module,exports){
'use strict';

exports.__esModule = true;
var AST = {
  // Public API used to evaluate derived attributes regarding AST nodes
  helpers: {
    // a mustache is definitely a helper if:
    // * it is an eligible helper, and
    // * it has at least one parameter or hash segment
    helperExpression: function helperExpression(node) {
      return node.type === 'SubExpression' || (node.type === 'MustacheStatement' || node.type === 'BlockStatement') && !!(node.params && node.params.length || node.hash);
    },

    scopedId: function scopedId(path) {
      return (/^\.|this\b/.test(path.original)
      );
    },

    // an ID is simple if it only has one part, and that part is not
    // `..` or `this`.
    simpleId: function simpleId(path) {
      return path.parts.length === 1 && !AST.helpers.scopedId(path) && !path.depth;
    }
  }
};

// Must be exported as an object rather than the root of the module as the jison lexer
// must modify the object to operate properly.
exports['default'] = AST;
module.exports = exports['default'];


},{}],50:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.parse = parse;
// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _parser = require('./parser');

var _parser2 = _interopRequireDefault(_parser);

var _whitespaceControl = require('./whitespace-control');

var _whitespaceControl2 = _interopRequireDefault(_whitespaceControl);

var _helpers = require('./helpers');

var Helpers = _interopRequireWildcard(_helpers);

var _utils = require('../utils');

exports.parser = _parser2['default'];

var yy = {};
_utils.extend(yy, Helpers);

function parse(input, options) {
  // Just return if an already-compiled AST was passed in.
  if (input.type === 'Program') {
    return input;
  }

  _parser2['default'].yy = yy;

  // Altering the shared object here, but this is ok as parser is a sync operation
  yy.locInfo = function (locInfo) {
    return new yy.SourceLocation(options && options.srcName, locInfo);
  };

  var strip = new _whitespaceControl2['default'](options);
  return strip.accept(_parser2['default'].parse(input));
}


},{"../utils":74,"./helpers":53,"./parser":55,"./whitespace-control":58}],51:[function(require,module,exports){
/* global define */
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

var SourceNode = undefined;

try {
  /* istanbul ignore next */
  if (typeof define !== 'function' || !define.amd) {
    // We don't support this in AMD environments. For these environments, we asusme that
    // they are running on the browser and thus have no need for the source-map library.
    var SourceMap = require('source-map');
    SourceNode = SourceMap.SourceNode;
  }
} catch (err) {}
/* NOP */

/* istanbul ignore if: tested but not covered in istanbul due to dist build  */
if (!SourceNode) {
  SourceNode = function (line, column, srcFile, chunks) {
    this.src = '';
    if (chunks) {
      this.add(chunks);
    }
  };
  /* istanbul ignore next */
  SourceNode.prototype = {
    add: function add(chunks) {
      if (_utils.isArray(chunks)) {
        chunks = chunks.join('');
      }
      this.src += chunks;
    },
    prepend: function prepend(chunks) {
      if (_utils.isArray(chunks)) {
        chunks = chunks.join('');
      }
      this.src = chunks + this.src;
    },
    toStringWithSourceMap: function toStringWithSourceMap() {
      return { code: this.toString() };
    },
    toString: function toString() {
      return this.src;
    }
  };
}

function castChunk(chunk, codeGen, loc) {
  if (_utils.isArray(chunk)) {
    var ret = [];

    for (var i = 0, len = chunk.length; i < len; i++) {
      ret.push(codeGen.wrap(chunk[i], loc));
    }
    return ret;
  } else if (typeof chunk === 'boolean' || typeof chunk === 'number') {
    // Handle primitives that the SourceNode will throw up on
    return chunk + '';
  }
  return chunk;
}

function CodeGen(srcFile) {
  this.srcFile = srcFile;
  this.source = [];
}

CodeGen.prototype = {
  isEmpty: function isEmpty() {
    return !this.source.length;
  },
  prepend: function prepend(source, loc) {
    this.source.unshift(this.wrap(source, loc));
  },
  push: function push(source, loc) {
    this.source.push(this.wrap(source, loc));
  },

  merge: function merge() {
    var source = this.empty();
    this.each(function (line) {
      source.add(['  ', line, '\n']);
    });
    return source;
  },

  each: function each(iter) {
    for (var i = 0, len = this.source.length; i < len; i++) {
      iter(this.source[i]);
    }
  },

  empty: function empty() {
    var loc = this.currentLocation || { start: {} };
    return new SourceNode(loc.start.line, loc.start.column, this.srcFile);
  },
  wrap: function wrap(chunk) {
    var loc = arguments.length <= 1 || arguments[1] === undefined ? this.currentLocation || { start: {} } : arguments[1];

    if (chunk instanceof SourceNode) {
      return chunk;
    }

    chunk = castChunk(chunk, this, loc);

    return new SourceNode(loc.start.line, loc.start.column, this.srcFile, chunk);
  },

  functionCall: function functionCall(fn, type, params) {
    params = this.generateList(params);
    return this.wrap([fn, type ? '.' + type + '(' : '(', params, ')']);
  },

  quotedString: function quotedString(str) {
    return '"' + (str + '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028') // Per Ecma-262 7.3 + 7.8.4
    .replace(/\u2029/g, '\\u2029') + '"';
  },

  objectLiteral: function objectLiteral(obj) {
    var pairs = [];

    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var value = castChunk(obj[key], this);
        if (value !== 'undefined') {
          pairs.push([this.quotedString(key), ':', value]);
        }
      }
    }

    var ret = this.generateList(pairs);
    ret.prepend('{');
    ret.add('}');
    return ret;
  },

  generateList: function generateList(entries) {
    var ret = this.empty();

    for (var i = 0, len = entries.length; i < len; i++) {
      if (i) {
        ret.add(',');
      }

      ret.add(castChunk(entries[i], this));
    }

    return ret;
  },

  generateArray: function generateArray(entries) {
    var ret = this.generateList(entries);
    ret.prepend('[');
    ret.add(']');

    return ret;
  }
};

exports['default'] = CodeGen;
module.exports = exports['default'];


},{"../utils":74,"source-map":77}],52:[function(require,module,exports){
/* eslint-disable new-cap */

'use strict';

exports.__esModule = true;
exports.Compiler = Compiler;
exports.precompile = precompile;
exports.compile = compile;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

var _utils = require('../utils');

var _ast = require('./ast');

var _ast2 = _interopRequireDefault(_ast);

var slice = [].slice;

function Compiler() {}

// the foundHelper register will disambiguate helper lookup from finding a
// function in a context. This is necessary for mustache compatibility, which
// requires that context functions in blocks are evaluated by blockHelperMissing,
// and then proceed as if the resulting value was provided to blockHelperMissing.

Compiler.prototype = {
  compiler: Compiler,

  equals: function equals(other) {
    var len = this.opcodes.length;
    if (other.opcodes.length !== len) {
      return false;
    }

    for (var i = 0; i < len; i++) {
      var opcode = this.opcodes[i],
          otherOpcode = other.opcodes[i];
      if (opcode.opcode !== otherOpcode.opcode || !argEquals(opcode.args, otherOpcode.args)) {
        return false;
      }
    }

    // We know that length is the same between the two arrays because they are directly tied
    // to the opcode behavior above.
    len = this.children.length;
    for (var i = 0; i < len; i++) {
      if (!this.children[i].equals(other.children[i])) {
        return false;
      }
    }

    return true;
  },

  guid: 0,

  compile: function compile(program, options) {
    this.sourceNode = [];
    this.opcodes = [];
    this.children = [];
    this.options = options;
    this.stringParams = options.stringParams;
    this.trackIds = options.trackIds;

    options.blockParams = options.blockParams || [];

    // These changes will propagate to the other compiler components
    var knownHelpers = options.knownHelpers;
    options.knownHelpers = {
      'helperMissing': true,
      'blockHelperMissing': true,
      'each': true,
      'if': true,
      'unless': true,
      'with': true,
      'log': true,
      'lookup': true
    };
    if (knownHelpers) {
      for (var _name in knownHelpers) {
        /* istanbul ignore else */
        if (_name in knownHelpers) {
          options.knownHelpers[_name] = knownHelpers[_name];
        }
      }
    }

    return this.accept(program);
  },

  compileProgram: function compileProgram(program) {
    var childCompiler = new this.compiler(),
        // eslint-disable-line new-cap
    result = childCompiler.compile(program, this.options),
        guid = this.guid++;

    this.usePartial = this.usePartial || result.usePartial;

    this.children[guid] = result;
    this.useDepths = this.useDepths || result.useDepths;

    return guid;
  },

  accept: function accept(node) {
    /* istanbul ignore next: Sanity code */
    if (!this[node.type]) {
      throw new _exception2['default']('Unknown type: ' + node.type, node);
    }

    this.sourceNode.unshift(node);
    var ret = this[node.type](node);
    this.sourceNode.shift();
    return ret;
  },

  Program: function Program(program) {
    this.options.blockParams.unshift(program.blockParams);

    var body = program.body,
        bodyLength = body.length;
    for (var i = 0; i < bodyLength; i++) {
      this.accept(body[i]);
    }

    this.options.blockParams.shift();

    this.isSimple = bodyLength === 1;
    this.blockParams = program.blockParams ? program.blockParams.length : 0;

    return this;
  },

  BlockStatement: function BlockStatement(block) {
    transformLiteralToPath(block);

    var program = block.program,
        inverse = block.inverse;

    program = program && this.compileProgram(program);
    inverse = inverse && this.compileProgram(inverse);

    var type = this.classifySexpr(block);

    if (type === 'helper') {
      this.helperSexpr(block, program, inverse);
    } else if (type === 'simple') {
      this.simpleSexpr(block);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('blockValue', block.path.original);
    } else {
      this.ambiguousSexpr(block, program, inverse);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('ambiguousBlockValue');
    }

    this.opcode('append');
  },

  DecoratorBlock: function DecoratorBlock(decorator) {
    var program = decorator.program && this.compileProgram(decorator.program);
    var params = this.setupFullMustacheParams(decorator, program, undefined),
        path = decorator.path;

    this.useDecorators = true;
    this.opcode('registerDecorator', params.length, path.original);
  },

  PartialStatement: function PartialStatement(partial) {
    this.usePartial = true;

    var program = partial.program;
    if (program) {
      program = this.compileProgram(partial.program);
    }

    var params = partial.params;
    if (params.length > 1) {
      throw new _exception2['default']('Unsupported number of partial arguments: ' + params.length, partial);
    } else if (!params.length) {
      if (this.options.explicitPartialContext) {
        this.opcode('pushLiteral', 'undefined');
      } else {
        params.push({ type: 'PathExpression', parts: [], depth: 0 });
      }
    }

    var partialName = partial.name.original,
        isDynamic = partial.name.type === 'SubExpression';
    if (isDynamic) {
      this.accept(partial.name);
    }

    this.setupFullMustacheParams(partial, program, undefined, true);

    var indent = partial.indent || '';
    if (this.options.preventIndent && indent) {
      this.opcode('appendContent', indent);
      indent = '';
    }

    this.opcode('invokePartial', isDynamic, partialName, indent);
    this.opcode('append');
  },
  PartialBlockStatement: function PartialBlockStatement(partialBlock) {
    this.PartialStatement(partialBlock);
  },

  MustacheStatement: function MustacheStatement(mustache) {
    this.SubExpression(mustache);

    if (mustache.escaped && !this.options.noEscape) {
      this.opcode('appendEscaped');
    } else {
      this.opcode('append');
    }
  },
  Decorator: function Decorator(decorator) {
    this.DecoratorBlock(decorator);
  },

  ContentStatement: function ContentStatement(content) {
    if (content.value) {
      this.opcode('appendContent', content.value);
    }
  },

  CommentStatement: function CommentStatement() {},

  SubExpression: function SubExpression(sexpr) {
    transformLiteralToPath(sexpr);
    var type = this.classifySexpr(sexpr);

    if (type === 'simple') {
      this.simpleSexpr(sexpr);
    } else if (type === 'helper') {
      this.helperSexpr(sexpr);
    } else {
      this.ambiguousSexpr(sexpr);
    }
  },
  ambiguousSexpr: function ambiguousSexpr(sexpr, program, inverse) {
    var path = sexpr.path,
        name = path.parts[0],
        isBlock = program != null || inverse != null;

    this.opcode('getContext', path.depth);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    path.strict = true;
    this.accept(path);

    this.opcode('invokeAmbiguous', name, isBlock);
  },

  simpleSexpr: function simpleSexpr(sexpr) {
    var path = sexpr.path;
    path.strict = true;
    this.accept(path);
    this.opcode('resolvePossibleLambda');
  },

  helperSexpr: function helperSexpr(sexpr, program, inverse) {
    var params = this.setupFullMustacheParams(sexpr, program, inverse),
        path = sexpr.path,
        name = path.parts[0];

    if (this.options.knownHelpers[name]) {
      this.opcode('invokeKnownHelper', params.length, name);
    } else if (this.options.knownHelpersOnly) {
      throw new _exception2['default']('You specified knownHelpersOnly, but used the unknown helper ' + name, sexpr);
    } else {
      path.strict = true;
      path.falsy = true;

      this.accept(path);
      this.opcode('invokeHelper', params.length, path.original, _ast2['default'].helpers.simpleId(path));
    }
  },

  PathExpression: function PathExpression(path) {
    this.addDepth(path.depth);
    this.opcode('getContext', path.depth);

    var name = path.parts[0],
        scoped = _ast2['default'].helpers.scopedId(path),
        blockParamId = !path.depth && !scoped && this.blockParamIndex(name);

    if (blockParamId) {
      this.opcode('lookupBlockParam', blockParamId, path.parts);
    } else if (!name) {
      // Context reference, i.e. `{{foo .}}` or `{{foo ..}}`
      this.opcode('pushContext');
    } else if (path.data) {
      this.options.data = true;
      this.opcode('lookupData', path.depth, path.parts, path.strict);
    } else {
      this.opcode('lookupOnContext', path.parts, path.falsy, path.strict, scoped);
    }
  },

  StringLiteral: function StringLiteral(string) {
    this.opcode('pushString', string.value);
  },

  NumberLiteral: function NumberLiteral(number) {
    this.opcode('pushLiteral', number.value);
  },

  BooleanLiteral: function BooleanLiteral(bool) {
    this.opcode('pushLiteral', bool.value);
  },

  UndefinedLiteral: function UndefinedLiteral() {
    this.opcode('pushLiteral', 'undefined');
  },

  NullLiteral: function NullLiteral() {
    this.opcode('pushLiteral', 'null');
  },

  Hash: function Hash(hash) {
    var pairs = hash.pairs,
        i = 0,
        l = pairs.length;

    this.opcode('pushHash');

    for (; i < l; i++) {
      this.pushParam(pairs[i].value);
    }
    while (i--) {
      this.opcode('assignToHash', pairs[i].key);
    }
    this.opcode('popHash');
  },

  // HELPERS
  opcode: function opcode(name) {
    this.opcodes.push({ opcode: name, args: slice.call(arguments, 1), loc: this.sourceNode[0].loc });
  },

  addDepth: function addDepth(depth) {
    if (!depth) {
      return;
    }

    this.useDepths = true;
  },

  classifySexpr: function classifySexpr(sexpr) {
    var isSimple = _ast2['default'].helpers.simpleId(sexpr.path);

    var isBlockParam = isSimple && !!this.blockParamIndex(sexpr.path.parts[0]);

    // a mustache is an eligible helper if:
    // * its id is simple (a single part, not `this` or `..`)
    var isHelper = !isBlockParam && _ast2['default'].helpers.helperExpression(sexpr);

    // if a mustache is an eligible helper but not a definite
    // helper, it is ambiguous, and will be resolved in a later
    // pass or at runtime.
    var isEligible = !isBlockParam && (isHelper || isSimple);

    // if ambiguous, we can possibly resolve the ambiguity now
    // An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
    if (isEligible && !isHelper) {
      var _name2 = sexpr.path.parts[0],
          options = this.options;

      if (options.knownHelpers[_name2]) {
        isHelper = true;
      } else if (options.knownHelpersOnly) {
        isEligible = false;
      }
    }

    if (isHelper) {
      return 'helper';
    } else if (isEligible) {
      return 'ambiguous';
    } else {
      return 'simple';
    }
  },

  pushParams: function pushParams(params) {
    for (var i = 0, l = params.length; i < l; i++) {
      this.pushParam(params[i]);
    }
  },

  pushParam: function pushParam(val) {
    var value = val.value != null ? val.value : val.original || '';

    if (this.stringParams) {
      if (value.replace) {
        value = value.replace(/^(\.?\.\/)*/g, '').replace(/\//g, '.');
      }

      if (val.depth) {
        this.addDepth(val.depth);
      }
      this.opcode('getContext', val.depth || 0);
      this.opcode('pushStringParam', value, val.type);

      if (val.type === 'SubExpression') {
        // SubExpressions get evaluated and passed in
        // in string params mode.
        this.accept(val);
      }
    } else {
      if (this.trackIds) {
        var blockParamIndex = undefined;
        if (val.parts && !_ast2['default'].helpers.scopedId(val) && !val.depth) {
          blockParamIndex = this.blockParamIndex(val.parts[0]);
        }
        if (blockParamIndex) {
          var blockParamChild = val.parts.slice(1).join('.');
          this.opcode('pushId', 'BlockParam', blockParamIndex, blockParamChild);
        } else {
          value = val.original || value;
          if (value.replace) {
            value = value.replace(/^this(?:\.|$)/, '').replace(/^\.\//, '').replace(/^\.$/, '');
          }

          this.opcode('pushId', val.type, value);
        }
      }
      this.accept(val);
    }
  },

  setupFullMustacheParams: function setupFullMustacheParams(sexpr, program, inverse, omitEmpty) {
    var params = sexpr.params;
    this.pushParams(params);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    if (sexpr.hash) {
      this.accept(sexpr.hash);
    } else {
      this.opcode('emptyHash', omitEmpty);
    }

    return params;
  },

  blockParamIndex: function blockParamIndex(name) {
    for (var depth = 0, len = this.options.blockParams.length; depth < len; depth++) {
      var blockParams = this.options.blockParams[depth],
          param = blockParams && _utils.indexOf(blockParams, name);
      if (blockParams && param >= 0) {
        return [depth, param];
      }
    }
  }
};

function precompile(input, options, env) {
  if (input == null || typeof input !== 'string' && input.type !== 'Program') {
    throw new _exception2['default']('You must pass a string or Handlebars AST to Handlebars.precompile. You passed ' + input);
  }

  options = options || {};
  if (!('data' in options)) {
    options.data = true;
  }
  if (options.compat) {
    options.useDepths = true;
  }

  var ast = env.parse(input, options),
      environment = new env.Compiler().compile(ast, options);
  return new env.JavaScriptCompiler().compile(environment, options);
}

function compile(input, options, env) {
  if (options === undefined) options = {};

  if (input == null || typeof input !== 'string' && input.type !== 'Program') {
    throw new _exception2['default']('You must pass a string or Handlebars AST to Handlebars.compile. You passed ' + input);
  }

  if (!('data' in options)) {
    options.data = true;
  }
  if (options.compat) {
    options.useDepths = true;
  }

  var compiled = undefined;

  function compileInput() {
    var ast = env.parse(input, options),
        environment = new env.Compiler().compile(ast, options),
        templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
    return env.template(templateSpec);
  }

  // Template is only compiled on first use and cached after that point.
  function ret(context, execOptions) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled.call(this, context, execOptions);
  }
  ret._setup = function (setupOptions) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled._setup(setupOptions);
  };
  ret._child = function (i, data, blockParams, depths) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled._child(i, data, blockParams, depths);
  };
  return ret;
}

function argEquals(a, b) {
  if (a === b) {
    return true;
  }

  if (_utils.isArray(a) && _utils.isArray(b) && a.length === b.length) {
    for (var i = 0; i < a.length; i++) {
      if (!argEquals(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
}

function transformLiteralToPath(sexpr) {
  if (!sexpr.path.parts) {
    var literal = sexpr.path;
    // Casting to string here to make false and 0 literal values play nicely with the rest
    // of the system.
    sexpr.path = {
      type: 'PathExpression',
      data: false,
      depth: 0,
      parts: [literal.original + ''],
      original: literal.original + '',
      loc: literal.loc
    };
  }
}


},{"../exception":61,"../utils":74,"./ast":49}],53:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.SourceLocation = SourceLocation;
exports.id = id;
exports.stripFlags = stripFlags;
exports.stripComment = stripComment;
exports.preparePath = preparePath;
exports.prepareMustache = prepareMustache;
exports.prepareRawBlock = prepareRawBlock;
exports.prepareBlock = prepareBlock;
exports.prepareProgram = prepareProgram;
exports.preparePartialBlock = preparePartialBlock;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

function validateClose(open, close) {
  close = close.path ? close.path.original : close;

  if (open.path.original !== close) {
    var errorNode = { loc: open.path.loc };

    throw new _exception2['default'](open.path.original + " doesn't match " + close, errorNode);
  }
}

function SourceLocation(source, locInfo) {
  this.source = source;
  this.start = {
    line: locInfo.first_line,
    column: locInfo.first_column
  };
  this.end = {
    line: locInfo.last_line,
    column: locInfo.last_column
  };
}

function id(token) {
  if (/^\[.*\]$/.test(token)) {
    return token.substr(1, token.length - 2);
  } else {
    return token;
  }
}

function stripFlags(open, close) {
  return {
    open: open.charAt(2) === '~',
    close: close.charAt(close.length - 3) === '~'
  };
}

function stripComment(comment) {
  return comment.replace(/^\{\{~?\!-?-?/, '').replace(/-?-?~?\}\}$/, '');
}

function preparePath(data, parts, loc) {
  loc = this.locInfo(loc);

  var original = data ? '@' : '',
      dig = [],
      depth = 0,
      depthString = '';

  for (var i = 0, l = parts.length; i < l; i++) {
    var part = parts[i].part,

    // If we have [] syntax then we do not treat path references as operators,
    // i.e. foo.[this] resolves to approximately context.foo['this']
    isLiteral = parts[i].original !== part;
    original += (parts[i].separator || '') + part;

    if (!isLiteral && (part === '..' || part === '.' || part === 'this')) {
      if (dig.length > 0) {
        throw new _exception2['default']('Invalid path: ' + original, { loc: loc });
      } else if (part === '..') {
        depth++;
        depthString += '../';
      }
    } else {
      dig.push(part);
    }
  }

  return {
    type: 'PathExpression',
    data: data,
    depth: depth,
    parts: dig,
    original: original,
    loc: loc
  };
}

function prepareMustache(path, params, hash, open, strip, locInfo) {
  // Must use charAt to support IE pre-10
  var escapeFlag = open.charAt(3) || open.charAt(2),
      escaped = escapeFlag !== '{' && escapeFlag !== '&';

  var decorator = /\*/.test(open);
  return {
    type: decorator ? 'Decorator' : 'MustacheStatement',
    path: path,
    params: params,
    hash: hash,
    escaped: escaped,
    strip: strip,
    loc: this.locInfo(locInfo)
  };
}

function prepareRawBlock(openRawBlock, contents, close, locInfo) {
  validateClose(openRawBlock, close);

  locInfo = this.locInfo(locInfo);
  var program = {
    type: 'Program',
    body: contents,
    strip: {},
    loc: locInfo
  };

  return {
    type: 'BlockStatement',
    path: openRawBlock.path,
    params: openRawBlock.params,
    hash: openRawBlock.hash,
    program: program,
    openStrip: {},
    inverseStrip: {},
    closeStrip: {},
    loc: locInfo
  };
}

function prepareBlock(openBlock, program, inverseAndProgram, close, inverted, locInfo) {
  if (close && close.path) {
    validateClose(openBlock, close);
  }

  var decorator = /\*/.test(openBlock.open);

  program.blockParams = openBlock.blockParams;

  var inverse = undefined,
      inverseStrip = undefined;

  if (inverseAndProgram) {
    if (decorator) {
      throw new _exception2['default']('Unexpected inverse block on decorator', inverseAndProgram);
    }

    if (inverseAndProgram.chain) {
      inverseAndProgram.program.body[0].closeStrip = close.strip;
    }

    inverseStrip = inverseAndProgram.strip;
    inverse = inverseAndProgram.program;
  }

  if (inverted) {
    inverted = inverse;
    inverse = program;
    program = inverted;
  }

  return {
    type: decorator ? 'DecoratorBlock' : 'BlockStatement',
    path: openBlock.path,
    params: openBlock.params,
    hash: openBlock.hash,
    program: program,
    inverse: inverse,
    openStrip: openBlock.strip,
    inverseStrip: inverseStrip,
    closeStrip: close && close.strip,
    loc: this.locInfo(locInfo)
  };
}

function prepareProgram(statements, loc) {
  if (!loc && statements.length) {
    var firstLoc = statements[0].loc,
        lastLoc = statements[statements.length - 1].loc;

    /* istanbul ignore else */
    if (firstLoc && lastLoc) {
      loc = {
        source: firstLoc.source,
        start: {
          line: firstLoc.start.line,
          column: firstLoc.start.column
        },
        end: {
          line: lastLoc.end.line,
          column: lastLoc.end.column
        }
      };
    }
  }

  return {
    type: 'Program',
    body: statements,
    strip: {},
    loc: loc
  };
}

function preparePartialBlock(open, program, close, locInfo) {
  validateClose(open, close);

  return {
    type: 'PartialBlockStatement',
    name: open.path,
    params: open.params,
    hash: open.hash,
    program: program,
    openStrip: open.strip,
    closeStrip: close && close.strip,
    loc: this.locInfo(locInfo)
  };
}


},{"../exception":61}],54:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _base = require('../base');

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

var _utils = require('../utils');

var _codeGen = require('./code-gen');

var _codeGen2 = _interopRequireDefault(_codeGen);

function Literal(value) {
  this.value = value;
}

function JavaScriptCompiler() {}

JavaScriptCompiler.prototype = {
  // PUBLIC API: You can override these methods in a subclass to provide
  // alternative compiled forms for name lookup and buffering semantics
  nameLookup: function nameLookup(parent, name /* , type*/) {
    if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
      return [parent, '.', name];
    } else {
      return [parent, '[', JSON.stringify(name), ']'];
    }
  },
  depthedLookup: function depthedLookup(name) {
    return [this.aliasable('container.lookup'), '(depths, "', name, '")'];
  },

  compilerInfo: function compilerInfo() {
    var revision = _base.COMPILER_REVISION,
        versions = _base.REVISION_CHANGES[revision];
    return [revision, versions];
  },

  appendToBuffer: function appendToBuffer(source, location, explicit) {
    // Force a source as this simplifies the merge logic.
    if (!_utils.isArray(source)) {
      source = [source];
    }
    source = this.source.wrap(source, location);

    if (this.environment.isSimple) {
      return ['return ', source, ';'];
    } else if (explicit) {
      // This is a case where the buffer operation occurs as a child of another
      // construct, generally braces. We have to explicitly output these buffer
      // operations to ensure that the emitted code goes in the correct location.
      return ['buffer += ', source, ';'];
    } else {
      source.appendToBuffer = true;
      return source;
    }
  },

  initializeBuffer: function initializeBuffer() {
    return this.quotedString('');
  },
  // END PUBLIC API

  compile: function compile(environment, options, context, asObject) {
    this.environment = environment;
    this.options = options;
    this.stringParams = this.options.stringParams;
    this.trackIds = this.options.trackIds;
    this.precompile = !asObject;

    this.name = this.environment.name;
    this.isChild = !!context;
    this.context = context || {
      decorators: [],
      programs: [],
      environments: []
    };

    this.preamble();

    this.stackSlot = 0;
    this.stackVars = [];
    this.aliases = {};
    this.registers = { list: [] };
    this.hashes = [];
    this.compileStack = [];
    this.inlineStack = [];
    this.blockParams = [];

    this.compileChildren(environment, options);

    this.useDepths = this.useDepths || environment.useDepths || environment.useDecorators || this.options.compat;
    this.useBlockParams = this.useBlockParams || environment.useBlockParams;

    var opcodes = environment.opcodes,
        opcode = undefined,
        firstLoc = undefined,
        i = undefined,
        l = undefined;

    for (i = 0, l = opcodes.length; i < l; i++) {
      opcode = opcodes[i];

      this.source.currentLocation = opcode.loc;
      firstLoc = firstLoc || opcode.loc;
      this[opcode.opcode].apply(this, opcode.args);
    }

    // Flush any trailing content that might be pending.
    this.source.currentLocation = firstLoc;
    this.pushSource('');

    /* istanbul ignore next */
    if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
      throw new _exception2['default']('Compile completed with content left on stack');
    }

    if (!this.decorators.isEmpty()) {
      this.useDecorators = true;

      this.decorators.prepend('var decorators = container.decorators;\n');
      this.decorators.push('return fn;');

      if (asObject) {
        this.decorators = Function.apply(this, ['fn', 'props', 'container', 'depth0', 'data', 'blockParams', 'depths', this.decorators.merge()]);
      } else {
        this.decorators.prepend('function(fn, props, container, depth0, data, blockParams, depths) {\n');
        this.decorators.push('}\n');
        this.decorators = this.decorators.merge();
      }
    } else {
      this.decorators = undefined;
    }

    var fn = this.createFunctionContext(asObject);
    if (!this.isChild) {
      var ret = {
        compiler: this.compilerInfo(),
        main: fn
      };

      if (this.decorators) {
        ret.main_d = this.decorators; // eslint-disable-line camelcase
        ret.useDecorators = true;
      }

      var _context = this.context;
      var programs = _context.programs;
      var decorators = _context.decorators;

      for (i = 0, l = programs.length; i < l; i++) {
        if (programs[i]) {
          ret[i] = programs[i];
          if (decorators[i]) {
            ret[i + '_d'] = decorators[i];
            ret.useDecorators = true;
          }
        }
      }

      if (this.environment.usePartial) {
        ret.usePartial = true;
      }
      if (this.options.data) {
        ret.useData = true;
      }
      if (this.useDepths) {
        ret.useDepths = true;
      }
      if (this.useBlockParams) {
        ret.useBlockParams = true;
      }
      if (this.options.compat) {
        ret.compat = true;
      }

      if (!asObject) {
        ret.compiler = JSON.stringify(ret.compiler);

        this.source.currentLocation = { start: { line: 1, column: 0 } };
        ret = this.objectLiteral(ret);

        if (options.srcName) {
          ret = ret.toStringWithSourceMap({ file: options.destName });
          ret.map = ret.map && ret.map.toString();
        } else {
          ret = ret.toString();
        }
      } else {
        ret.compilerOptions = this.options;
      }

      return ret;
    } else {
      return fn;
    }
  },

  preamble: function preamble() {
    // track the last context pushed into place to allow skipping the
    // getContext opcode when it would be a noop
    this.lastContext = 0;
    this.source = new _codeGen2['default'](this.options.srcName);
    this.decorators = new _codeGen2['default'](this.options.srcName);
  },

  createFunctionContext: function createFunctionContext(asObject) {
    var varDeclarations = '';

    var locals = this.stackVars.concat(this.registers.list);
    if (locals.length > 0) {
      varDeclarations += ', ' + locals.join(', ');
    }

    // Generate minimizer alias mappings
    //
    // When using true SourceNodes, this will update all references to the given alias
    // as the source nodes are reused in situ. For the non-source node compilation mode,
    // aliases will not be used, but this case is already being run on the client and
    // we aren't concern about minimizing the template size.
    var aliasCount = 0;
    for (var alias in this.aliases) {
      // eslint-disable-line guard-for-in
      var node = this.aliases[alias];

      if (this.aliases.hasOwnProperty(alias) && node.children && node.referenceCount > 1) {
        varDeclarations += ', alias' + ++aliasCount + '=' + alias;
        node.children[0] = 'alias' + aliasCount;
      }
    }

    var params = ['container', 'depth0', 'helpers', 'partials', 'data'];

    if (this.useBlockParams || this.useDepths) {
      params.push('blockParams');
    }
    if (this.useDepths) {
      params.push('depths');
    }

    // Perform a second pass over the output to merge content when possible
    var source = this.mergeSource(varDeclarations);

    if (asObject) {
      params.push(source);

      return Function.apply(this, params);
    } else {
      return this.source.wrap(['function(', params.join(','), ') {\n  ', source, '}']);
    }
  },
  mergeSource: function mergeSource(varDeclarations) {
    var isSimple = this.environment.isSimple,
        appendOnly = !this.forceBuffer,
        appendFirst = undefined,
        sourceSeen = undefined,
        bufferStart = undefined,
        bufferEnd = undefined;
    this.source.each(function (line) {
      if (line.appendToBuffer) {
        if (bufferStart) {
          line.prepend('  + ');
        } else {
          bufferStart = line;
        }
        bufferEnd = line;
      } else {
        if (bufferStart) {
          if (!sourceSeen) {
            appendFirst = true;
          } else {
            bufferStart.prepend('buffer += ');
          }
          bufferEnd.add(';');
          bufferStart = bufferEnd = undefined;
        }

        sourceSeen = true;
        if (!isSimple) {
          appendOnly = false;
        }
      }
    });

    if (appendOnly) {
      if (bufferStart) {
        bufferStart.prepend('return ');
        bufferEnd.add(';');
      } else if (!sourceSeen) {
        this.source.push('return "";');
      }
    } else {
      varDeclarations += ', buffer = ' + (appendFirst ? '' : this.initializeBuffer());

      if (bufferStart) {
        bufferStart.prepend('return buffer + ');
        bufferEnd.add(';');
      } else {
        this.source.push('return buffer;');
      }
    }

    if (varDeclarations) {
      this.source.prepend('var ' + varDeclarations.substring(2) + (appendFirst ? '' : ';\n'));
    }

    return this.source.merge();
  },

  // [blockValue]
  //
  // On stack, before: hash, inverse, program, value
  // On stack, after: return value of blockHelperMissing
  //
  // The purpose of this opcode is to take a block of the form
  // `{{#this.foo}}...{{/this.foo}}`, resolve the value of `foo`, and
  // replace it on the stack with the result of properly
  // invoking blockHelperMissing.
  blockValue: function blockValue(name) {
    var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
        params = [this.contextName(0)];
    this.setupHelperArgs(name, 0, params);

    var blockName = this.popStack();
    params.splice(1, 0, blockName);

    this.push(this.source.functionCall(blockHelperMissing, 'call', params));
  },

  // [ambiguousBlockValue]
  //
  // On stack, before: hash, inverse, program, value
  // Compiler value, before: lastHelper=value of last found helper, if any
  // On stack, after, if no lastHelper: same as [blockValue]
  // On stack, after, if lastHelper: value
  ambiguousBlockValue: function ambiguousBlockValue() {
    // We're being a bit cheeky and reusing the options value from the prior exec
    var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
        params = [this.contextName(0)];
    this.setupHelperArgs('', 0, params, true);

    this.flushInline();

    var current = this.topStack();
    params.splice(1, 0, current);

    this.pushSource(['if (!', this.lastHelper, ') { ', current, ' = ', this.source.functionCall(blockHelperMissing, 'call', params), '}']);
  },

  // [appendContent]
  //
  // On stack, before: ...
  // On stack, after: ...
  //
  // Appends the string value of `content` to the current buffer
  appendContent: function appendContent(content) {
    if (this.pendingContent) {
      content = this.pendingContent + content;
    } else {
      this.pendingLocation = this.source.currentLocation;
    }

    this.pendingContent = content;
  },

  // [append]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Coerces `value` to a String and appends it to the current buffer.
  //
  // If `value` is truthy, or 0, it is coerced into a string and appended
  // Otherwise, the empty string is appended
  append: function append() {
    if (this.isInline()) {
      this.replaceStack(function (current) {
        return [' != null ? ', current, ' : ""'];
      });

      this.pushSource(this.appendToBuffer(this.popStack()));
    } else {
      var local = this.popStack();
      this.pushSource(['if (', local, ' != null) { ', this.appendToBuffer(local, undefined, true), ' }']);
      if (this.environment.isSimple) {
        this.pushSource(['else { ', this.appendToBuffer("''", undefined, true), ' }']);
      }
    }
  },

  // [appendEscaped]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Escape `value` and append it to the buffer
  appendEscaped: function appendEscaped() {
    this.pushSource(this.appendToBuffer([this.aliasable('container.escapeExpression'), '(', this.popStack(), ')']));
  },

  // [getContext]
  //
  // On stack, before: ...
  // On stack, after: ...
  // Compiler value, after: lastContext=depth
  //
  // Set the value of the `lastContext` compiler value to the depth
  getContext: function getContext(depth) {
    this.lastContext = depth;
  },

  // [pushContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext, ...
  //
  // Pushes the value of the current context onto the stack.
  pushContext: function pushContext() {
    this.pushStackLiteral(this.contextName(this.lastContext));
  },

  // [lookupOnContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext[name], ...
  //
  // Looks up the value of `name` on the current context and pushes
  // it onto the stack.
  lookupOnContext: function lookupOnContext(parts, falsy, strict, scoped) {
    var i = 0;

    if (!scoped && this.options.compat && !this.lastContext) {
      // The depthed query is expected to handle the undefined logic for the root level that
      // is implemented below, so we evaluate that directly in compat mode
      this.push(this.depthedLookup(parts[i++]));
    } else {
      this.pushContext();
    }

    this.resolvePath('context', parts, i, falsy, strict);
  },

  // [lookupBlockParam]
  //
  // On stack, before: ...
  // On stack, after: blockParam[name], ...
  //
  // Looks up the value of `parts` on the given block param and pushes
  // it onto the stack.
  lookupBlockParam: function lookupBlockParam(blockParamId, parts) {
    this.useBlockParams = true;

    this.push(['blockParams[', blockParamId[0], '][', blockParamId[1], ']']);
    this.resolvePath('context', parts, 1);
  },

  // [lookupData]
  //
  // On stack, before: ...
  // On stack, after: data, ...
  //
  // Push the data lookup operator
  lookupData: function lookupData(depth, parts, strict) {
    if (!depth) {
      this.pushStackLiteral('data');
    } else {
      this.pushStackLiteral('container.data(data, ' + depth + ')');
    }

    this.resolvePath('data', parts, 0, true, strict);
  },

  resolvePath: function resolvePath(type, parts, i, falsy, strict) {
    // istanbul ignore next

    var _this = this;

    if (this.options.strict || this.options.assumeObjects) {
      this.push(strictLookup(this.options.strict && strict, this, parts, type));
      return;
    }

    var len = parts.length;
    for (; i < len; i++) {
      /* eslint-disable no-loop-func */
      this.replaceStack(function (current) {
        var lookup = _this.nameLookup(current, parts[i], type);
        // We want to ensure that zero and false are handled properly if the context (falsy flag)
        // needs to have the special handling for these values.
        if (!falsy) {
          return [' != null ? ', lookup, ' : ', current];
        } else {
          // Otherwise we can use generic falsy handling
          return [' && ', lookup];
        }
      });
      /* eslint-enable no-loop-func */
    }
  },

  // [resolvePossibleLambda]
  //
  // On stack, before: value, ...
  // On stack, after: resolved value, ...
  //
  // If the `value` is a lambda, replace it on the stack by
  // the return value of the lambda
  resolvePossibleLambda: function resolvePossibleLambda() {
    this.push([this.aliasable('container.lambda'), '(', this.popStack(), ', ', this.contextName(0), ')']);
  },

  // [pushStringParam]
  //
  // On stack, before: ...
  // On stack, after: string, currentContext, ...
  //
  // This opcode is designed for use in string mode, which
  // provides the string value of a parameter along with its
  // depth rather than resolving it immediately.
  pushStringParam: function pushStringParam(string, type) {
    this.pushContext();
    this.pushString(type);

    // If it's a subexpression, the string result
    // will be pushed after this opcode.
    if (type !== 'SubExpression') {
      if (typeof string === 'string') {
        this.pushString(string);
      } else {
        this.pushStackLiteral(string);
      }
    }
  },

  emptyHash: function emptyHash(omitEmpty) {
    if (this.trackIds) {
      this.push('{}'); // hashIds
    }
    if (this.stringParams) {
      this.push('{}'); // hashContexts
      this.push('{}'); // hashTypes
    }
    this.pushStackLiteral(omitEmpty ? 'undefined' : '{}');
  },
  pushHash: function pushHash() {
    if (this.hash) {
      this.hashes.push(this.hash);
    }
    this.hash = { values: [], types: [], contexts: [], ids: [] };
  },
  popHash: function popHash() {
    var hash = this.hash;
    this.hash = this.hashes.pop();

    if (this.trackIds) {
      this.push(this.objectLiteral(hash.ids));
    }
    if (this.stringParams) {
      this.push(this.objectLiteral(hash.contexts));
      this.push(this.objectLiteral(hash.types));
    }

    this.push(this.objectLiteral(hash.values));
  },

  // [pushString]
  //
  // On stack, before: ...
  // On stack, after: quotedString(string), ...
  //
  // Push a quoted version of `string` onto the stack
  pushString: function pushString(string) {
    this.pushStackLiteral(this.quotedString(string));
  },

  // [pushLiteral]
  //
  // On stack, before: ...
  // On stack, after: value, ...
  //
  // Pushes a value onto the stack. This operation prevents
  // the compiler from creating a temporary variable to hold
  // it.
  pushLiteral: function pushLiteral(value) {
    this.pushStackLiteral(value);
  },

  // [pushProgram]
  //
  // On stack, before: ...
  // On stack, after: program(guid), ...
  //
  // Push a program expression onto the stack. This takes
  // a compile-time guid and converts it into a runtime-accessible
  // expression.
  pushProgram: function pushProgram(guid) {
    if (guid != null) {
      this.pushStackLiteral(this.programExpression(guid));
    } else {
      this.pushStackLiteral(null);
    }
  },

  // [registerDecorator]
  //
  // On stack, before: hash, program, params..., ...
  // On stack, after: ...
  //
  // Pops off the decorator's parameters, invokes the decorator,
  // and inserts the decorator into the decorators list.
  registerDecorator: function registerDecorator(paramSize, name) {
    var foundDecorator = this.nameLookup('decorators', name, 'decorator'),
        options = this.setupHelperArgs(name, paramSize);

    this.decorators.push(['fn = ', this.decorators.functionCall(foundDecorator, '', ['fn', 'props', 'container', options]), ' || fn;']);
  },

  // [invokeHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // Pops off the helper's parameters, invokes the helper,
  // and pushes the helper's return value onto the stack.
  //
  // If the helper is not found, `helperMissing` is called.
  invokeHelper: function invokeHelper(paramSize, name, isSimple) {
    var nonHelper = this.popStack(),
        helper = this.setupHelper(paramSize, name),
        simple = isSimple ? [helper.name, ' || '] : '';

    var lookup = ['('].concat(simple, nonHelper);
    if (!this.options.strict) {
      lookup.push(' || ', this.aliasable('helpers.helperMissing'));
    }
    lookup.push(')');

    this.push(this.source.functionCall(lookup, 'call', helper.callParams));
  },

  // [invokeKnownHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // This operation is used when the helper is known to exist,
  // so a `helperMissing` fallback is not required.
  invokeKnownHelper: function invokeKnownHelper(paramSize, name) {
    var helper = this.setupHelper(paramSize, name);
    this.push(this.source.functionCall(helper.name, 'call', helper.callParams));
  },

  // [invokeAmbiguous]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of disambiguation
  //
  // This operation is used when an expression like `{{foo}}`
  // is provided, but we don't know at compile-time whether it
  // is a helper or a path.
  //
  // This operation emits more code than the other options,
  // and can be avoided by passing the `knownHelpers` and
  // `knownHelpersOnly` flags at compile-time.
  invokeAmbiguous: function invokeAmbiguous(name, helperCall) {
    this.useRegister('helper');

    var nonHelper = this.popStack();

    this.emptyHash();
    var helper = this.setupHelper(0, name, helperCall);

    var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

    var lookup = ['(', '(helper = ', helperName, ' || ', nonHelper, ')'];
    if (!this.options.strict) {
      lookup[0] = '(helper = ';
      lookup.push(' != null ? helper : ', this.aliasable('helpers.helperMissing'));
    }

    this.push(['(', lookup, helper.paramsInit ? ['),(', helper.paramsInit] : [], '),', '(typeof helper === ', this.aliasable('"function"'), ' ? ', this.source.functionCall('helper', 'call', helper.callParams), ' : helper))']);
  },

  // [invokePartial]
  //
  // On stack, before: context, ...
  // On stack after: result of partial invocation
  //
  // This operation pops off a context, invokes a partial with that context,
  // and pushes the result of the invocation back.
  invokePartial: function invokePartial(isDynamic, name, indent) {
    var params = [],
        options = this.setupParams(name, 1, params);

    if (isDynamic) {
      name = this.popStack();
      delete options.name;
    }

    if (indent) {
      options.indent = JSON.stringify(indent);
    }
    options.helpers = 'helpers';
    options.partials = 'partials';
    options.decorators = 'container.decorators';

    if (!isDynamic) {
      params.unshift(this.nameLookup('partials', name, 'partial'));
    } else {
      params.unshift(name);
    }

    if (this.options.compat) {
      options.depths = 'depths';
    }
    options = this.objectLiteral(options);
    params.push(options);

    this.push(this.source.functionCall('container.invokePartial', '', params));
  },

  // [assignToHash]
  //
  // On stack, before: value, ..., hash, ...
  // On stack, after: ..., hash, ...
  //
  // Pops a value off the stack and assigns it to the current hash
  assignToHash: function assignToHash(key) {
    var value = this.popStack(),
        context = undefined,
        type = undefined,
        id = undefined;

    if (this.trackIds) {
      id = this.popStack();
    }
    if (this.stringParams) {
      type = this.popStack();
      context = this.popStack();
    }

    var hash = this.hash;
    if (context) {
      hash.contexts[key] = context;
    }
    if (type) {
      hash.types[key] = type;
    }
    if (id) {
      hash.ids[key] = id;
    }
    hash.values[key] = value;
  },

  pushId: function pushId(type, name, child) {
    if (type === 'BlockParam') {
      this.pushStackLiteral('blockParams[' + name[0] + '].path[' + name[1] + ']' + (child ? ' + ' + JSON.stringify('.' + child) : ''));
    } else if (type === 'PathExpression') {
      this.pushString(name);
    } else if (type === 'SubExpression') {
      this.pushStackLiteral('true');
    } else {
      this.pushStackLiteral('null');
    }
  },

  // HELPERS

  compiler: JavaScriptCompiler,

  compileChildren: function compileChildren(environment, options) {
    var children = environment.children,
        child = undefined,
        compiler = undefined;

    for (var i = 0, l = children.length; i < l; i++) {
      child = children[i];
      compiler = new this.compiler(); // eslint-disable-line new-cap

      var index = this.matchExistingProgram(child);

      if (index == null) {
        this.context.programs.push(''); // Placeholder to prevent name conflicts for nested children
        index = this.context.programs.length;
        child.index = index;
        child.name = 'program' + index;
        this.context.programs[index] = compiler.compile(child, options, this.context, !this.precompile);
        this.context.decorators[index] = compiler.decorators;
        this.context.environments[index] = child;

        this.useDepths = this.useDepths || compiler.useDepths;
        this.useBlockParams = this.useBlockParams || compiler.useBlockParams;
      } else {
        child.index = index;
        child.name = 'program' + index;

        this.useDepths = this.useDepths || child.useDepths;
        this.useBlockParams = this.useBlockParams || child.useBlockParams;
      }
    }
  },
  matchExistingProgram: function matchExistingProgram(child) {
    for (var i = 0, len = this.context.environments.length; i < len; i++) {
      var environment = this.context.environments[i];
      if (environment && environment.equals(child)) {
        return i;
      }
    }
  },

  programExpression: function programExpression(guid) {
    var child = this.environment.children[guid],
        programParams = [child.index, 'data', child.blockParams];

    if (this.useBlockParams || this.useDepths) {
      programParams.push('blockParams');
    }
    if (this.useDepths) {
      programParams.push('depths');
    }

    return 'container.program(' + programParams.join(', ') + ')';
  },

  useRegister: function useRegister(name) {
    if (!this.registers[name]) {
      this.registers[name] = true;
      this.registers.list.push(name);
    }
  },

  push: function push(expr) {
    if (!(expr instanceof Literal)) {
      expr = this.source.wrap(expr);
    }

    this.inlineStack.push(expr);
    return expr;
  },

  pushStackLiteral: function pushStackLiteral(item) {
    this.push(new Literal(item));
  },

  pushSource: function pushSource(source) {
    if (this.pendingContent) {
      this.source.push(this.appendToBuffer(this.source.quotedString(this.pendingContent), this.pendingLocation));
      this.pendingContent = undefined;
    }

    if (source) {
      this.source.push(source);
    }
  },

  replaceStack: function replaceStack(callback) {
    var prefix = ['('],
        stack = undefined,
        createdStack = undefined,
        usedLiteral = undefined;

    /* istanbul ignore next */
    if (!this.isInline()) {
      throw new _exception2['default']('replaceStack on non-inline');
    }

    // We want to merge the inline statement into the replacement statement via ','
    var top = this.popStack(true);

    if (top instanceof Literal) {
      // Literals do not need to be inlined
      stack = [top.value];
      prefix = ['(', stack];
      usedLiteral = true;
    } else {
      // Get or create the current stack name for use by the inline
      createdStack = true;
      var _name = this.incrStack();

      prefix = ['((', this.push(_name), ' = ', top, ')'];
      stack = this.topStack();
    }

    var item = callback.call(this, stack);

    if (!usedLiteral) {
      this.popStack();
    }
    if (createdStack) {
      this.stackSlot--;
    }
    this.push(prefix.concat(item, ')'));
  },

  incrStack: function incrStack() {
    this.stackSlot++;
    if (this.stackSlot > this.stackVars.length) {
      this.stackVars.push('stack' + this.stackSlot);
    }
    return this.topStackName();
  },
  topStackName: function topStackName() {
    return 'stack' + this.stackSlot;
  },
  flushInline: function flushInline() {
    var inlineStack = this.inlineStack;
    this.inlineStack = [];
    for (var i = 0, len = inlineStack.length; i < len; i++) {
      var entry = inlineStack[i];
      /* istanbul ignore if */
      if (entry instanceof Literal) {
        this.compileStack.push(entry);
      } else {
        var stack = this.incrStack();
        this.pushSource([stack, ' = ', entry, ';']);
        this.compileStack.push(stack);
      }
    }
  },
  isInline: function isInline() {
    return this.inlineStack.length;
  },

  popStack: function popStack(wrapped) {
    var inline = this.isInline(),
        item = (inline ? this.inlineStack : this.compileStack).pop();

    if (!wrapped && item instanceof Literal) {
      return item.value;
    } else {
      if (!inline) {
        /* istanbul ignore next */
        if (!this.stackSlot) {
          throw new _exception2['default']('Invalid stack pop');
        }
        this.stackSlot--;
      }
      return item;
    }
  },

  topStack: function topStack() {
    var stack = this.isInline() ? this.inlineStack : this.compileStack,
        item = stack[stack.length - 1];

    /* istanbul ignore if */
    if (item instanceof Literal) {
      return item.value;
    } else {
      return item;
    }
  },

  contextName: function contextName(context) {
    if (this.useDepths && context) {
      return 'depths[' + context + ']';
    } else {
      return 'depth' + context;
    }
  },

  quotedString: function quotedString(str) {
    return this.source.quotedString(str);
  },

  objectLiteral: function objectLiteral(obj) {
    return this.source.objectLiteral(obj);
  },

  aliasable: function aliasable(name) {
    var ret = this.aliases[name];
    if (ret) {
      ret.referenceCount++;
      return ret;
    }

    ret = this.aliases[name] = this.source.wrap(name);
    ret.aliasable = true;
    ret.referenceCount = 1;

    return ret;
  },

  setupHelper: function setupHelper(paramSize, name, blockHelper) {
    var params = [],
        paramsInit = this.setupHelperArgs(name, paramSize, params, blockHelper);
    var foundHelper = this.nameLookup('helpers', name, 'helper'),
        callContext = this.aliasable(this.contextName(0) + ' != null ? ' + this.contextName(0) + ' : {}');

    return {
      params: params,
      paramsInit: paramsInit,
      name: foundHelper,
      callParams: [callContext].concat(params)
    };
  },

  setupParams: function setupParams(helper, paramSize, params) {
    var options = {},
        contexts = [],
        types = [],
        ids = [],
        objectArgs = !params,
        param = undefined;

    if (objectArgs) {
      params = [];
    }

    options.name = this.quotedString(helper);
    options.hash = this.popStack();

    if (this.trackIds) {
      options.hashIds = this.popStack();
    }
    if (this.stringParams) {
      options.hashTypes = this.popStack();
      options.hashContexts = this.popStack();
    }

    var inverse = this.popStack(),
        program = this.popStack();

    // Avoid setting fn and inverse if neither are set. This allows
    // helpers to do a check for `if (options.fn)`
    if (program || inverse) {
      options.fn = program || 'container.noop';
      options.inverse = inverse || 'container.noop';
    }

    // The parameters go on to the stack in order (making sure that they are evaluated in order)
    // so we need to pop them off the stack in reverse order
    var i = paramSize;
    while (i--) {
      param = this.popStack();
      params[i] = param;

      if (this.trackIds) {
        ids[i] = this.popStack();
      }
      if (this.stringParams) {
        types[i] = this.popStack();
        contexts[i] = this.popStack();
      }
    }

    if (objectArgs) {
      options.args = this.source.generateArray(params);
    }

    if (this.trackIds) {
      options.ids = this.source.generateArray(ids);
    }
    if (this.stringParams) {
      options.types = this.source.generateArray(types);
      options.contexts = this.source.generateArray(contexts);
    }

    if (this.options.data) {
      options.data = 'data';
    }
    if (this.useBlockParams) {
      options.blockParams = 'blockParams';
    }
    return options;
  },

  setupHelperArgs: function setupHelperArgs(helper, paramSize, params, useRegister) {
    var options = this.setupParams(helper, paramSize, params);
    options = this.objectLiteral(options);
    if (useRegister) {
      this.useRegister('options');
      params.push('options');
      return ['options=', options];
    } else if (params) {
      params.push(options);
      return '';
    } else {
      return options;
    }
  }
};

(function () {
  var reservedWords = ('break else new var' + ' case finally return void' + ' catch for switch while' + ' continue function this with' + ' default if throw' + ' delete in try' + ' do instanceof typeof' + ' abstract enum int short' + ' boolean export interface static' + ' byte extends long super' + ' char final native synchronized' + ' class float package throws' + ' const goto private transient' + ' debugger implements protected volatile' + ' double import public let yield await' + ' null true false').split(' ');

  var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

  for (var i = 0, l = reservedWords.length; i < l; i++) {
    compilerWords[reservedWords[i]] = true;
  }
})();

JavaScriptCompiler.isValidJavaScriptVariableName = function (name) {
  return !JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
};

function strictLookup(requireTerminal, compiler, parts, type) {
  var stack = compiler.popStack(),
      i = 0,
      len = parts.length;
  if (requireTerminal) {
    len--;
  }

  for (; i < len; i++) {
    stack = compiler.nameLookup(stack, parts[i], type);
  }

  if (requireTerminal) {
    return [compiler.aliasable('container.strict'), '(', stack, ', ', compiler.quotedString(parts[i]), ')'];
  } else {
    return stack;
  }
}

exports['default'] = JavaScriptCompiler;
module.exports = exports['default'];


},{"../base":48,"../exception":61,"../utils":74,"./code-gen":51}],55:[function(require,module,exports){
/* istanbul ignore next */
/* Jison generated parser */
"use strict";

var handlebars = (function () {
    var parser = { trace: function trace() {},
        yy: {},
        symbols_: { "error": 2, "root": 3, "program": 4, "EOF": 5, "program_repetition0": 6, "statement": 7, "mustache": 8, "block": 9, "rawBlock": 10, "partial": 11, "partialBlock": 12, "content": 13, "COMMENT": 14, "CONTENT": 15, "openRawBlock": 16, "rawBlock_repetition_plus0": 17, "END_RAW_BLOCK": 18, "OPEN_RAW_BLOCK": 19, "helperName": 20, "openRawBlock_repetition0": 21, "openRawBlock_option0": 22, "CLOSE_RAW_BLOCK": 23, "openBlock": 24, "block_option0": 25, "closeBlock": 26, "openInverse": 27, "block_option1": 28, "OPEN_BLOCK": 29, "openBlock_repetition0": 30, "openBlock_option0": 31, "openBlock_option1": 32, "CLOSE": 33, "OPEN_INVERSE": 34, "openInverse_repetition0": 35, "openInverse_option0": 36, "openInverse_option1": 37, "openInverseChain": 38, "OPEN_INVERSE_CHAIN": 39, "openInverseChain_repetition0": 40, "openInverseChain_option0": 41, "openInverseChain_option1": 42, "inverseAndProgram": 43, "INVERSE": 44, "inverseChain": 45, "inverseChain_option0": 46, "OPEN_ENDBLOCK": 47, "OPEN": 48, "mustache_repetition0": 49, "mustache_option0": 50, "OPEN_UNESCAPED": 51, "mustache_repetition1": 52, "mustache_option1": 53, "CLOSE_UNESCAPED": 54, "OPEN_PARTIAL": 55, "partialName": 56, "partial_repetition0": 57, "partial_option0": 58, "openPartialBlock": 59, "OPEN_PARTIAL_BLOCK": 60, "openPartialBlock_repetition0": 61, "openPartialBlock_option0": 62, "param": 63, "sexpr": 64, "OPEN_SEXPR": 65, "sexpr_repetition0": 66, "sexpr_option0": 67, "CLOSE_SEXPR": 68, "hash": 69, "hash_repetition_plus0": 70, "hashSegment": 71, "ID": 72, "EQUALS": 73, "blockParams": 74, "OPEN_BLOCK_PARAMS": 75, "blockParams_repetition_plus0": 76, "CLOSE_BLOCK_PARAMS": 77, "path": 78, "dataName": 79, "STRING": 80, "NUMBER": 81, "BOOLEAN": 82, "UNDEFINED": 83, "NULL": 84, "DATA": 85, "pathSegments": 86, "SEP": 87, "$accept": 0, "$end": 1 },
        terminals_: { 2: "error", 5: "EOF", 14: "COMMENT", 15: "CONTENT", 18: "END_RAW_BLOCK", 19: "OPEN_RAW_BLOCK", 23: "CLOSE_RAW_BLOCK", 29: "OPEN_BLOCK", 33: "CLOSE", 34: "OPEN_INVERSE", 39: "OPEN_INVERSE_CHAIN", 44: "INVERSE", 47: "OPEN_ENDBLOCK", 48: "OPEN", 51: "OPEN_UNESCAPED", 54: "CLOSE_UNESCAPED", 55: "OPEN_PARTIAL", 60: "OPEN_PARTIAL_BLOCK", 65: "OPEN_SEXPR", 68: "CLOSE_SEXPR", 72: "ID", 73: "EQUALS", 75: "OPEN_BLOCK_PARAMS", 77: "CLOSE_BLOCK_PARAMS", 80: "STRING", 81: "NUMBER", 82: "BOOLEAN", 83: "UNDEFINED", 84: "NULL", 85: "DATA", 87: "SEP" },
        productions_: [0, [3, 2], [4, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [13, 1], [10, 3], [16, 5], [9, 4], [9, 4], [24, 6], [27, 6], [38, 6], [43, 2], [45, 3], [45, 1], [26, 3], [8, 5], [8, 5], [11, 5], [12, 3], [59, 5], [63, 1], [63, 1], [64, 5], [69, 1], [71, 3], [74, 3], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [56, 1], [56, 1], [79, 2], [78, 1], [86, 3], [86, 1], [6, 0], [6, 2], [17, 1], [17, 2], [21, 0], [21, 2], [22, 0], [22, 1], [25, 0], [25, 1], [28, 0], [28, 1], [30, 0], [30, 2], [31, 0], [31, 1], [32, 0], [32, 1], [35, 0], [35, 2], [36, 0], [36, 1], [37, 0], [37, 1], [40, 0], [40, 2], [41, 0], [41, 1], [42, 0], [42, 1], [46, 0], [46, 1], [49, 0], [49, 2], [50, 0], [50, 1], [52, 0], [52, 2], [53, 0], [53, 1], [57, 0], [57, 2], [58, 0], [58, 1], [61, 0], [61, 2], [62, 0], [62, 1], [66, 0], [66, 2], [67, 0], [67, 1], [70, 1], [70, 2], [76, 1], [76, 2]],
        performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$
        /**/) {

            var $0 = $$.length - 1;
            switch (yystate) {
                case 1:
                    return $$[$0 - 1];
                    break;
                case 2:
                    this.$ = yy.prepareProgram($$[$0]);
                    break;
                case 3:
                    this.$ = $$[$0];
                    break;
                case 4:
                    this.$ = $$[$0];
                    break;
                case 5:
                    this.$ = $$[$0];
                    break;
                case 6:
                    this.$ = $$[$0];
                    break;
                case 7:
                    this.$ = $$[$0];
                    break;
                case 8:
                    this.$ = $$[$0];
                    break;
                case 9:
                    this.$ = {
                        type: 'CommentStatement',
                        value: yy.stripComment($$[$0]),
                        strip: yy.stripFlags($$[$0], $$[$0]),
                        loc: yy.locInfo(this._$)
                    };

                    break;
                case 10:
                    this.$ = {
                        type: 'ContentStatement',
                        original: $$[$0],
                        value: $$[$0],
                        loc: yy.locInfo(this._$)
                    };

                    break;
                case 11:
                    this.$ = yy.prepareRawBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
                    break;
                case 12:
                    this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1] };
                    break;
                case 13:
                    this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], false, this._$);
                    break;
                case 14:
                    this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], true, this._$);
                    break;
                case 15:
                    this.$ = { open: $$[$0 - 5], path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 16:
                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 17:
                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 18:
                    this.$ = { strip: yy.stripFlags($$[$0 - 1], $$[$0 - 1]), program: $$[$0] };
                    break;
                case 19:
                    var inverse = yy.prepareBlock($$[$0 - 2], $$[$0 - 1], $$[$0], $$[$0], false, this._$),
                        program = yy.prepareProgram([inverse], $$[$0 - 1].loc);
                    program.chained = true;

                    this.$ = { strip: $$[$0 - 2].strip, program: program, chain: true };

                    break;
                case 20:
                    this.$ = $$[$0];
                    break;
                case 21:
                    this.$ = { path: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 2], $$[$0]) };
                    break;
                case 22:
                    this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                    break;
                case 23:
                    this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                    break;
                case 24:
                    this.$ = {
                        type: 'PartialStatement',
                        name: $$[$0 - 3],
                        params: $$[$0 - 2],
                        hash: $$[$0 - 1],
                        indent: '',
                        strip: yy.stripFlags($$[$0 - 4], $$[$0]),
                        loc: yy.locInfo(this._$)
                    };

                    break;
                case 25:
                    this.$ = yy.preparePartialBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
                    break;
                case 26:
                    this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 4], $$[$0]) };
                    break;
                case 27:
                    this.$ = $$[$0];
                    break;
                case 28:
                    this.$ = $$[$0];
                    break;
                case 29:
                    this.$ = {
                        type: 'SubExpression',
                        path: $$[$0 - 3],
                        params: $$[$0 - 2],
                        hash: $$[$0 - 1],
                        loc: yy.locInfo(this._$)
                    };

                    break;
                case 30:
                    this.$ = { type: 'Hash', pairs: $$[$0], loc: yy.locInfo(this._$) };
                    break;
                case 31:
                    this.$ = { type: 'HashPair', key: yy.id($$[$0 - 2]), value: $$[$0], loc: yy.locInfo(this._$) };
                    break;
                case 32:
                    this.$ = yy.id($$[$0 - 1]);
                    break;
                case 33:
                    this.$ = $$[$0];
                    break;
                case 34:
                    this.$ = $$[$0];
                    break;
                case 35:
                    this.$ = { type: 'StringLiteral', value: $$[$0], original: $$[$0], loc: yy.locInfo(this._$) };
                    break;
                case 36:
                    this.$ = { type: 'NumberLiteral', value: Number($$[$0]), original: Number($$[$0]), loc: yy.locInfo(this._$) };
                    break;
                case 37:
                    this.$ = { type: 'BooleanLiteral', value: $$[$0] === 'true', original: $$[$0] === 'true', loc: yy.locInfo(this._$) };
                    break;
                case 38:
                    this.$ = { type: 'UndefinedLiteral', original: undefined, value: undefined, loc: yy.locInfo(this._$) };
                    break;
                case 39:
                    this.$ = { type: 'NullLiteral', original: null, value: null, loc: yy.locInfo(this._$) };
                    break;
                case 40:
                    this.$ = $$[$0];
                    break;
                case 41:
                    this.$ = $$[$0];
                    break;
                case 42:
                    this.$ = yy.preparePath(true, $$[$0], this._$);
                    break;
                case 43:
                    this.$ = yy.preparePath(false, $$[$0], this._$);
                    break;
                case 44:
                    $$[$0 - 2].push({ part: yy.id($$[$0]), original: $$[$0], separator: $$[$0 - 1] });this.$ = $$[$0 - 2];
                    break;
                case 45:
                    this.$ = [{ part: yy.id($$[$0]), original: $$[$0] }];
                    break;
                case 46:
                    this.$ = [];
                    break;
                case 47:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 48:
                    this.$ = [$$[$0]];
                    break;
                case 49:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 50:
                    this.$ = [];
                    break;
                case 51:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 58:
                    this.$ = [];
                    break;
                case 59:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 64:
                    this.$ = [];
                    break;
                case 65:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 70:
                    this.$ = [];
                    break;
                case 71:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 78:
                    this.$ = [];
                    break;
                case 79:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 82:
                    this.$ = [];
                    break;
                case 83:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 86:
                    this.$ = [];
                    break;
                case 87:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 90:
                    this.$ = [];
                    break;
                case 91:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 94:
                    this.$ = [];
                    break;
                case 95:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 98:
                    this.$ = [$$[$0]];
                    break;
                case 99:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 100:
                    this.$ = [$$[$0]];
                    break;
                case 101:
                    $$[$0 - 1].push($$[$0]);
                    break;
            }
        },
        table: [{ 3: 1, 4: 2, 5: [2, 46], 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 1: [3] }, { 5: [1, 4] }, { 5: [2, 2], 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: [1, 12], 15: [1, 20], 16: 17, 19: [1, 23], 24: 15, 27: 16, 29: [1, 21], 34: [1, 22], 39: [2, 2], 44: [2, 2], 47: [2, 2], 48: [1, 13], 51: [1, 14], 55: [1, 18], 59: 19, 60: [1, 24] }, { 1: [2, 1] }, { 5: [2, 47], 14: [2, 47], 15: [2, 47], 19: [2, 47], 29: [2, 47], 34: [2, 47], 39: [2, 47], 44: [2, 47], 47: [2, 47], 48: [2, 47], 51: [2, 47], 55: [2, 47], 60: [2, 47] }, { 5: [2, 3], 14: [2, 3], 15: [2, 3], 19: [2, 3], 29: [2, 3], 34: [2, 3], 39: [2, 3], 44: [2, 3], 47: [2, 3], 48: [2, 3], 51: [2, 3], 55: [2, 3], 60: [2, 3] }, { 5: [2, 4], 14: [2, 4], 15: [2, 4], 19: [2, 4], 29: [2, 4], 34: [2, 4], 39: [2, 4], 44: [2, 4], 47: [2, 4], 48: [2, 4], 51: [2, 4], 55: [2, 4], 60: [2, 4] }, { 5: [2, 5], 14: [2, 5], 15: [2, 5], 19: [2, 5], 29: [2, 5], 34: [2, 5], 39: [2, 5], 44: [2, 5], 47: [2, 5], 48: [2, 5], 51: [2, 5], 55: [2, 5], 60: [2, 5] }, { 5: [2, 6], 14: [2, 6], 15: [2, 6], 19: [2, 6], 29: [2, 6], 34: [2, 6], 39: [2, 6], 44: [2, 6], 47: [2, 6], 48: [2, 6], 51: [2, 6], 55: [2, 6], 60: [2, 6] }, { 5: [2, 7], 14: [2, 7], 15: [2, 7], 19: [2, 7], 29: [2, 7], 34: [2, 7], 39: [2, 7], 44: [2, 7], 47: [2, 7], 48: [2, 7], 51: [2, 7], 55: [2, 7], 60: [2, 7] }, { 5: [2, 8], 14: [2, 8], 15: [2, 8], 19: [2, 8], 29: [2, 8], 34: [2, 8], 39: [2, 8], 44: [2, 8], 47: [2, 8], 48: [2, 8], 51: [2, 8], 55: [2, 8], 60: [2, 8] }, { 5: [2, 9], 14: [2, 9], 15: [2, 9], 19: [2, 9], 29: [2, 9], 34: [2, 9], 39: [2, 9], 44: [2, 9], 47: [2, 9], 48: [2, 9], 51: [2, 9], 55: [2, 9], 60: [2, 9] }, { 20: 25, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 36, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 37, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 39: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 4: 38, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 13: 40, 15: [1, 20], 17: 39 }, { 20: 42, 56: 41, 64: 43, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 45, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 5: [2, 10], 14: [2, 10], 15: [2, 10], 18: [2, 10], 19: [2, 10], 29: [2, 10], 34: [2, 10], 39: [2, 10], 44: [2, 10], 47: [2, 10], 48: [2, 10], 51: [2, 10], 55: [2, 10], 60: [2, 10] }, { 20: 46, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 47, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 48, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 42, 56: 49, 64: 43, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [2, 78], 49: 50, 65: [2, 78], 72: [2, 78], 80: [2, 78], 81: [2, 78], 82: [2, 78], 83: [2, 78], 84: [2, 78], 85: [2, 78] }, { 23: [2, 33], 33: [2, 33], 54: [2, 33], 65: [2, 33], 68: [2, 33], 72: [2, 33], 75: [2, 33], 80: [2, 33], 81: [2, 33], 82: [2, 33], 83: [2, 33], 84: [2, 33], 85: [2, 33] }, { 23: [2, 34], 33: [2, 34], 54: [2, 34], 65: [2, 34], 68: [2, 34], 72: [2, 34], 75: [2, 34], 80: [2, 34], 81: [2, 34], 82: [2, 34], 83: [2, 34], 84: [2, 34], 85: [2, 34] }, { 23: [2, 35], 33: [2, 35], 54: [2, 35], 65: [2, 35], 68: [2, 35], 72: [2, 35], 75: [2, 35], 80: [2, 35], 81: [2, 35], 82: [2, 35], 83: [2, 35], 84: [2, 35], 85: [2, 35] }, { 23: [2, 36], 33: [2, 36], 54: [2, 36], 65: [2, 36], 68: [2, 36], 72: [2, 36], 75: [2, 36], 80: [2, 36], 81: [2, 36], 82: [2, 36], 83: [2, 36], 84: [2, 36], 85: [2, 36] }, { 23: [2, 37], 33: [2, 37], 54: [2, 37], 65: [2, 37], 68: [2, 37], 72: [2, 37], 75: [2, 37], 80: [2, 37], 81: [2, 37], 82: [2, 37], 83: [2, 37], 84: [2, 37], 85: [2, 37] }, { 23: [2, 38], 33: [2, 38], 54: [2, 38], 65: [2, 38], 68: [2, 38], 72: [2, 38], 75: [2, 38], 80: [2, 38], 81: [2, 38], 82: [2, 38], 83: [2, 38], 84: [2, 38], 85: [2, 38] }, { 23: [2, 39], 33: [2, 39], 54: [2, 39], 65: [2, 39], 68: [2, 39], 72: [2, 39], 75: [2, 39], 80: [2, 39], 81: [2, 39], 82: [2, 39], 83: [2, 39], 84: [2, 39], 85: [2, 39] }, { 23: [2, 43], 33: [2, 43], 54: [2, 43], 65: [2, 43], 68: [2, 43], 72: [2, 43], 75: [2, 43], 80: [2, 43], 81: [2, 43], 82: [2, 43], 83: [2, 43], 84: [2, 43], 85: [2, 43], 87: [1, 51] }, { 72: [1, 35], 86: 52 }, { 23: [2, 45], 33: [2, 45], 54: [2, 45], 65: [2, 45], 68: [2, 45], 72: [2, 45], 75: [2, 45], 80: [2, 45], 81: [2, 45], 82: [2, 45], 83: [2, 45], 84: [2, 45], 85: [2, 45], 87: [2, 45] }, { 52: 53, 54: [2, 82], 65: [2, 82], 72: [2, 82], 80: [2, 82], 81: [2, 82], 82: [2, 82], 83: [2, 82], 84: [2, 82], 85: [2, 82] }, { 25: 54, 38: 56, 39: [1, 58], 43: 57, 44: [1, 59], 45: 55, 47: [2, 54] }, { 28: 60, 43: 61, 44: [1, 59], 47: [2, 56] }, { 13: 63, 15: [1, 20], 18: [1, 62] }, { 15: [2, 48], 18: [2, 48] }, { 33: [2, 86], 57: 64, 65: [2, 86], 72: [2, 86], 80: [2, 86], 81: [2, 86], 82: [2, 86], 83: [2, 86], 84: [2, 86], 85: [2, 86] }, { 33: [2, 40], 65: [2, 40], 72: [2, 40], 80: [2, 40], 81: [2, 40], 82: [2, 40], 83: [2, 40], 84: [2, 40], 85: [2, 40] }, { 33: [2, 41], 65: [2, 41], 72: [2, 41], 80: [2, 41], 81: [2, 41], 82: [2, 41], 83: [2, 41], 84: [2, 41], 85: [2, 41] }, { 20: 65, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 26: 66, 47: [1, 67] }, { 30: 68, 33: [2, 58], 65: [2, 58], 72: [2, 58], 75: [2, 58], 80: [2, 58], 81: [2, 58], 82: [2, 58], 83: [2, 58], 84: [2, 58], 85: [2, 58] }, { 33: [2, 64], 35: 69, 65: [2, 64], 72: [2, 64], 75: [2, 64], 80: [2, 64], 81: [2, 64], 82: [2, 64], 83: [2, 64], 84: [2, 64], 85: [2, 64] }, { 21: 70, 23: [2, 50], 65: [2, 50], 72: [2, 50], 80: [2, 50], 81: [2, 50], 82: [2, 50], 83: [2, 50], 84: [2, 50], 85: [2, 50] }, { 33: [2, 90], 61: 71, 65: [2, 90], 72: [2, 90], 80: [2, 90], 81: [2, 90], 82: [2, 90], 83: [2, 90], 84: [2, 90], 85: [2, 90] }, { 20: 75, 33: [2, 80], 50: 72, 63: 73, 64: 76, 65: [1, 44], 69: 74, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 72: [1, 80] }, { 23: [2, 42], 33: [2, 42], 54: [2, 42], 65: [2, 42], 68: [2, 42], 72: [2, 42], 75: [2, 42], 80: [2, 42], 81: [2, 42], 82: [2, 42], 83: [2, 42], 84: [2, 42], 85: [2, 42], 87: [1, 51] }, { 20: 75, 53: 81, 54: [2, 84], 63: 82, 64: 76, 65: [1, 44], 69: 83, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 26: 84, 47: [1, 67] }, { 47: [2, 55] }, { 4: 85, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 39: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 47: [2, 20] }, { 20: 86, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 87, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 26: 88, 47: [1, 67] }, { 47: [2, 57] }, { 5: [2, 11], 14: [2, 11], 15: [2, 11], 19: [2, 11], 29: [2, 11], 34: [2, 11], 39: [2, 11], 44: [2, 11], 47: [2, 11], 48: [2, 11], 51: [2, 11], 55: [2, 11], 60: [2, 11] }, { 15: [2, 49], 18: [2, 49] }, { 20: 75, 33: [2, 88], 58: 89, 63: 90, 64: 76, 65: [1, 44], 69: 91, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 65: [2, 94], 66: 92, 68: [2, 94], 72: [2, 94], 80: [2, 94], 81: [2, 94], 82: [2, 94], 83: [2, 94], 84: [2, 94], 85: [2, 94] }, { 5: [2, 25], 14: [2, 25], 15: [2, 25], 19: [2, 25], 29: [2, 25], 34: [2, 25], 39: [2, 25], 44: [2, 25], 47: [2, 25], 48: [2, 25], 51: [2, 25], 55: [2, 25], 60: [2, 25] }, { 20: 93, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 31: 94, 33: [2, 60], 63: 95, 64: 76, 65: [1, 44], 69: 96, 70: 77, 71: 78, 72: [1, 79], 75: [2, 60], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 33: [2, 66], 36: 97, 63: 98, 64: 76, 65: [1, 44], 69: 99, 70: 77, 71: 78, 72: [1, 79], 75: [2, 66], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 22: 100, 23: [2, 52], 63: 101, 64: 76, 65: [1, 44], 69: 102, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 33: [2, 92], 62: 103, 63: 104, 64: 76, 65: [1, 44], 69: 105, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [1, 106] }, { 33: [2, 79], 65: [2, 79], 72: [2, 79], 80: [2, 79], 81: [2, 79], 82: [2, 79], 83: [2, 79], 84: [2, 79], 85: [2, 79] }, { 33: [2, 81] }, { 23: [2, 27], 33: [2, 27], 54: [2, 27], 65: [2, 27], 68: [2, 27], 72: [2, 27], 75: [2, 27], 80: [2, 27], 81: [2, 27], 82: [2, 27], 83: [2, 27], 84: [2, 27], 85: [2, 27] }, { 23: [2, 28], 33: [2, 28], 54: [2, 28], 65: [2, 28], 68: [2, 28], 72: [2, 28], 75: [2, 28], 80: [2, 28], 81: [2, 28], 82: [2, 28], 83: [2, 28], 84: [2, 28], 85: [2, 28] }, { 23: [2, 30], 33: [2, 30], 54: [2, 30], 68: [2, 30], 71: 107, 72: [1, 108], 75: [2, 30] }, { 23: [2, 98], 33: [2, 98], 54: [2, 98], 68: [2, 98], 72: [2, 98], 75: [2, 98] }, { 23: [2, 45], 33: [2, 45], 54: [2, 45], 65: [2, 45], 68: [2, 45], 72: [2, 45], 73: [1, 109], 75: [2, 45], 80: [2, 45], 81: [2, 45], 82: [2, 45], 83: [2, 45], 84: [2, 45], 85: [2, 45], 87: [2, 45] }, { 23: [2, 44], 33: [2, 44], 54: [2, 44], 65: [2, 44], 68: [2, 44], 72: [2, 44], 75: [2, 44], 80: [2, 44], 81: [2, 44], 82: [2, 44], 83: [2, 44], 84: [2, 44], 85: [2, 44], 87: [2, 44] }, { 54: [1, 110] }, { 54: [2, 83], 65: [2, 83], 72: [2, 83], 80: [2, 83], 81: [2, 83], 82: [2, 83], 83: [2, 83], 84: [2, 83], 85: [2, 83] }, { 54: [2, 85] }, { 5: [2, 13], 14: [2, 13], 15: [2, 13], 19: [2, 13], 29: [2, 13], 34: [2, 13], 39: [2, 13], 44: [2, 13], 47: [2, 13], 48: [2, 13], 51: [2, 13], 55: [2, 13], 60: [2, 13] }, { 38: 56, 39: [1, 58], 43: 57, 44: [1, 59], 45: 112, 46: 111, 47: [2, 76] }, { 33: [2, 70], 40: 113, 65: [2, 70], 72: [2, 70], 75: [2, 70], 80: [2, 70], 81: [2, 70], 82: [2, 70], 83: [2, 70], 84: [2, 70], 85: [2, 70] }, { 47: [2, 18] }, { 5: [2, 14], 14: [2, 14], 15: [2, 14], 19: [2, 14], 29: [2, 14], 34: [2, 14], 39: [2, 14], 44: [2, 14], 47: [2, 14], 48: [2, 14], 51: [2, 14], 55: [2, 14], 60: [2, 14] }, { 33: [1, 114] }, { 33: [2, 87], 65: [2, 87], 72: [2, 87], 80: [2, 87], 81: [2, 87], 82: [2, 87], 83: [2, 87], 84: [2, 87], 85: [2, 87] }, { 33: [2, 89] }, { 20: 75, 63: 116, 64: 76, 65: [1, 44], 67: 115, 68: [2, 96], 69: 117, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [1, 118] }, { 32: 119, 33: [2, 62], 74: 120, 75: [1, 121] }, { 33: [2, 59], 65: [2, 59], 72: [2, 59], 75: [2, 59], 80: [2, 59], 81: [2, 59], 82: [2, 59], 83: [2, 59], 84: [2, 59], 85: [2, 59] }, { 33: [2, 61], 75: [2, 61] }, { 33: [2, 68], 37: 122, 74: 123, 75: [1, 121] }, { 33: [2, 65], 65: [2, 65], 72: [2, 65], 75: [2, 65], 80: [2, 65], 81: [2, 65], 82: [2, 65], 83: [2, 65], 84: [2, 65], 85: [2, 65] }, { 33: [2, 67], 75: [2, 67] }, { 23: [1, 124] }, { 23: [2, 51], 65: [2, 51], 72: [2, 51], 80: [2, 51], 81: [2, 51], 82: [2, 51], 83: [2, 51], 84: [2, 51], 85: [2, 51] }, { 23: [2, 53] }, { 33: [1, 125] }, { 33: [2, 91], 65: [2, 91], 72: [2, 91], 80: [2, 91], 81: [2, 91], 82: [2, 91], 83: [2, 91], 84: [2, 91], 85: [2, 91] }, { 33: [2, 93] }, { 5: [2, 22], 14: [2, 22], 15: [2, 22], 19: [2, 22], 29: [2, 22], 34: [2, 22], 39: [2, 22], 44: [2, 22], 47: [2, 22], 48: [2, 22], 51: [2, 22], 55: [2, 22], 60: [2, 22] }, { 23: [2, 99], 33: [2, 99], 54: [2, 99], 68: [2, 99], 72: [2, 99], 75: [2, 99] }, { 73: [1, 109] }, { 20: 75, 63: 126, 64: 76, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 5: [2, 23], 14: [2, 23], 15: [2, 23], 19: [2, 23], 29: [2, 23], 34: [2, 23], 39: [2, 23], 44: [2, 23], 47: [2, 23], 48: [2, 23], 51: [2, 23], 55: [2, 23], 60: [2, 23] }, { 47: [2, 19] }, { 47: [2, 77] }, { 20: 75, 33: [2, 72], 41: 127, 63: 128, 64: 76, 65: [1, 44], 69: 129, 70: 77, 71: 78, 72: [1, 79], 75: [2, 72], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 5: [2, 24], 14: [2, 24], 15: [2, 24], 19: [2, 24], 29: [2, 24], 34: [2, 24], 39: [2, 24], 44: [2, 24], 47: [2, 24], 48: [2, 24], 51: [2, 24], 55: [2, 24], 60: [2, 24] }, { 68: [1, 130] }, { 65: [2, 95], 68: [2, 95], 72: [2, 95], 80: [2, 95], 81: [2, 95], 82: [2, 95], 83: [2, 95], 84: [2, 95], 85: [2, 95] }, { 68: [2, 97] }, { 5: [2, 21], 14: [2, 21], 15: [2, 21], 19: [2, 21], 29: [2, 21], 34: [2, 21], 39: [2, 21], 44: [2, 21], 47: [2, 21], 48: [2, 21], 51: [2, 21], 55: [2, 21], 60: [2, 21] }, { 33: [1, 131] }, { 33: [2, 63] }, { 72: [1, 133], 76: 132 }, { 33: [1, 134] }, { 33: [2, 69] }, { 15: [2, 12] }, { 14: [2, 26], 15: [2, 26], 19: [2, 26], 29: [2, 26], 34: [2, 26], 47: [2, 26], 48: [2, 26], 51: [2, 26], 55: [2, 26], 60: [2, 26] }, { 23: [2, 31], 33: [2, 31], 54: [2, 31], 68: [2, 31], 72: [2, 31], 75: [2, 31] }, { 33: [2, 74], 42: 135, 74: 136, 75: [1, 121] }, { 33: [2, 71], 65: [2, 71], 72: [2, 71], 75: [2, 71], 80: [2, 71], 81: [2, 71], 82: [2, 71], 83: [2, 71], 84: [2, 71], 85: [2, 71] }, { 33: [2, 73], 75: [2, 73] }, { 23: [2, 29], 33: [2, 29], 54: [2, 29], 65: [2, 29], 68: [2, 29], 72: [2, 29], 75: [2, 29], 80: [2, 29], 81: [2, 29], 82: [2, 29], 83: [2, 29], 84: [2, 29], 85: [2, 29] }, { 14: [2, 15], 15: [2, 15], 19: [2, 15], 29: [2, 15], 34: [2, 15], 39: [2, 15], 44: [2, 15], 47: [2, 15], 48: [2, 15], 51: [2, 15], 55: [2, 15], 60: [2, 15] }, { 72: [1, 138], 77: [1, 137] }, { 72: [2, 100], 77: [2, 100] }, { 14: [2, 16], 15: [2, 16], 19: [2, 16], 29: [2, 16], 34: [2, 16], 44: [2, 16], 47: [2, 16], 48: [2, 16], 51: [2, 16], 55: [2, 16], 60: [2, 16] }, { 33: [1, 139] }, { 33: [2, 75] }, { 33: [2, 32] }, { 72: [2, 101], 77: [2, 101] }, { 14: [2, 17], 15: [2, 17], 19: [2, 17], 29: [2, 17], 34: [2, 17], 39: [2, 17], 44: [2, 17], 47: [2, 17], 48: [2, 17], 51: [2, 17], 55: [2, 17], 60: [2, 17] }],
        defaultActions: { 4: [2, 1], 55: [2, 55], 57: [2, 20], 61: [2, 57], 74: [2, 81], 83: [2, 85], 87: [2, 18], 91: [2, 89], 102: [2, 53], 105: [2, 93], 111: [2, 19], 112: [2, 77], 117: [2, 97], 120: [2, 63], 123: [2, 69], 124: [2, 12], 136: [2, 75], 137: [2, 32] },
        parseError: function parseError(str, hash) {
            throw new Error(str);
        },
        parse: function parse(input) {
            var self = this,
                stack = [0],
                vstack = [null],
                lstack = [],
                table = this.table,
                yytext = "",
                yylineno = 0,
                yyleng = 0,
                recovering = 0,
                TERROR = 2,
                EOF = 1;
            this.lexer.setInput(input);
            this.lexer.yy = this.yy;
            this.yy.lexer = this.lexer;
            this.yy.parser = this;
            if (typeof this.lexer.yylloc == "undefined") this.lexer.yylloc = {};
            var yyloc = this.lexer.yylloc;
            lstack.push(yyloc);
            var ranges = this.lexer.options && this.lexer.options.ranges;
            if (typeof this.yy.parseError === "function") this.parseError = this.yy.parseError;
            function popStack(n) {
                stack.length = stack.length - 2 * n;
                vstack.length = vstack.length - n;
                lstack.length = lstack.length - n;
            }
            function lex() {
                var token;
                token = self.lexer.lex() || 1;
                if (typeof token !== "number") {
                    token = self.symbols_[token] || token;
                }
                return token;
            }
            var symbol,
                preErrorSymbol,
                state,
                action,
                a,
                r,
                yyval = {},
                p,
                len,
                newState,
                expected;
            while (true) {
                state = stack[stack.length - 1];
                if (this.defaultActions[state]) {
                    action = this.defaultActions[state];
                } else {
                    if (symbol === null || typeof symbol == "undefined") {
                        symbol = lex();
                    }
                    action = table[state] && table[state][symbol];
                }
                if (typeof action === "undefined" || !action.length || !action[0]) {
                    var errStr = "";
                    if (!recovering) {
                        expected = [];
                        for (p in table[state]) if (this.terminals_[p] && p > 2) {
                            expected.push("'" + this.terminals_[p] + "'");
                        }
                        if (this.lexer.showPosition) {
                            errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                        } else {
                            errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1 ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
                        }
                        this.parseError(errStr, { text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected });
                    }
                }
                if (action[0] instanceof Array && action.length > 1) {
                    throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
                }
                switch (action[0]) {
                    case 1:
                        stack.push(symbol);
                        vstack.push(this.lexer.yytext);
                        lstack.push(this.lexer.yylloc);
                        stack.push(action[1]);
                        symbol = null;
                        if (!preErrorSymbol) {
                            yyleng = this.lexer.yyleng;
                            yytext = this.lexer.yytext;
                            yylineno = this.lexer.yylineno;
                            yyloc = this.lexer.yylloc;
                            if (recovering > 0) recovering--;
                        } else {
                            symbol = preErrorSymbol;
                            preErrorSymbol = null;
                        }
                        break;
                    case 2:
                        len = this.productions_[action[1]][1];
                        yyval.$ = vstack[vstack.length - len];
                        yyval._$ = { first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column };
                        if (ranges) {
                            yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                        }
                        r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
                        if (typeof r !== "undefined") {
                            return r;
                        }
                        if (len) {
                            stack = stack.slice(0, -1 * len * 2);
                            vstack = vstack.slice(0, -1 * len);
                            lstack = lstack.slice(0, -1 * len);
                        }
                        stack.push(this.productions_[action[1]][0]);
                        vstack.push(yyval.$);
                        lstack.push(yyval._$);
                        newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                        stack.push(newState);
                        break;
                    case 3:
                        return true;
                }
            }
            return true;
        }
    };
    /* Jison generated lexer */
    var lexer = (function () {
        var lexer = { EOF: 1,
            parseError: function parseError(str, hash) {
                if (this.yy.parser) {
                    this.yy.parser.parseError(str, hash);
                } else {
                    throw new Error(str);
                }
            },
            setInput: function setInput(input) {
                this._input = input;
                this._more = this._less = this.done = false;
                this.yylineno = this.yyleng = 0;
                this.yytext = this.matched = this.match = '';
                this.conditionStack = ['INITIAL'];
                this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 };
                if (this.options.ranges) this.yylloc.range = [0, 0];
                this.offset = 0;
                return this;
            },
            input: function input() {
                var ch = this._input[0];
                this.yytext += ch;
                this.yyleng++;
                this.offset++;
                this.match += ch;
                this.matched += ch;
                var lines = ch.match(/(?:\r\n?|\n).*/g);
                if (lines) {
                    this.yylineno++;
                    this.yylloc.last_line++;
                } else {
                    this.yylloc.last_column++;
                }
                if (this.options.ranges) this.yylloc.range[1]++;

                this._input = this._input.slice(1);
                return ch;
            },
            unput: function unput(ch) {
                var len = ch.length;
                var lines = ch.split(/(?:\r\n?|\n)/g);

                this._input = ch + this._input;
                this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
                //this.yyleng -= len;
                this.offset -= len;
                var oldLines = this.match.split(/(?:\r\n?|\n)/g);
                this.match = this.match.substr(0, this.match.length - 1);
                this.matched = this.matched.substr(0, this.matched.length - 1);

                if (lines.length - 1) this.yylineno -= lines.length - 1;
                var r = this.yylloc.range;

                this.yylloc = { first_line: this.yylloc.first_line,
                    last_line: this.yylineno + 1,
                    first_column: this.yylloc.first_column,
                    last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
                };

                if (this.options.ranges) {
                    this.yylloc.range = [r[0], r[0] + this.yyleng - len];
                }
                return this;
            },
            more: function more() {
                this._more = true;
                return this;
            },
            less: function less(n) {
                this.unput(this.match.slice(n));
            },
            pastInput: function pastInput() {
                var past = this.matched.substr(0, this.matched.length - this.match.length);
                return (past.length > 20 ? '...' : '') + past.substr(-20).replace(/\n/g, "");
            },
            upcomingInput: function upcomingInput() {
                var next = this.match;
                if (next.length < 20) {
                    next += this._input.substr(0, 20 - next.length);
                }
                return (next.substr(0, 20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
            },
            showPosition: function showPosition() {
                var pre = this.pastInput();
                var c = new Array(pre.length + 1).join("-");
                return pre + this.upcomingInput() + "\n" + c + "^";
            },
            next: function next() {
                if (this.done) {
                    return this.EOF;
                }
                if (!this._input) this.done = true;

                var token, match, tempMatch, index, col, lines;
                if (!this._more) {
                    this.yytext = '';
                    this.match = '';
                }
                var rules = this._currentRules();
                for (var i = 0; i < rules.length; i++) {
                    tempMatch = this._input.match(this.rules[rules[i]]);
                    if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                        match = tempMatch;
                        index = i;
                        if (!this.options.flex) break;
                    }
                }
                if (match) {
                    lines = match[0].match(/(?:\r\n?|\n).*/g);
                    if (lines) this.yylineno += lines.length;
                    this.yylloc = { first_line: this.yylloc.last_line,
                        last_line: this.yylineno + 1,
                        first_column: this.yylloc.last_column,
                        last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length };
                    this.yytext += match[0];
                    this.match += match[0];
                    this.matches = match;
                    this.yyleng = this.yytext.length;
                    if (this.options.ranges) {
                        this.yylloc.range = [this.offset, this.offset += this.yyleng];
                    }
                    this._more = false;
                    this._input = this._input.slice(match[0].length);
                    this.matched += match[0];
                    token = this.performAction.call(this, this.yy, this, rules[index], this.conditionStack[this.conditionStack.length - 1]);
                    if (this.done && this._input) this.done = false;
                    if (token) return token;else return;
                }
                if (this._input === "") {
                    return this.EOF;
                } else {
                    return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), { text: "", token: null, line: this.yylineno });
                }
            },
            lex: function lex() {
                var r = this.next();
                if (typeof r !== 'undefined') {
                    return r;
                } else {
                    return this.lex();
                }
            },
            begin: function begin(condition) {
                this.conditionStack.push(condition);
            },
            popState: function popState() {
                return this.conditionStack.pop();
            },
            _currentRules: function _currentRules() {
                return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
            },
            topState: function topState() {
                return this.conditionStack[this.conditionStack.length - 2];
            },
            pushState: function begin(condition) {
                this.begin(condition);
            } };
        lexer.options = {};
        lexer.performAction = function anonymous(yy, yy_, $avoiding_name_collisions, YY_START
        /**/) {

            function strip(start, end) {
                return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng - end);
            }

            var YYSTATE = YY_START;
            switch ($avoiding_name_collisions) {
                case 0:
                    if (yy_.yytext.slice(-2) === "\\\\") {
                        strip(0, 1);
                        this.begin("mu");
                    } else if (yy_.yytext.slice(-1) === "\\") {
                        strip(0, 1);
                        this.begin("emu");
                    } else {
                        this.begin("mu");
                    }
                    if (yy_.yytext) return 15;

                    break;
                case 1:
                    return 15;
                    break;
                case 2:
                    this.popState();
                    return 15;

                    break;
                case 3:
                    this.begin('raw');return 15;
                    break;
                case 4:
                    this.popState();
                    // Should be using `this.topState()` below, but it currently
                    // returns the second top instead of the first top. Opened an
                    // issue about it at https://github.com/zaach/jison/issues/291
                    if (this.conditionStack[this.conditionStack.length - 1] === 'raw') {
                        return 15;
                    } else {
                        yy_.yytext = yy_.yytext.substr(5, yy_.yyleng - 9);
                        return 'END_RAW_BLOCK';
                    }

                    break;
                case 5:
                    return 15;
                    break;
                case 6:
                    this.popState();
                    return 14;

                    break;
                case 7:
                    return 65;
                    break;
                case 8:
                    return 68;
                    break;
                case 9:
                    return 19;
                    break;
                case 10:
                    this.popState();
                    this.begin('raw');
                    return 23;

                    break;
                case 11:
                    return 55;
                    break;
                case 12:
                    return 60;
                    break;
                case 13:
                    return 29;
                    break;
                case 14:
                    return 47;
                    break;
                case 15:
                    this.popState();return 44;
                    break;
                case 16:
                    this.popState();return 44;
                    break;
                case 17:
                    return 34;
                    break;
                case 18:
                    return 39;
                    break;
                case 19:
                    return 51;
                    break;
                case 20:
                    return 48;
                    break;
                case 21:
                    this.unput(yy_.yytext);
                    this.popState();
                    this.begin('com');

                    break;
                case 22:
                    this.popState();
                    return 14;

                    break;
                case 23:
                    return 48;
                    break;
                case 24:
                    return 73;
                    break;
                case 25:
                    return 72;
                    break;
                case 26:
                    return 72;
                    break;
                case 27:
                    return 87;
                    break;
                case 28:
                    // ignore whitespace
                    break;
                case 29:
                    this.popState();return 54;
                    break;
                case 30:
                    this.popState();return 33;
                    break;
                case 31:
                    yy_.yytext = strip(1, 2).replace(/\\"/g, '"');return 80;
                    break;
                case 32:
                    yy_.yytext = strip(1, 2).replace(/\\'/g, "'");return 80;
                    break;
                case 33:
                    return 85;
                    break;
                case 34:
                    return 82;
                    break;
                case 35:
                    return 82;
                    break;
                case 36:
                    return 83;
                    break;
                case 37:
                    return 84;
                    break;
                case 38:
                    return 81;
                    break;
                case 39:
                    return 75;
                    break;
                case 40:
                    return 77;
                    break;
                case 41:
                    return 72;
                    break;
                case 42:
                    yy_.yytext = yy_.yytext.replace(/\\([\\\]])/g, '$1');return 72;
                    break;
                case 43:
                    return 'INVALID';
                    break;
                case 44:
                    return 5;
                    break;
            }
        };
        lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/, /^(?:[^\x00]+)/, /^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/, /^(?:\{\{\{\{(?=[^\/]))/, /^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/, /^(?:[^\x00]*?(?=(\{\{\{\{)))/, /^(?:[\s\S]*?--(~)?\}\})/, /^(?:\()/, /^(?:\))/, /^(?:\{\{\{\{)/, /^(?:\}\}\}\})/, /^(?:\{\{(~)?>)/, /^(?:\{\{(~)?#>)/, /^(?:\{\{(~)?#\*?)/, /^(?:\{\{(~)?\/)/, /^(?:\{\{(~)?\^\s*(~)?\}\})/, /^(?:\{\{(~)?\s*else\s*(~)?\}\})/, /^(?:\{\{(~)?\^)/, /^(?:\{\{(~)?\s*else\b)/, /^(?:\{\{(~)?\{)/, /^(?:\{\{(~)?&)/, /^(?:\{\{(~)?!--)/, /^(?:\{\{(~)?![\s\S]*?\}\})/, /^(?:\{\{(~)?\*?)/, /^(?:=)/, /^(?:\.\.)/, /^(?:\.(?=([=~}\s\/.)|])))/, /^(?:[\/.])/, /^(?:\s+)/, /^(?:\}(~)?\}\})/, /^(?:(~)?\}\})/, /^(?:"(\\["]|[^"])*")/, /^(?:'(\\[']|[^'])*')/, /^(?:@)/, /^(?:true(?=([~}\s)])))/, /^(?:false(?=([~}\s)])))/, /^(?:undefined(?=([~}\s)])))/, /^(?:null(?=([~}\s)])))/, /^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/, /^(?:as\s+\|)/, /^(?:\|)/, /^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/, /^(?:\[(\\\]|[^\]])*\])/, /^(?:.)/, /^(?:$)/];
        lexer.conditions = { "mu": { "rules": [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44], "inclusive": false }, "emu": { "rules": [2], "inclusive": false }, "com": { "rules": [6], "inclusive": false }, "raw": { "rules": [3, 4, 5], "inclusive": false }, "INITIAL": { "rules": [0, 1, 44], "inclusive": true } };
        return lexer;
    })();
    parser.lexer = lexer;
    function Parser() {
        this.yy = {};
    }Parser.prototype = parser;parser.Parser = Parser;
    return new Parser();
})();exports.__esModule = true;
exports['default'] = handlebars;


},{}],56:[function(require,module,exports){
/* eslint-disable new-cap */
'use strict';

exports.__esModule = true;
exports.print = print;
exports.PrintVisitor = PrintVisitor;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _visitor = require('./visitor');

var _visitor2 = _interopRequireDefault(_visitor);

function print(ast) {
  return new PrintVisitor().accept(ast);
}

function PrintVisitor() {
  this.padding = 0;
}

PrintVisitor.prototype = new _visitor2['default']();

PrintVisitor.prototype.pad = function (string) {
  var out = '';

  for (var i = 0, l = this.padding; i < l; i++) {
    out += '  ';
  }

  out += string + '\n';
  return out;
};

PrintVisitor.prototype.Program = function (program) {
  var out = '',
      body = program.body,
      i = undefined,
      l = undefined;

  if (program.blockParams) {
    var blockParams = 'BLOCK PARAMS: [';
    for (i = 0, l = program.blockParams.length; i < l; i++) {
      blockParams += ' ' + program.blockParams[i];
    }
    blockParams += ' ]';
    out += this.pad(blockParams);
  }

  for (i = 0, l = body.length; i < l; i++) {
    out += this.accept(body[i]);
  }

  this.padding--;

  return out;
};

PrintVisitor.prototype.MustacheStatement = function (mustache) {
  return this.pad('{{ ' + this.SubExpression(mustache) + ' }}');
};
PrintVisitor.prototype.Decorator = function (mustache) {
  return this.pad('{{ DIRECTIVE ' + this.SubExpression(mustache) + ' }}');
};

PrintVisitor.prototype.BlockStatement = PrintVisitor.prototype.DecoratorBlock = function (block) {
  var out = '';

  out += this.pad((block.type === 'DecoratorBlock' ? 'DIRECTIVE ' : '') + 'BLOCK:');
  this.padding++;
  out += this.pad(this.SubExpression(block));
  if (block.program) {
    out += this.pad('PROGRAM:');
    this.padding++;
    out += this.accept(block.program);
    this.padding--;
  }
  if (block.inverse) {
    if (block.program) {
      this.padding++;
    }
    out += this.pad('{{^}}');
    this.padding++;
    out += this.accept(block.inverse);
    this.padding--;
    if (block.program) {
      this.padding--;
    }
  }
  this.padding--;

  return out;
};

PrintVisitor.prototype.PartialStatement = function (partial) {
  var content = 'PARTIAL:' + partial.name.original;
  if (partial.params[0]) {
    content += ' ' + this.accept(partial.params[0]);
  }
  if (partial.hash) {
    content += ' ' + this.accept(partial.hash);
  }
  return this.pad('{{> ' + content + ' }}');
};
PrintVisitor.prototype.PartialBlockStatement = function (partial) {
  var content = 'PARTIAL BLOCK:' + partial.name.original;
  if (partial.params[0]) {
    content += ' ' + this.accept(partial.params[0]);
  }
  if (partial.hash) {
    content += ' ' + this.accept(partial.hash);
  }

  content += ' ' + this.pad('PROGRAM:');
  this.padding++;
  content += this.accept(partial.program);
  this.padding--;

  return this.pad('{{> ' + content + ' }}');
};

PrintVisitor.prototype.ContentStatement = function (content) {
  return this.pad("CONTENT[ '" + content.value + "' ]");
};

PrintVisitor.prototype.CommentStatement = function (comment) {
  return this.pad("{{! '" + comment.value + "' }}");
};

PrintVisitor.prototype.SubExpression = function (sexpr) {
  var params = sexpr.params,
      paramStrings = [],
      hash = undefined;

  for (var i = 0, l = params.length; i < l; i++) {
    paramStrings.push(this.accept(params[i]));
  }

  params = '[' + paramStrings.join(', ') + ']';

  hash = sexpr.hash ? ' ' + this.accept(sexpr.hash) : '';

  return this.accept(sexpr.path) + ' ' + params + hash;
};

PrintVisitor.prototype.PathExpression = function (id) {
  var path = id.parts.join('/');
  return (id.data ? '@' : '') + 'PATH:' + path;
};

PrintVisitor.prototype.StringLiteral = function (string) {
  return '"' + string.value + '"';
};

PrintVisitor.prototype.NumberLiteral = function (number) {
  return 'NUMBER{' + number.value + '}';
};

PrintVisitor.prototype.BooleanLiteral = function (bool) {
  return 'BOOLEAN{' + bool.value + '}';
};

PrintVisitor.prototype.UndefinedLiteral = function () {
  return 'UNDEFINED';
};

PrintVisitor.prototype.NullLiteral = function () {
  return 'NULL';
};

PrintVisitor.prototype.Hash = function (hash) {
  var pairs = hash.pairs,
      joinedPairs = [];

  for (var i = 0, l = pairs.length; i < l; i++) {
    joinedPairs.push(this.accept(pairs[i]));
  }

  return 'HASH{' + joinedPairs.join(', ') + '}';
};
PrintVisitor.prototype.HashPair = function (pair) {
  return pair.key + '=' + this.accept(pair.value);
};
/* eslint-enable new-cap */


},{"./visitor":57}],57:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

function Visitor() {
  this.parents = [];
}

Visitor.prototype = {
  constructor: Visitor,
  mutating: false,

  // Visits a given value. If mutating, will replace the value if necessary.
  acceptKey: function acceptKey(node, name) {
    var value = this.accept(node[name]);
    if (this.mutating) {
      // Hacky sanity check: This may have a few false positives for type for the helper
      // methods but will generally do the right thing without a lot of overhead.
      if (value && !Visitor.prototype[value.type]) {
        throw new _exception2['default']('Unexpected node type "' + value.type + '" found when accepting ' + name + ' on ' + node.type);
      }
      node[name] = value;
    }
  },

  // Performs an accept operation with added sanity check to ensure
  // required keys are not removed.
  acceptRequired: function acceptRequired(node, name) {
    this.acceptKey(node, name);

    if (!node[name]) {
      throw new _exception2['default'](node.type + ' requires ' + name);
    }
  },

  // Traverses a given array. If mutating, empty respnses will be removed
  // for child elements.
  acceptArray: function acceptArray(array) {
    for (var i = 0, l = array.length; i < l; i++) {
      this.acceptKey(array, i);

      if (!array[i]) {
        array.splice(i, 1);
        i--;
        l--;
      }
    }
  },

  accept: function accept(object) {
    if (!object) {
      return;
    }

    /* istanbul ignore next: Sanity code */
    if (!this[object.type]) {
      throw new _exception2['default']('Unknown type: ' + object.type, object);
    }

    if (this.current) {
      this.parents.unshift(this.current);
    }
    this.current = object;

    var ret = this[object.type](object);

    this.current = this.parents.shift();

    if (!this.mutating || ret) {
      return ret;
    } else if (ret !== false) {
      return object;
    }
  },

  Program: function Program(program) {
    this.acceptArray(program.body);
  },

  MustacheStatement: visitSubExpression,
  Decorator: visitSubExpression,

  BlockStatement: visitBlock,
  DecoratorBlock: visitBlock,

  PartialStatement: visitPartial,
  PartialBlockStatement: function PartialBlockStatement(partial) {
    visitPartial.call(this, partial);

    this.acceptKey(partial, 'program');
  },

  ContentStatement: function ContentStatement() /* content */{},
  CommentStatement: function CommentStatement() /* comment */{},

  SubExpression: visitSubExpression,

  PathExpression: function PathExpression() /* path */{},

  StringLiteral: function StringLiteral() /* string */{},
  NumberLiteral: function NumberLiteral() /* number */{},
  BooleanLiteral: function BooleanLiteral() /* bool */{},
  UndefinedLiteral: function UndefinedLiteral() /* literal */{},
  NullLiteral: function NullLiteral() /* literal */{},

  Hash: function Hash(hash) {
    this.acceptArray(hash.pairs);
  },
  HashPair: function HashPair(pair) {
    this.acceptRequired(pair, 'value');
  }
};

function visitSubExpression(mustache) {
  this.acceptRequired(mustache, 'path');
  this.acceptArray(mustache.params);
  this.acceptKey(mustache, 'hash');
}
function visitBlock(block) {
  visitSubExpression.call(this, block);

  this.acceptKey(block, 'program');
  this.acceptKey(block, 'inverse');
}
function visitPartial(partial) {
  this.acceptRequired(partial, 'name');
  this.acceptArray(partial.params);
  this.acceptKey(partial, 'hash');
}

exports['default'] = Visitor;
module.exports = exports['default'];


},{"../exception":61}],58:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _visitor = require('./visitor');

var _visitor2 = _interopRequireDefault(_visitor);

function WhitespaceControl() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  this.options = options;
}
WhitespaceControl.prototype = new _visitor2['default']();

WhitespaceControl.prototype.Program = function (program) {
  var doStandalone = !this.options.ignoreStandalone;

  var isRoot = !this.isRootSeen;
  this.isRootSeen = true;

  var body = program.body;
  for (var i = 0, l = body.length; i < l; i++) {
    var current = body[i],
        strip = this.accept(current);

    if (!strip) {
      continue;
    }

    var _isPrevWhitespace = isPrevWhitespace(body, i, isRoot),
        _isNextWhitespace = isNextWhitespace(body, i, isRoot),
        openStandalone = strip.openStandalone && _isPrevWhitespace,
        closeStandalone = strip.closeStandalone && _isNextWhitespace,
        inlineStandalone = strip.inlineStandalone && _isPrevWhitespace && _isNextWhitespace;

    if (strip.close) {
      omitRight(body, i, true);
    }
    if (strip.open) {
      omitLeft(body, i, true);
    }

    if (doStandalone && inlineStandalone) {
      omitRight(body, i);

      if (omitLeft(body, i)) {
        // If we are on a standalone node, save the indent info for partials
        if (current.type === 'PartialStatement') {
          // Pull out the whitespace from the final line
          current.indent = /([ \t]+$)/.exec(body[i - 1].original)[1];
        }
      }
    }
    if (doStandalone && openStandalone) {
      omitRight((current.program || current.inverse).body);

      // Strip out the previous content node if it's whitespace only
      omitLeft(body, i);
    }
    if (doStandalone && closeStandalone) {
      // Always strip the next node
      omitRight(body, i);

      omitLeft((current.inverse || current.program).body);
    }
  }

  return program;
};

WhitespaceControl.prototype.BlockStatement = WhitespaceControl.prototype.DecoratorBlock = WhitespaceControl.prototype.PartialBlockStatement = function (block) {
  this.accept(block.program);
  this.accept(block.inverse);

  // Find the inverse program that is involed with whitespace stripping.
  var program = block.program || block.inverse,
      inverse = block.program && block.inverse,
      firstInverse = inverse,
      lastInverse = inverse;

  if (inverse && inverse.chained) {
    firstInverse = inverse.body[0].program;

    // Walk the inverse chain to find the last inverse that is actually in the chain.
    while (lastInverse.chained) {
      lastInverse = lastInverse.body[lastInverse.body.length - 1].program;
    }
  }

  var strip = {
    open: block.openStrip.open,
    close: block.closeStrip.close,

    // Determine the standalone candiacy. Basically flag our content as being possibly standalone
    // so our parent can determine if we actually are standalone
    openStandalone: isNextWhitespace(program.body),
    closeStandalone: isPrevWhitespace((firstInverse || program).body)
  };

  if (block.openStrip.close) {
    omitRight(program.body, null, true);
  }

  if (inverse) {
    var inverseStrip = block.inverseStrip;

    if (inverseStrip.open) {
      omitLeft(program.body, null, true);
    }

    if (inverseStrip.close) {
      omitRight(firstInverse.body, null, true);
    }
    if (block.closeStrip.open) {
      omitLeft(lastInverse.body, null, true);
    }

    // Find standalone else statments
    if (!this.options.ignoreStandalone && isPrevWhitespace(program.body) && isNextWhitespace(firstInverse.body)) {
      omitLeft(program.body);
      omitRight(firstInverse.body);
    }
  } else if (block.closeStrip.open) {
    omitLeft(program.body, null, true);
  }

  return strip;
};

WhitespaceControl.prototype.Decorator = WhitespaceControl.prototype.MustacheStatement = function (mustache) {
  return mustache.strip;
};

WhitespaceControl.prototype.PartialStatement = WhitespaceControl.prototype.CommentStatement = function (node) {
  /* istanbul ignore next */
  var strip = node.strip || {};
  return {
    inlineStandalone: true,
    open: strip.open,
    close: strip.close
  };
};

function isPrevWhitespace(body, i, isRoot) {
  if (i === undefined) {
    i = body.length;
  }

  // Nodes that end with newlines are considered whitespace (but are special
  // cased for strip operations)
  var prev = body[i - 1],
      sibling = body[i - 2];
  if (!prev) {
    return isRoot;
  }

  if (prev.type === 'ContentStatement') {
    return (sibling || !isRoot ? /\r?\n\s*?$/ : /(^|\r?\n)\s*?$/).test(prev.original);
  }
}
function isNextWhitespace(body, i, isRoot) {
  if (i === undefined) {
    i = -1;
  }

  var next = body[i + 1],
      sibling = body[i + 2];
  if (!next) {
    return isRoot;
  }

  if (next.type === 'ContentStatement') {
    return (sibling || !isRoot ? /^\s*?\r?\n/ : /^\s*?(\r?\n|$)/).test(next.original);
  }
}

// Marks the node to the right of the position as omitted.
// I.e. {{foo}}' ' will mark the ' ' node as omitted.
//
// If i is undefined, then the first child will be marked as such.
//
// If mulitple is truthy then all whitespace will be stripped out until non-whitespace
// content is met.
function omitRight(body, i, multiple) {
  var current = body[i == null ? 0 : i + 1];
  if (!current || current.type !== 'ContentStatement' || !multiple && current.rightStripped) {
    return;
  }

  var original = current.value;
  current.value = current.value.replace(multiple ? /^\s+/ : /^[ \t]*\r?\n?/, '');
  current.rightStripped = current.value !== original;
}

// Marks the node to the left of the position as omitted.
// I.e. ' '{{foo}} will mark the ' ' node as omitted.
//
// If i is undefined then the last child will be marked as such.
//
// If mulitple is truthy then all whitespace will be stripped out until non-whitespace
// content is met.
function omitLeft(body, i, multiple) {
  var current = body[i == null ? body.length - 1 : i - 1];
  if (!current || current.type !== 'ContentStatement' || !multiple && current.leftStripped) {
    return;
  }

  // We omit the last node if it's whitespace only and not preceeded by a non-content node.
  var original = current.value;
  current.value = current.value.replace(multiple ? /\s+$/ : /[ \t]+$/, '');
  current.leftStripped = current.value !== original;
  return current.leftStripped;
}

exports['default'] = WhitespaceControl;
module.exports = exports['default'];


},{"./visitor":57}],59:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.registerDefaultDecorators = registerDefaultDecorators;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _decoratorsInline = require('./decorators/inline');

var _decoratorsInline2 = _interopRequireDefault(_decoratorsInline);

function registerDefaultDecorators(instance) {
  _decoratorsInline2['default'](instance);
}


},{"./decorators/inline":60}],60:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerDecorator('inline', function (fn, props, container, options) {
    var ret = fn;
    if (!props.partials) {
      props.partials = {};
      ret = function (context, options) {
        // Create a new partials stack frame prior to exec.
        var original = container.partials;
        container.partials = _utils.extend({}, original, props.partials);
        var ret = fn(context, options);
        container.partials = original;
        return ret;
      };
    }

    props.partials[options.args[0]] = options.fn;

    return ret;
  });
};

module.exports = exports['default'];


},{"../utils":74}],61:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var loc = node && node.loc,
      line = undefined,
      column = undefined;
  if (loc) {
    line = loc.start.line;
    column = loc.start.column;

    message += ' - ' + line + ':' + column;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  /* istanbul ignore else */
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, Exception);
  }

  if (loc) {
    this.lineNumber = line;
    this.column = column;
  }
}

Exception.prototype = new Error();

exports['default'] = Exception;
module.exports = exports['default'];


},{}],62:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.registerDefaultHelpers = registerDefaultHelpers;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _helpersBlockHelperMissing = require('./helpers/block-helper-missing');

var _helpersBlockHelperMissing2 = _interopRequireDefault(_helpersBlockHelperMissing);

var _helpersEach = require('./helpers/each');

var _helpersEach2 = _interopRequireDefault(_helpersEach);

var _helpersHelperMissing = require('./helpers/helper-missing');

var _helpersHelperMissing2 = _interopRequireDefault(_helpersHelperMissing);

var _helpersIf = require('./helpers/if');

var _helpersIf2 = _interopRequireDefault(_helpersIf);

var _helpersLog = require('./helpers/log');

var _helpersLog2 = _interopRequireDefault(_helpersLog);

var _helpersLookup = require('./helpers/lookup');

var _helpersLookup2 = _interopRequireDefault(_helpersLookup);

var _helpersWith = require('./helpers/with');

var _helpersWith2 = _interopRequireDefault(_helpersWith);

function registerDefaultHelpers(instance) {
  _helpersBlockHelperMissing2['default'](instance);
  _helpersEach2['default'](instance);
  _helpersHelperMissing2['default'](instance);
  _helpersIf2['default'](instance);
  _helpersLog2['default'](instance);
  _helpersLookup2['default'](instance);
  _helpersWith2['default'](instance);
}


},{"./helpers/block-helper-missing":63,"./helpers/each":64,"./helpers/helper-missing":65,"./helpers/if":66,"./helpers/log":67,"./helpers/lookup":68,"./helpers/with":69}],63:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerHelper('blockHelperMissing', function (context, options) {
    var inverse = options.inverse,
        fn = options.fn;

    if (context === true) {
      return fn(this);
    } else if (context === false || context == null) {
      return inverse(this);
    } else if (_utils.isArray(context)) {
      if (context.length > 0) {
        if (options.ids) {
          options.ids = [options.name];
        }

        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      if (options.data && options.ids) {
        var data = _utils.createFrame(options.data);
        data.contextPath = _utils.appendContextPath(options.data.contextPath, options.name);
        options = { data: data };
      }

      return fn(context, options);
    }
  });
};

module.exports = exports['default'];


},{"../utils":74}],64:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('../utils');

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

exports['default'] = function (instance) {
  instance.registerHelper('each', function (context, options) {
    if (!options) {
      throw new _exception2['default']('Must pass iterator to #each');
    }

    var fn = options.fn,
        inverse = options.inverse,
        i = 0,
        ret = '',
        data = undefined,
        contextPath = undefined;

    if (options.data && options.ids) {
      contextPath = _utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
    }

    if (_utils.isFunction(context)) {
      context = context.call(this);
    }

    if (options.data) {
      data = _utils.createFrame(options.data);
    }

    function execIteration(field, index, last) {
      if (data) {
        data.key = field;
        data.index = index;
        data.first = index === 0;
        data.last = !!last;

        if (contextPath) {
          data.contextPath = contextPath + field;
        }
      }

      ret = ret + fn(context[field], {
        data: data,
        blockParams: _utils.blockParams([context[field], field], [contextPath + field, null])
      });
    }

    if (context && typeof context === 'object') {
      if (_utils.isArray(context)) {
        for (var j = context.length; i < j; i++) {
          if (i in context) {
            execIteration(i, i, i === context.length - 1);
          }
        }
      } else {
        var priorKey = undefined;

        for (var key in context) {
          if (context.hasOwnProperty(key)) {
            // We're running the iterations one step out of sync so we can detect
            // the last iteration without have to scan the object twice and create
            // an itermediate keys array.
            if (priorKey !== undefined) {
              execIteration(priorKey, i - 1);
            }
            priorKey = key;
            i++;
          }
        }
        if (priorKey !== undefined) {
          execIteration(priorKey, i - 1, true);
        }
      }
    }

    if (i === 0) {
      ret = inverse(this);
    }

    return ret;
  });
};

module.exports = exports['default'];


},{"../exception":61,"../utils":74}],65:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

exports['default'] = function (instance) {
  instance.registerHelper('helperMissing', function () /* [args, ]options */{
    if (arguments.length === 1) {
      // A missing field in a {{foo}} construct.
      return undefined;
    } else {
      // Someone is actually trying to call something, blow up.
      throw new _exception2['default']('Missing helper: "' + arguments[arguments.length - 1].name + '"');
    }
  });
};

module.exports = exports['default'];


},{"../exception":61}],66:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerHelper('if', function (conditional, options) {
    if (_utils.isFunction(conditional)) {
      conditional = conditional.call(this);
    }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if (!options.hash.includeZero && !conditional || _utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function (conditional, options) {
    return instance.helpers['if'].call(this, conditional, { fn: options.inverse, inverse: options.fn, hash: options.hash });
  });
};

module.exports = exports['default'];


},{"../utils":74}],67:[function(require,module,exports){
'use strict';

exports.__esModule = true;

exports['default'] = function (instance) {
  instance.registerHelper('log', function () /* message, options */{
    var args = [undefined],
        options = arguments[arguments.length - 1];
    for (var i = 0; i < arguments.length - 1; i++) {
      args.push(arguments[i]);
    }

    var level = 1;
    if (options.hash.level != null) {
      level = options.hash.level;
    } else if (options.data && options.data.level != null) {
      level = options.data.level;
    }
    args[0] = level;

    instance.log.apply(instance, args);
  });
};

module.exports = exports['default'];


},{}],68:[function(require,module,exports){
'use strict';

exports.__esModule = true;

exports['default'] = function (instance) {
  instance.registerHelper('lookup', function (obj, field) {
    return obj && obj[field];
  });
};

module.exports = exports['default'];


},{}],69:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerHelper('with', function (context, options) {
    if (_utils.isFunction(context)) {
      context = context.call(this);
    }

    var fn = options.fn;

    if (!_utils.isEmpty(context)) {
      var data = options.data;
      if (options.data && options.ids) {
        data = _utils.createFrame(options.data);
        data.contextPath = _utils.appendContextPath(options.data.contextPath, options.ids[0]);
      }

      return fn(context, {
        data: data,
        blockParams: _utils.blockParams([context], [data && data.contextPath])
      });
    } else {
      return options.inverse(this);
    }
  });
};

module.exports = exports['default'];


},{"../utils":74}],70:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('./utils');

var logger = {
  methodMap: ['debug', 'info', 'warn', 'error'],
  level: 'info',

  // Maps a given level value to the `methodMap` indexes above.
  lookupLevel: function lookupLevel(level) {
    if (typeof level === 'string') {
      var levelMap = _utils.indexOf(logger.methodMap, level.toLowerCase());
      if (levelMap >= 0) {
        level = levelMap;
      } else {
        level = parseInt(level, 10);
      }
    }

    return level;
  },

  // Can be overridden in the host environment
  log: function log(level) {
    level = logger.lookupLevel(level);

    if (typeof console !== 'undefined' && logger.lookupLevel(logger.level) <= level) {
      var method = logger.methodMap[level];
      if (!console[method]) {
        // eslint-disable-line no-console
        method = 'log';
      }

      for (var _len = arguments.length, message = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        message[_key - 1] = arguments[_key];
      }

      console[method].apply(console, message); // eslint-disable-line no-console
    }
  }
};

exports['default'] = logger;
module.exports = exports['default'];


},{"./utils":74}],71:[function(require,module,exports){
(function (global){
/* global window */
'use strict';

exports.__esModule = true;

exports['default'] = function (Handlebars) {
  /* istanbul ignore next */
  var root = typeof global !== 'undefined' ? global : window,
      $Handlebars = root.Handlebars;
  /* istanbul ignore next */
  Handlebars.noConflict = function () {
    if (root.Handlebars === Handlebars) {
      root.Handlebars = $Handlebars;
    }
    return Handlebars;
  };
};

module.exports = exports['default'];


}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],72:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.checkRevision = checkRevision;
exports.template = template;
exports.wrapProgram = wrapProgram;
exports.resolvePartial = resolvePartial;
exports.invokePartial = invokePartial;
exports.noop = noop;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _utils = require('./utils');

var Utils = _interopRequireWildcard(_utils);

var _exception = require('./exception');

var _exception2 = _interopRequireDefault(_exception);

var _base = require('./base');

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = _base.COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = _base.REVISION_CHANGES[currentRevision],
          compilerVersions = _base.REVISION_CHANGES[compilerRevision];
      throw new _exception2['default']('Template was precompiled with an older version of Handlebars than the current runtime. ' + 'Please update your precompiler to a newer version (' + runtimeVersions + ') or downgrade your runtime to an older version (' + compilerVersions + ').');
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new _exception2['default']('Template was precompiled with a newer version of Handlebars than the current runtime. ' + 'Please update your runtime to a newer version (' + compilerInfo[1] + ').');
    }
  }
}

function template(templateSpec, env) {
  /* istanbul ignore next */
  if (!env) {
    throw new _exception2['default']('No environment passed to template');
  }
  if (!templateSpec || !templateSpec.main) {
    throw new _exception2['default']('Unknown template object: ' + typeof templateSpec);
  }

  templateSpec.main.decorator = templateSpec.main_d;

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  env.VM.checkRevision(templateSpec.compiler);

  function invokePartialWrapper(partial, context, options) {
    if (options.hash) {
      context = Utils.extend({}, context, options.hash);
      if (options.ids) {
        options.ids[0] = true;
      }
    }

    partial = env.VM.resolvePartial.call(this, partial, context, options);
    var result = env.VM.invokePartial.call(this, partial, context, options);

    if (result == null && env.compile) {
      options.partials[options.name] = env.compile(partial, templateSpec.compilerOptions, env);
      result = options.partials[options.name](context, options);
    }
    if (result != null) {
      if (options.indent) {
        var lines = result.split('\n');
        for (var i = 0, l = lines.length; i < l; i++) {
          if (!lines[i] && i + 1 === l) {
            break;
          }

          lines[i] = options.indent + lines[i];
        }
        result = lines.join('\n');
      }
      return result;
    } else {
      throw new _exception2['default']('The partial ' + options.name + ' could not be compiled when running in runtime-only mode');
    }
  }

  // Just add water
  var container = {
    strict: function strict(obj, name) {
      if (!(name in obj)) {
        throw new _exception2['default']('"' + name + '" not defined in ' + obj);
      }
      return obj[name];
    },
    lookup: function lookup(depths, name) {
      var len = depths.length;
      for (var i = 0; i < len; i++) {
        if (depths[i] && depths[i][name] != null) {
          return depths[i][name];
        }
      }
    },
    lambda: function lambda(current, context) {
      return typeof current === 'function' ? current.call(context) : current;
    },

    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,

    fn: function fn(i) {
      var ret = templateSpec[i];
      ret.decorator = templateSpec[i + '_d'];
      return ret;
    },

    programs: [],
    program: function program(i, data, declaredBlockParams, blockParams, depths) {
      var programWrapper = this.programs[i],
          fn = this.fn(i);
      if (data || depths || blockParams || declaredBlockParams) {
        programWrapper = wrapProgram(this, i, fn, data, declaredBlockParams, blockParams, depths);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = wrapProgram(this, i, fn);
      }
      return programWrapper;
    },

    data: function data(value, depth) {
      while (value && depth--) {
        value = value._parent;
      }
      return value;
    },
    merge: function merge(param, common) {
      var obj = param || common;

      if (param && common && param !== common) {
        obj = Utils.extend({}, common, param);
      }

      return obj;
    },

    noop: env.VM.noop,
    compilerInfo: templateSpec.compiler
  };

  function ret(context) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var data = options.data;

    ret._setup(options);
    if (!options.partial && templateSpec.useData) {
      data = initData(context, data);
    }
    var depths = undefined,
        blockParams = templateSpec.useBlockParams ? [] : undefined;
    if (templateSpec.useDepths) {
      if (options.depths) {
        depths = context !== options.depths[0] ? [context].concat(options.depths) : options.depths;
      } else {
        depths = [context];
      }
    }

    function main(context /*, options*/) {
      return '' + templateSpec.main(container, context, container.helpers, container.partials, data, blockParams, depths);
    }
    main = executeDecorators(templateSpec.main, main, container, options.depths || [], data, blockParams);
    return main(context, options);
  }
  ret.isTop = true;

  ret._setup = function (options) {
    if (!options.partial) {
      container.helpers = container.merge(options.helpers, env.helpers);

      if (templateSpec.usePartial) {
        container.partials = container.merge(options.partials, env.partials);
      }
      if (templateSpec.usePartial || templateSpec.useDecorators) {
        container.decorators = container.merge(options.decorators, env.decorators);
      }
    } else {
      container.helpers = options.helpers;
      container.partials = options.partials;
      container.decorators = options.decorators;
    }
  };

  ret._child = function (i, data, blockParams, depths) {
    if (templateSpec.useBlockParams && !blockParams) {
      throw new _exception2['default']('must pass block params');
    }
    if (templateSpec.useDepths && !depths) {
      throw new _exception2['default']('must pass parent depths');
    }

    return wrapProgram(container, i, templateSpec[i], data, 0, blockParams, depths);
  };
  return ret;
}

function wrapProgram(container, i, fn, data, declaredBlockParams, blockParams, depths) {
  function prog(context) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var currentDepths = depths;
    if (depths && context !== depths[0]) {
      currentDepths = [context].concat(depths);
    }

    return fn(container, context, container.helpers, container.partials, options.data || data, blockParams && [options.blockParams].concat(blockParams), currentDepths);
  }

  prog = executeDecorators(fn, prog, container, depths, data, blockParams);

  prog.program = i;
  prog.depth = depths ? depths.length : 0;
  prog.blockParams = declaredBlockParams || 0;
  return prog;
}

function resolvePartial(partial, context, options) {
  if (!partial) {
    if (options.name === '@partial-block') {
      partial = options.data['partial-block'];
    } else {
      partial = options.partials[options.name];
    }
  } else if (!partial.call && !options.name) {
    // This is a dynamic partial that returned a string
    options.name = partial;
    partial = options.partials[partial];
  }
  return partial;
}

function invokePartial(partial, context, options) {
  options.partial = true;
  if (options.ids) {
    options.data.contextPath = options.ids[0] || options.data.contextPath;
  }

  var partialBlock = undefined;
  if (options.fn && options.fn !== noop) {
    options.data = _base.createFrame(options.data);
    partialBlock = options.data['partial-block'] = options.fn;

    if (partialBlock.partials) {
      options.partials = Utils.extend({}, options.partials, partialBlock.partials);
    }
  }

  if (partial === undefined && partialBlock) {
    partial = partialBlock;
  }

  if (partial === undefined) {
    throw new _exception2['default']('The partial ' + options.name + ' could not be found');
  } else if (partial instanceof Function) {
    return partial(context, options);
  }
}

function noop() {
  return '';
}

function initData(context, data) {
  if (!data || !('root' in data)) {
    data = data ? _base.createFrame(data) : {};
    data.root = context;
  }
  return data;
}

function executeDecorators(fn, prog, container, depths, data, blockParams) {
  if (fn.decorator) {
    var props = {};
    prog = fn.decorator(prog, props, container, depths && depths[0], data, blockParams, depths);
    Utils.extend(prog, props);
  }
  return prog;
}


},{"./base":48,"./exception":61,"./utils":74}],73:[function(require,module,exports){
// Build out our basic SafeString type
'use strict';

exports.__esModule = true;
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = SafeString.prototype.toHTML = function () {
  return '' + this.string;
};

exports['default'] = SafeString;
module.exports = exports['default'];


},{}],74:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.extend = extend;
exports.indexOf = indexOf;
exports.escapeExpression = escapeExpression;
exports.isEmpty = isEmpty;
exports.createFrame = createFrame;
exports.blockParams = blockParams;
exports.appendContextPath = appendContextPath;
var escape = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

var badChars = /[&<>"'`=]/g,
    possible = /[&<>"'`=]/;

function escapeChar(chr) {
  return escape[chr];
}

function extend(obj /* , ...source */) {
  for (var i = 1; i < arguments.length; i++) {
    for (var key in arguments[i]) {
      if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
        obj[key] = arguments[i][key];
      }
    }
  }

  return obj;
}

var toString = Object.prototype.toString;

exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
/* eslint-disable func-style */
var isFunction = function isFunction(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
/* istanbul ignore next */
if (isFunction(/x/)) {
  exports.isFunction = isFunction = function (value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
exports.isFunction = isFunction;

/* eslint-enable func-style */

/* istanbul ignore next */
var isArray = Array.isArray || function (value) {
  return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
};

exports.isArray = isArray;
// Older IE versions do not directly support indexOf so we must implement our own, sadly.

function indexOf(array, value) {
  for (var i = 0, len = array.length; i < len; i++) {
    if (array[i] === value) {
      return i;
    }
  }
  return -1;
}

function escapeExpression(string) {
  if (typeof string !== 'string') {
    // don't escape SafeStrings, since they're already safe
    if (string && string.toHTML) {
      return string.toHTML();
    } else if (string == null) {
      return '';
    } else if (!string) {
      return string + '';
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = '' + string;
  }

  if (!possible.test(string)) {
    return string;
  }
  return string.replace(badChars, escapeChar);
}

function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

function createFrame(object) {
  var frame = extend({}, object);
  frame._parent = object;
  return frame;
}

function blockParams(params, ids) {
  params.path = ids;
  return params;
}

function appendContextPath(contextPath, id) {
  return (contextPath ? contextPath + '.' : '') + id;
}


},{}],"handlebars":[function(require,module,exports){
module.exports=require('7MzhPZ');
},{}],"7MzhPZ":[function(require,module,exports){
// USAGE:
// var handlebars = require('handlebars');
/* eslint-disable no-var */

// var local = handlebars.create();

var handlebars = require('../dist/cjs/handlebars')['default'];

var printer = require('../dist/cjs/handlebars/compiler/printer');
handlebars.PrintVisitor = printer.PrintVisitor;
handlebars.print = printer.print;

module.exports = handlebars;

// Publish a Node.js require() handler for .handlebars and .hbs files
function extension(module, filename) {
  var fs = require('fs');
  var templateString = fs.readFileSync(filename, 'utf8');
  module.exports = handlebars.compile(templateString);
}
/* istanbul ignore else */
if (typeof require !== 'undefined' && require.extensions) {
  require.extensions['.handlebars'] = extension;
  require.extensions['.hbs'] = extension;
}

},{"../dist/cjs/handlebars":46,"../dist/cjs/handlebars/compiler/printer":56,"fs":1}],77:[function(require,module,exports){
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
exports.SourceMapGenerator = require('./source-map/source-map-generator').SourceMapGenerator;
exports.SourceMapConsumer = require('./source-map/source-map-consumer').SourceMapConsumer;
exports.SourceNode = require('./source-map/source-node').SourceNode;

},{"./source-map/source-map-consumer":84,"./source-map/source-map-generator":85,"./source-map/source-node":86}],78:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');

  /**
   * A data structure which is a combination of an array and a set. Adding a new
   * member is O(1), testing for membership is O(1), and finding the index of an
   * element is O(1). Removing elements from the set is not supported. Only
   * strings are supported for membership.
   */
  function ArraySet() {
    this._array = [];
    this._set = {};
  }

  /**
   * Static method for creating ArraySet instances from an existing array.
   */
  ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
    var set = new ArraySet();
    for (var i = 0, len = aArray.length; i < len; i++) {
      set.add(aArray[i], aAllowDuplicates);
    }
    return set;
  };

  /**
   * Return how many unique items are in this ArraySet. If duplicates have been
   * added, than those do not count towards the size.
   *
   * @returns Number
   */
  ArraySet.prototype.size = function ArraySet_size() {
    return Object.getOwnPropertyNames(this._set).length;
  };

  /**
   * Add the given string to this set.
   *
   * @param String aStr
   */
  ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
    var isDuplicate = this.has(aStr);
    var idx = this._array.length;
    if (!isDuplicate || aAllowDuplicates) {
      this._array.push(aStr);
    }
    if (!isDuplicate) {
      this._set[util.toSetString(aStr)] = idx;
    }
  };

  /**
   * Is the given string a member of this set?
   *
   * @param String aStr
   */
  ArraySet.prototype.has = function ArraySet_has(aStr) {
    return Object.prototype.hasOwnProperty.call(this._set,
                                                util.toSetString(aStr));
  };

  /**
   * What is the index of the given string in the array?
   *
   * @param String aStr
   */
  ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
    if (this.has(aStr)) {
      return this._set[util.toSetString(aStr)];
    }
    throw new Error('"' + aStr + '" is not in the set.');
  };

  /**
   * What is the element at the given index?
   *
   * @param Number aIdx
   */
  ArraySet.prototype.at = function ArraySet_at(aIdx) {
    if (aIdx >= 0 && aIdx < this._array.length) {
      return this._array[aIdx];
    }
    throw new Error('No element indexed by ' + aIdx);
  };

  /**
   * Returns the array representation of this set (which has the proper indices
   * indicated by indexOf). Note that this is a copy of the internal array used
   * for storing the members so that no one can mess with internal state.
   */
  ArraySet.prototype.toArray = function ArraySet_toArray() {
    return this._array.slice();
  };

  exports.ArraySet = ArraySet;

});

},{"./util":87,"amdefine":88}],79:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var base64 = require('./base64');

  // A single base 64 digit can contain 6 bits of data. For the base 64 variable
  // length quantities we use in the source map spec, the first bit is the sign,
  // the next four bits are the actual value, and the 6th bit is the
  // continuation bit. The continuation bit tells us whether there are more
  // digits in this value following this digit.
  //
  //   Continuation
  //   |    Sign
  //   |    |
  //   V    V
  //   101011

  var VLQ_BASE_SHIFT = 5;

  // binary: 100000
  var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

  // binary: 011111
  var VLQ_BASE_MASK = VLQ_BASE - 1;

  // binary: 100000
  var VLQ_CONTINUATION_BIT = VLQ_BASE;

  /**
   * Converts from a two-complement value to a value where the sign bit is
   * placed in the least significant bit.  For example, as decimals:
   *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
   *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
   */
  function toVLQSigned(aValue) {
    return aValue < 0
      ? ((-aValue) << 1) + 1
      : (aValue << 1) + 0;
  }

  /**
   * Converts to a two-complement value from a value where the sign bit is
   * placed in the least significant bit.  For example, as decimals:
   *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
   *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
   */
  function fromVLQSigned(aValue) {
    var isNegative = (aValue & 1) === 1;
    var shifted = aValue >> 1;
    return isNegative
      ? -shifted
      : shifted;
  }

  /**
   * Returns the base 64 VLQ encoded value.
   */
  exports.encode = function base64VLQ_encode(aValue) {
    var encoded = "";
    var digit;

    var vlq = toVLQSigned(aValue);

    do {
      digit = vlq & VLQ_BASE_MASK;
      vlq >>>= VLQ_BASE_SHIFT;
      if (vlq > 0) {
        // There are still more digits in this value, so we must make sure the
        // continuation bit is marked.
        digit |= VLQ_CONTINUATION_BIT;
      }
      encoded += base64.encode(digit);
    } while (vlq > 0);

    return encoded;
  };

  /**
   * Decodes the next base 64 VLQ value from the given string and returns the
   * value and the rest of the string via the out parameter.
   */
  exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
    var strLen = aStr.length;
    var result = 0;
    var shift = 0;
    var continuation, digit;

    do {
      if (aIndex >= strLen) {
        throw new Error("Expected more digits in base 64 VLQ value.");
      }

      digit = base64.decode(aStr.charCodeAt(aIndex++));
      if (digit === -1) {
        throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
      }

      continuation = !!(digit & VLQ_CONTINUATION_BIT);
      digit &= VLQ_BASE_MASK;
      result = result + (digit << shift);
      shift += VLQ_BASE_SHIFT;
    } while (continuation);

    aOutParam.value = fromVLQSigned(result);
    aOutParam.rest = aIndex;
  };

});

},{"./base64":80,"amdefine":88}],80:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

  /**
   * Encode an integer in the range of 0 to 63 to a single base 64 digit.
   */
  exports.encode = function (number) {
    if (0 <= number && number < intToCharMap.length) {
      return intToCharMap[number];
    }
    throw new TypeError("Must be between 0 and 63: " + aNumber);
  };

  /**
   * Decode a single base 64 character code digit to an integer. Returns -1 on
   * failure.
   */
  exports.decode = function (charCode) {
    var bigA = 65;     // 'A'
    var bigZ = 90;     // 'Z'

    var littleA = 97;  // 'a'
    var littleZ = 122; // 'z'

    var zero = 48;     // '0'
    var nine = 57;     // '9'

    var plus = 43;     // '+'
    var slash = 47;    // '/'

    var littleOffset = 26;
    var numberOffset = 52;

    // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
    if (bigA <= charCode && charCode <= bigZ) {
      return (charCode - bigA);
    }

    // 26 - 51: abcdefghijklmnopqrstuvwxyz
    if (littleA <= charCode && charCode <= littleZ) {
      return (charCode - littleA + littleOffset);
    }

    // 52 - 61: 0123456789
    if (zero <= charCode && charCode <= nine) {
      return (charCode - zero + numberOffset);
    }

    // 62: +
    if (charCode == plus) {
      return 62;
    }

    // 63: /
    if (charCode == slash) {
      return 63;
    }

    // Invalid base64 digit.
    return -1;
  };

});

},{"amdefine":88}],81:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  exports.GREATEST_LOWER_BOUND = 1;
  exports.LEAST_UPPER_BOUND = 2;

  /**
   * Recursive implementation of binary search.
   *
   * @param aLow Indices here and lower do not contain the needle.
   * @param aHigh Indices here and higher do not contain the needle.
   * @param aNeedle The element being searched for.
   * @param aHaystack The non-empty array being searched.
   * @param aCompare Function which takes two elements and returns -1, 0, or 1.
   * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
   *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   */
  function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
    // This function terminates when one of the following is true:
    //
    //   1. We find the exact element we are looking for.
    //
    //   2. We did not find the exact element, but we can return the index of
    //      the next-closest element.
    //
    //   3. We did not find the exact element, and there is no next-closest
    //      element than the one we are searching for, so we return -1.
    var mid = Math.floor((aHigh - aLow) / 2) + aLow;
    var cmp = aCompare(aNeedle, aHaystack[mid], true);
    if (cmp === 0) {
      // Found the element we are looking for.
      return mid;
    }
    else if (cmp > 0) {
      // Our needle is greater than aHaystack[mid].
      if (aHigh - mid > 1) {
        // The element is in the upper half.
        return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
      }

      // The exact needle element was not found in this haystack. Determine if
      // we are in termination case (3) or (2) and return the appropriate thing.
      if (aBias == exports.LEAST_UPPER_BOUND) {
        return aHigh < aHaystack.length ? aHigh : -1;
      } else {
        return mid;
      }
    }
    else {
      // Our needle is less than aHaystack[mid].
      if (mid - aLow > 1) {
        // The element is in the lower half.
        return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
      }

      // we are in termination case (3) or (2) and return the appropriate thing.
      if (aBias == exports.LEAST_UPPER_BOUND) {
        return mid;
      } else {
        return aLow < 0 ? -1 : aLow;
      }
    }
  }

  /**
   * This is an implementation of binary search which will always try and return
   * the index of the closest element if there is no exact hit. This is because
   * mappings between original and generated line/col pairs are single points,
   * and there is an implicit region between each of them, so a miss just means
   * that you aren't on the very start of a region.
   *
   * @param aNeedle The element you are looking for.
   * @param aHaystack The array that is being searched.
   * @param aCompare A function which takes the needle and an element in the
   *     array and returns -1, 0, or 1 depending on whether the needle is less
   *     than, equal to, or greater than the element, respectively.
   * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
   *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
   */
  exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
    if (aHaystack.length === 0) {
      return -1;
    }

    var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
                                aCompare, aBias || exports.GREATEST_LOWER_BOUND);
    if (index < 0) {
      return -1;
    }

    // We have found either the exact element, or the next-closest element than
    // the one we are searching for. However, there may be more than one such
    // element. Make sure we always return the smallest of these.
    while (index - 1 >= 0) {
      if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
        break;
      }
      --index;
    }

    return index;
  };

});

},{"amdefine":88}],82:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');

  /**
   * Determine whether mappingB is after mappingA with respect to generated
   * position.
   */
  function generatedPositionAfter(mappingA, mappingB) {
    // Optimized for most common case
    var lineA = mappingA.generatedLine;
    var lineB = mappingB.generatedLine;
    var columnA = mappingA.generatedColumn;
    var columnB = mappingB.generatedColumn;
    return lineB > lineA || lineB == lineA && columnB >= columnA ||
           util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
  }

  /**
   * A data structure to provide a sorted view of accumulated mappings in a
   * performance conscious manner. It trades a neglibable overhead in general
   * case for a large speedup in case of mappings being added in order.
   */
  function MappingList() {
    this._array = [];
    this._sorted = true;
    // Serves as infimum
    this._last = {generatedLine: -1, generatedColumn: 0};
  }

  /**
   * Iterate through internal items. This method takes the same arguments that
   * `Array.prototype.forEach` takes.
   *
   * NOTE: The order of the mappings is NOT guaranteed.
   */
  MappingList.prototype.unsortedForEach =
    function MappingList_forEach(aCallback, aThisArg) {
      this._array.forEach(aCallback, aThisArg);
    };

  /**
   * Add the given source mapping.
   *
   * @param Object aMapping
   */
  MappingList.prototype.add = function MappingList_add(aMapping) {
    var mapping;
    if (generatedPositionAfter(this._last, aMapping)) {
      this._last = aMapping;
      this._array.push(aMapping);
    } else {
      this._sorted = false;
      this._array.push(aMapping);
    }
  };

  /**
   * Returns the flat, sorted array of mappings. The mappings are sorted by
   * generated position.
   *
   * WARNING: This method returns internal data without copying, for
   * performance. The return value must NOT be mutated, and should be treated as
   * an immutable borrow. If you want to take ownership, you must make your own
   * copy.
   */
  MappingList.prototype.toArray = function MappingList_toArray() {
    if (!this._sorted) {
      this._array.sort(util.compareByGeneratedPositionsInflated);
      this._sorted = true;
    }
    return this._array;
  };

  exports.MappingList = MappingList;

});

},{"./util":87,"amdefine":88}],83:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  // It turns out that some (most?) JavaScript engines don't self-host
  // `Array.prototype.sort`. This makes sense because C++ will likely remain
  // faster than JS when doing raw CPU-intensive sorting. However, when using a
  // custom comparator function, calling back and forth between the VM's C++ and
  // JIT'd JS is rather slow *and* loses JIT type information, resulting in
  // worse generated code for the comparator function than would be optimal. In
  // fact, when sorting with a comparator, these costs outweigh the benefits of
  // sorting in C++. By using our own JS-implemented Quick Sort (below), we get
  // a ~3500ms mean speed-up in `bench/bench.html`.

  /**
   * Swap the elements indexed by `x` and `y` in the array `ary`.
   *
   * @param {Array} ary
   *        The array.
   * @param {Number} x
   *        The index of the first item.
   * @param {Number} y
   *        The index of the second item.
   */
  function swap(ary, x, y) {
    var temp = ary[x];
    ary[x] = ary[y];
    ary[y] = temp;
  }

  /**
   * Returns a random integer within the range `low .. high` inclusive.
   *
   * @param {Number} low
   *        The lower bound on the range.
   * @param {Number} high
   *        The upper bound on the range.
   */
  function randomIntInRange(low, high) {
    return Math.round(low + (Math.random() * (high - low)));
  }

  /**
   * The Quick Sort algorithm.
   *
   * @param {Array} ary
   *        An array to sort.
   * @param {function} comparator
   *        Function to use to compare two items.
   * @param {Number} p
   *        Start index of the array
   * @param {Number} r
   *        End index of the array
   */
  function doQuickSort(ary, comparator, p, r) {
    // If our lower bound is less than our upper bound, we (1) partition the
    // array into two pieces and (2) recurse on each half. If it is not, this is
    // the empty array and our base case.

    if (p < r) {
      // (1) Partitioning.
      //
      // The partitioning chooses a pivot between `p` and `r` and moves all
      // elements that are less than or equal to the pivot to the before it, and
      // all the elements that are greater than it after it. The effect is that
      // once partition is done, the pivot is in the exact place it will be when
      // the array is put in sorted order, and it will not need to be moved
      // again. This runs in O(n) time.

      // Always choose a random pivot so that an input array which is reverse
      // sorted does not cause O(n^2) running time.
      var pivotIndex = randomIntInRange(p, r);
      var i = p - 1;

      swap(ary, pivotIndex, r);
      var pivot = ary[r];

      // Immediately after `j` is incremented in this loop, the following hold
      // true:
      //
      //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
      //
      //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
      for (var j = p; j < r; j++) {
        if (comparator(ary[j], pivot) <= 0) {
          i += 1;
          swap(ary, i, j);
        }
      }

      swap(ary, i + 1, j);
      var q = i + 1;

      // (2) Recurse on each half.

      doQuickSort(ary, comparator, p, q - 1);
      doQuickSort(ary, comparator, q + 1, r);
    }
  }

  /**
   * Sort the given array in-place with the given comparator function.
   *
   * @param {Array} ary
   *        An array to sort.
   * @param {function} comparator
   *        Function to use to compare two items.
   */
  exports.quickSort = function (ary, comparator) {
    doQuickSort(ary, comparator, 0, ary.length - 1);
  };

});

},{"amdefine":88}],84:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');
  var binarySearch = require('./binary-search');
  var ArraySet = require('./array-set').ArraySet;
  var base64VLQ = require('./base64-vlq');
  var quickSort = require('./quick-sort').quickSort;

  function SourceMapConsumer(aSourceMap) {
    var sourceMap = aSourceMap;
    if (typeof aSourceMap === 'string') {
      sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
    }

    return sourceMap.sections != null
      ? new IndexedSourceMapConsumer(sourceMap)
      : new BasicSourceMapConsumer(sourceMap);
  }

  SourceMapConsumer.fromSourceMap = function(aSourceMap) {
    return BasicSourceMapConsumer.fromSourceMap(aSourceMap);
  }

  /**
   * The version of the source mapping spec that we are consuming.
   */
  SourceMapConsumer.prototype._version = 3;

  // `__generatedMappings` and `__originalMappings` are arrays that hold the
  // parsed mapping coordinates from the source map's "mappings" attribute. They
  // are lazily instantiated, accessed via the `_generatedMappings` and
  // `_originalMappings` getters respectively, and we only parse the mappings
  // and create these arrays once queried for a source location. We jump through
  // these hoops because there can be many thousands of mappings, and parsing
  // them is expensive, so we only want to do it if we must.
  //
  // Each object in the arrays is of the form:
  //
  //     {
  //       generatedLine: The line number in the generated code,
  //       generatedColumn: The column number in the generated code,
  //       source: The path to the original source file that generated this
  //               chunk of code,
  //       originalLine: The line number in the original source that
  //                     corresponds to this chunk of generated code,
  //       originalColumn: The column number in the original source that
  //                       corresponds to this chunk of generated code,
  //       name: The name of the original symbol which generated this chunk of
  //             code.
  //     }
  //
  // All properties except for `generatedLine` and `generatedColumn` can be
  // `null`.
  //
  // `_generatedMappings` is ordered by the generated positions.
  //
  // `_originalMappings` is ordered by the original positions.

  SourceMapConsumer.prototype.__generatedMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
    get: function () {
      if (!this.__generatedMappings) {
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__generatedMappings;
    }
  });

  SourceMapConsumer.prototype.__originalMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
    get: function () {
      if (!this.__originalMappings) {
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__originalMappings;
    }
  });

  SourceMapConsumer.prototype._charIsMappingSeparator =
    function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
      var c = aStr.charAt(index);
      return c === ";" || c === ",";
    };

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  SourceMapConsumer.prototype._parseMappings =
    function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      throw new Error("Subclasses must implement _parseMappings");
    };

  SourceMapConsumer.GENERATED_ORDER = 1;
  SourceMapConsumer.ORIGINAL_ORDER = 2;

  SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
  SourceMapConsumer.LEAST_UPPER_BOUND = 2;

  /**
   * Iterate over each mapping between an original source/line/column and a
   * generated line/column in this source map.
   *
   * @param Function aCallback
   *        The function that is called with each mapping.
   * @param Object aContext
   *        Optional. If specified, this object will be the value of `this` every
   *        time that `aCallback` is called.
   * @param aOrder
   *        Either `SourceMapConsumer.GENERATED_ORDER` or
   *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
   *        iterate over the mappings sorted by the generated file's line/column
   *        order or the original's source/line/column order, respectively. Defaults to
   *        `SourceMapConsumer.GENERATED_ORDER`.
   */
  SourceMapConsumer.prototype.eachMapping =
    function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
      var context = aContext || null;
      var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

      var mappings;
      switch (order) {
      case SourceMapConsumer.GENERATED_ORDER:
        mappings = this._generatedMappings;
        break;
      case SourceMapConsumer.ORIGINAL_ORDER:
        mappings = this._originalMappings;
        break;
      default:
        throw new Error("Unknown order of iteration.");
      }

      var sourceRoot = this.sourceRoot;
      mappings.map(function (mapping) {
        var source = mapping.source === null ? null : this._sources.at(mapping.source);
        if (source != null && sourceRoot != null) {
          source = util.join(sourceRoot, source);
        }
        return {
          source: source,
          generatedLine: mapping.generatedLine,
          generatedColumn: mapping.generatedColumn,
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: mapping.name === null ? null : this._names.at(mapping.name)
        };
      }, this).forEach(aCallback, context);
    };

  /**
   * Returns all generated line and column information for the original source,
   * line, and column provided. If no column is provided, returns all mappings
   * corresponding to a either the line we are searching for or the next
   * closest line that has any mappings. Otherwise, returns all mappings
   * corresponding to the given line and either the column we are searching for
   * or the next closest column that has any offsets.
   *
   * The only argument is an object with the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.
   *   - column: Optional. the column number in the original source.
   *
   * and an array of objects is returned, each with the following properties:
   *
   *   - line: The line number in the generated source, or null.
   *   - column: The column number in the generated source, or null.
   */
  SourceMapConsumer.prototype.allGeneratedPositionsFor =
    function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
      var line = util.getArg(aArgs, 'line');

      // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
      // returns the index of the closest mapping less than the needle. By
      // setting needle.originalColumn to 0, we thus find the last mapping for
      // the given line, provided such a mapping exists.
      var needle = {
        source: util.getArg(aArgs, 'source'),
        originalLine: line,
        originalColumn: util.getArg(aArgs, 'column', 0)
      };

      if (this.sourceRoot != null) {
        needle.source = util.relative(this.sourceRoot, needle.source);
      }
      if (!this._sources.has(needle.source)) {
        return [];
      }
      needle.source = this._sources.indexOf(needle.source);

      var mappings = [];

      var index = this._findMapping(needle,
                                    this._originalMappings,
                                    "originalLine",
                                    "originalColumn",
                                    util.compareByOriginalPositions,
                                    binarySearch.LEAST_UPPER_BOUND);
      if (index >= 0) {
        var mapping = this._originalMappings[index];

        if (aArgs.column === undefined) {
          var originalLine = mapping.originalLine;

          // Iterate until either we run out of mappings, or we run into
          // a mapping for a different line than the one we found. Since
          // mappings are sorted, this is guaranteed to find all mappings for
          // the line we found.
          while (mapping && mapping.originalLine === originalLine) {
            mappings.push({
              line: util.getArg(mapping, 'generatedLine', null),
              column: util.getArg(mapping, 'generatedColumn', null),
              lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
            });

            mapping = this._originalMappings[++index];
          }
        } else {
          var originalColumn = mapping.originalColumn;

          // Iterate until either we run out of mappings, or we run into
          // a mapping for a different line than the one we were searching for.
          // Since mappings are sorted, this is guaranteed to find all mappings for
          // the line we are searching for.
          while (mapping &&
                 mapping.originalLine === line &&
                 mapping.originalColumn == originalColumn) {
            mappings.push({
              line: util.getArg(mapping, 'generatedLine', null),
              column: util.getArg(mapping, 'generatedColumn', null),
              lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
            });

            mapping = this._originalMappings[++index];
          }
        }
      }

      return mappings;
    };

  exports.SourceMapConsumer = SourceMapConsumer;

  /**
   * A BasicSourceMapConsumer instance represents a parsed source map which we can
   * query for information about the original file positions by giving it a file
   * position in the generated source.
   *
   * The only parameter is the raw source map (either as a JSON string, or
   * already parsed to an object). According to the spec, source maps have the
   * following attributes:
   *
   *   - version: Which version of the source map spec this map is following.
   *   - sources: An array of URLs to the original source files.
   *   - names: An array of identifiers which can be referrenced by individual mappings.
   *   - sourceRoot: Optional. The URL root from which all sources are relative.
   *   - sourcesContent: Optional. An array of contents of the original source files.
   *   - mappings: A string of base64 VLQs which contain the actual mappings.
   *   - file: Optional. The generated file this source map is associated with.
   *
   * Here is an example source map, taken from the source map spec[0]:
   *
   *     {
   *       version : 3,
   *       file: "out.js",
   *       sourceRoot : "",
   *       sources: ["foo.js", "bar.js"],
   *       names: ["src", "maps", "are", "fun"],
   *       mappings: "AA,AB;;ABCDE;"
   *     }
   *
   * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
   */
  function BasicSourceMapConsumer(aSourceMap) {
    var sourceMap = aSourceMap;
    if (typeof aSourceMap === 'string') {
      sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
    }

    var version = util.getArg(sourceMap, 'version');
    var sources = util.getArg(sourceMap, 'sources');
    // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
    // requires the array) to play nice here.
    var names = util.getArg(sourceMap, 'names', []);
    var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
    var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
    var mappings = util.getArg(sourceMap, 'mappings');
    var file = util.getArg(sourceMap, 'file', null);

    // Once again, Sass deviates from the spec and supplies the version as a
    // string rather than a number, so we use loose equality checking here.
    if (version != this._version) {
      throw new Error('Unsupported version: ' + version);
    }

    // Some source maps produce relative source paths like "./foo.js" instead of
    // "foo.js".  Normalize these first so that future comparisons will succeed.
    // See bugzil.la/1090768.
    sources = sources.map(util.normalize);

    // Pass `true` below to allow duplicate names and sources. While source maps
    // are intended to be compressed and deduplicated, the TypeScript compiler
    // sometimes generates source maps with duplicates in them. See Github issue
    // #72 and bugzil.la/889492.
    this._names = ArraySet.fromArray(names, true);
    this._sources = ArraySet.fromArray(sources, true);

    this.sourceRoot = sourceRoot;
    this.sourcesContent = sourcesContent;
    this._mappings = mappings;
    this.file = file;
  }

  BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
  BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;

  /**
   * Create a BasicSourceMapConsumer from a SourceMapGenerator.
   *
   * @param SourceMapGenerator aSourceMap
   *        The source map that will be consumed.
   * @returns BasicSourceMapConsumer
   */
  BasicSourceMapConsumer.fromSourceMap =
    function SourceMapConsumer_fromSourceMap(aSourceMap) {
      var smc = Object.create(BasicSourceMapConsumer.prototype);

      var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
      var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
      smc.sourceRoot = aSourceMap._sourceRoot;
      smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                              smc.sourceRoot);
      smc.file = aSourceMap._file;

      // Because we are modifying the entries (by converting string sources and
      // names to indices into the sources and names ArraySets), we have to make
      // a copy of the entry or else bad things happen. Shared mutable state
      // strikes again! See github issue #191.

      var generatedMappings = aSourceMap._mappings.toArray().slice();
      var destGeneratedMappings = smc.__generatedMappings = [];
      var destOriginalMappings = smc.__originalMappings = [];

      for (var i = 0, length = generatedMappings.length; i < length; i++) {
        var srcMapping = generatedMappings[i];
        var destMapping = new Mapping;
        destMapping.generatedLine = srcMapping.generatedLine;
        destMapping.generatedColumn = srcMapping.generatedColumn;

        if (srcMapping.source) {
          destMapping.source = sources.indexOf(srcMapping.source);
          destMapping.originalLine = srcMapping.originalLine;
          destMapping.originalColumn = srcMapping.originalColumn;

          if (srcMapping.name) {
            destMapping.name = names.indexOf(srcMapping.name);
          }

          destOriginalMappings.push(destMapping);
        }

        destGeneratedMappings.push(destMapping);
      }

      quickSort(smc.__originalMappings, util.compareByOriginalPositions);

      return smc;
    };

  /**
   * The version of the source mapping spec that we are consuming.
   */
  BasicSourceMapConsumer.prototype._version = 3;

  /**
   * The list of original sources.
   */
  Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
    get: function () {
      return this._sources.toArray().map(function (s) {
        return this.sourceRoot != null ? util.join(this.sourceRoot, s) : s;
      }, this);
    }
  });

  /**
   * Provide the JIT with a nice shape / hidden class.
   */
  function Mapping() {
    this.generatedLine = 0;
    this.generatedColumn = 0;
    this.source = null;
    this.originalLine = null;
    this.originalColumn = null;
    this.name = null;
  }

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  BasicSourceMapConsumer.prototype._parseMappings =
    function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      var generatedLine = 1;
      var previousGeneratedColumn = 0;
      var previousOriginalLine = 0;
      var previousOriginalColumn = 0;
      var previousSource = 0;
      var previousName = 0;
      var length = aStr.length;
      var index = 0;
      var cachedSegments = {};
      var temp = {};
      var originalMappings = [];
      var generatedMappings = [];
      var mapping, str, segment, end, value;

      while (index < length) {
        if (aStr.charAt(index) === ';') {
          generatedLine++;
          index++;
          previousGeneratedColumn = 0;
        }
        else if (aStr.charAt(index) === ',') {
          index++;
        }
        else {
          mapping = new Mapping();
          mapping.generatedLine = generatedLine;

          // Because each offset is encoded relative to the previous one,
          // many segments often have the same encoding. We can exploit this
          // fact by caching the parsed variable length fields of each segment,
          // allowing us to avoid a second parse if we encounter the same
          // segment again.
          for (end = index; end < length; end++) {
            if (this._charIsMappingSeparator(aStr, end)) {
              break;
            }
          }
          str = aStr.slice(index, end);

          segment = cachedSegments[str];
          if (segment) {
            index += str.length;
          } else {
            segment = [];
            while (index < end) {
              base64VLQ.decode(aStr, index, temp);
              value = temp.value;
              index = temp.rest;
              segment.push(value);
            }

            if (segment.length === 2) {
              throw new Error('Found a source, but no line and column');
            }

            if (segment.length === 3) {
              throw new Error('Found a source and line, but no column');
            }

            cachedSegments[str] = segment;
          }

          // Generated column.
          mapping.generatedColumn = previousGeneratedColumn + segment[0];
          previousGeneratedColumn = mapping.generatedColumn;

          if (segment.length > 1) {
            // Original source.
            mapping.source = previousSource + segment[1];
            previousSource += segment[1];

            // Original line.
            mapping.originalLine = previousOriginalLine + segment[2];
            previousOriginalLine = mapping.originalLine;
            // Lines are stored 0-based
            mapping.originalLine += 1;

            // Original column.
            mapping.originalColumn = previousOriginalColumn + segment[3];
            previousOriginalColumn = mapping.originalColumn;

            if (segment.length > 4) {
              // Original name.
              mapping.name = previousName + segment[4];
              previousName += segment[4];
            }
          }

          generatedMappings.push(mapping);
          if (typeof mapping.originalLine === 'number') {
            originalMappings.push(mapping);
          }
        }
      }

      quickSort(generatedMappings, util.compareByGeneratedPositionsDeflated);
      this.__generatedMappings = generatedMappings;

      quickSort(originalMappings, util.compareByOriginalPositions);
      this.__originalMappings = originalMappings;
    };

  /**
   * Find the mapping that best matches the hypothetical "needle" mapping that
   * we are searching for in the given "haystack" of mappings.
   */
  BasicSourceMapConsumer.prototype._findMapping =
    function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                           aColumnName, aComparator, aBias) {
      // To return the position we are searching for, we must first find the
      // mapping for the given position and then return the opposite position it
      // points to. Because the mappings are sorted, we can use binary search to
      // find the best mapping.

      if (aNeedle[aLineName] <= 0) {
        throw new TypeError('Line must be greater than or equal to 1, got '
                            + aNeedle[aLineName]);
      }
      if (aNeedle[aColumnName] < 0) {
        throw new TypeError('Column must be greater than or equal to 0, got '
                            + aNeedle[aColumnName]);
      }

      return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
    };

  /**
   * Compute the last column for each generated mapping. The last column is
   * inclusive.
   */
  BasicSourceMapConsumer.prototype.computeColumnSpans =
    function SourceMapConsumer_computeColumnSpans() {
      for (var index = 0; index < this._generatedMappings.length; ++index) {
        var mapping = this._generatedMappings[index];

        // Mappings do not contain a field for the last generated columnt. We
        // can come up with an optimistic estimate, however, by assuming that
        // mappings are contiguous (i.e. given two consecutive mappings, the
        // first mapping ends where the second one starts).
        if (index + 1 < this._generatedMappings.length) {
          var nextMapping = this._generatedMappings[index + 1];

          if (mapping.generatedLine === nextMapping.generatedLine) {
            mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
            continue;
          }
        }

        // The last mapping for each line spans the entire line.
        mapping.lastGeneratedColumn = Infinity;
      }
    };

  /**
   * Returns the original source, line, and column information for the generated
   * source's line and column positions provided. The only argument is an object
   * with the following properties:
   *
   *   - line: The line number in the generated source.
   *   - column: The column number in the generated source.
   *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
   *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
   *
   * and an object is returned with the following properties:
   *
   *   - source: The original source file, or null.
   *   - line: The line number in the original source, or null.
   *   - column: The column number in the original source, or null.
   *   - name: The original identifier, or null.
   */
  BasicSourceMapConsumer.prototype.originalPositionFor =
    function SourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, 'line'),
        generatedColumn: util.getArg(aArgs, 'column')
      };

      var index = this._findMapping(
        needle,
        this._generatedMappings,
        "generatedLine",
        "generatedColumn",
        util.compareByGeneratedPositionsDeflated,
        util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
      );

      if (index >= 0) {
        var mapping = this._generatedMappings[index];

        if (mapping.generatedLine === needle.generatedLine) {
          var source = util.getArg(mapping, 'source', null);
          if (source !== null) {
            source = this._sources.at(source);
            if (this.sourceRoot != null) {
              source = util.join(this.sourceRoot, source);
            }
          }
          var name = util.getArg(mapping, 'name', null);
          if (name !== null) {
            name = this._names.at(name);
          }
          return {
            source: source,
            line: util.getArg(mapping, 'originalLine', null),
            column: util.getArg(mapping, 'originalColumn', null),
            name: name
          };
        }
      }

      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    };

  /**
   * Return true if we have the source content for every source in the source
   * map, false otherwise.
   */
  BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
    function BasicSourceMapConsumer_hasContentsOfAllSources() {
      if (!this.sourcesContent) {
        return false;
      }
      return this.sourcesContent.length >= this._sources.size() &&
        !this.sourcesContent.some(function (sc) { return sc == null; });
    };

  /**
   * Returns the original source content. The only argument is the url of the
   * original source file. Returns null if no original source content is
   * availible.
   */
  BasicSourceMapConsumer.prototype.sourceContentFor =
    function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
      if (!this.sourcesContent) {
        return null;
      }

      if (this.sourceRoot != null) {
        aSource = util.relative(this.sourceRoot, aSource);
      }

      if (this._sources.has(aSource)) {
        return this.sourcesContent[this._sources.indexOf(aSource)];
      }

      var url;
      if (this.sourceRoot != null
          && (url = util.urlParse(this.sourceRoot))) {
        // XXX: file:// URIs and absolute paths lead to unexpected behavior for
        // many users. We can help them out when they expect file:// URIs to
        // behave like it would if they were running a local HTTP server. See
        // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
        var fileUriAbsPath = aSource.replace(/^file:\/\//, "");
        if (url.scheme == "file"
            && this._sources.has(fileUriAbsPath)) {
          return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
        }

        if ((!url.path || url.path == "/")
            && this._sources.has("/" + aSource)) {
          return this.sourcesContent[this._sources.indexOf("/" + aSource)];
        }
      }

      // This function is used recursively from
      // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
      // don't want to throw if we can't find the source - we just want to
      // return null, so we provide a flag to exit gracefully.
      if (nullOnMissing) {
        return null;
      }
      else {
        throw new Error('"' + aSource + '" is not in the SourceMap.');
      }
    };

  /**
   * Returns the generated line and column information for the original source,
   * line, and column positions provided. The only argument is an object with
   * the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.
   *   - column: The column number in the original source.
   *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
   *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
   *
   * and an object is returned with the following properties:
   *
   *   - line: The line number in the generated source, or null.
   *   - column: The column number in the generated source, or null.
   */
  BasicSourceMapConsumer.prototype.generatedPositionFor =
    function SourceMapConsumer_generatedPositionFor(aArgs) {
      var source = util.getArg(aArgs, 'source');
      if (this.sourceRoot != null) {
        source = util.relative(this.sourceRoot, source);
      }
      if (!this._sources.has(source)) {
        return {
          line: null,
          column: null,
          lastColumn: null
        };
      }
      source = this._sources.indexOf(source);

      var needle = {
        source: source,
        originalLine: util.getArg(aArgs, 'line'),
        originalColumn: util.getArg(aArgs, 'column')
      };

      var index = this._findMapping(
        needle,
        this._originalMappings,
        "originalLine",
        "originalColumn",
        util.compareByOriginalPositions,
        util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
      );

      if (index >= 0) {
        var mapping = this._originalMappings[index];

        if (mapping.source === needle.source) {
          return {
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          };
        }
      }

      return {
        line: null,
        column: null,
        lastColumn: null
      };
    };

  exports.BasicSourceMapConsumer = BasicSourceMapConsumer;

  /**
   * An IndexedSourceMapConsumer instance represents a parsed source map which
   * we can query for information. It differs from BasicSourceMapConsumer in
   * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
   * input.
   *
   * The only parameter is a raw source map (either as a JSON string, or already
   * parsed to an object). According to the spec for indexed source maps, they
   * have the following attributes:
   *
   *   - version: Which version of the source map spec this map is following.
   *   - file: Optional. The generated file this source map is associated with.
   *   - sections: A list of section definitions.
   *
   * Each value under the "sections" field has two fields:
   *   - offset: The offset into the original specified at which this section
   *       begins to apply, defined as an object with a "line" and "column"
   *       field.
   *   - map: A source map definition. This source map could also be indexed,
   *       but doesn't have to be.
   *
   * Instead of the "map" field, it's also possible to have a "url" field
   * specifying a URL to retrieve a source map from, but that's currently
   * unsupported.
   *
   * Here's an example source map, taken from the source map spec[0], but
   * modified to omit a section which uses the "url" field.
   *
   *  {
   *    version : 3,
   *    file: "app.js",
   *    sections: [{
   *      offset: {line:100, column:10},
   *      map: {
   *        version : 3,
   *        file: "section.js",
   *        sources: ["foo.js", "bar.js"],
   *        names: ["src", "maps", "are", "fun"],
   *        mappings: "AAAA,E;;ABCDE;"
   *      }
   *    }],
   *  }
   *
   * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
   */
  function IndexedSourceMapConsumer(aSourceMap) {
    var sourceMap = aSourceMap;
    if (typeof aSourceMap === 'string') {
      sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
    }

    var version = util.getArg(sourceMap, 'version');
    var sections = util.getArg(sourceMap, 'sections');

    if (version != this._version) {
      throw new Error('Unsupported version: ' + version);
    }

    this._sources = new ArraySet();
    this._names = new ArraySet();

    var lastOffset = {
      line: -1,
      column: 0
    };
    this._sections = sections.map(function (s) {
      if (s.url) {
        // The url field will require support for asynchronicity.
        // See https://github.com/mozilla/source-map/issues/16
        throw new Error('Support for url field in sections not implemented.');
      }
      var offset = util.getArg(s, 'offset');
      var offsetLine = util.getArg(offset, 'line');
      var offsetColumn = util.getArg(offset, 'column');

      if (offsetLine < lastOffset.line ||
          (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
        throw new Error('Section offsets must be ordered and non-overlapping.');
      }
      lastOffset = offset;

      return {
        generatedOffset: {
          // The offset fields are 0-based, but we use 1-based indices when
          // encoding/decoding from VLQ.
          generatedLine: offsetLine + 1,
          generatedColumn: offsetColumn + 1
        },
        consumer: new SourceMapConsumer(util.getArg(s, 'map'))
      }
    });
  }

  IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
  IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;

  /**
   * The version of the source mapping spec that we are consuming.
   */
  IndexedSourceMapConsumer.prototype._version = 3;

  /**
   * The list of original sources.
   */
  Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
    get: function () {
      var sources = [];
      for (var i = 0; i < this._sections.length; i++) {
        for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
          sources.push(this._sections[i].consumer.sources[j]);
        }
      };
      return sources;
    }
  });

  /**
   * Returns the original source, line, and column information for the generated
   * source's line and column positions provided. The only argument is an object
   * with the following properties:
   *
   *   - line: The line number in the generated source.
   *   - column: The column number in the generated source.
   *
   * and an object is returned with the following properties:
   *
   *   - source: The original source file, or null.
   *   - line: The line number in the original source, or null.
   *   - column: The column number in the original source, or null.
   *   - name: The original identifier, or null.
   */
  IndexedSourceMapConsumer.prototype.originalPositionFor =
    function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, 'line'),
        generatedColumn: util.getArg(aArgs, 'column')
      };

      // Find the section containing the generated position we're trying to map
      // to an original position.
      var sectionIndex = binarySearch.search(needle, this._sections,
        function(needle, section) {
          var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
          if (cmp) {
            return cmp;
          }

          return (needle.generatedColumn -
                  section.generatedOffset.generatedColumn);
        });
      var section = this._sections[sectionIndex];

      if (!section) {
        return {
          source: null,
          line: null,
          column: null,
          name: null
        };
      }

      return section.consumer.originalPositionFor({
        line: needle.generatedLine -
          (section.generatedOffset.generatedLine - 1),
        column: needle.generatedColumn -
          (section.generatedOffset.generatedLine === needle.generatedLine
           ? section.generatedOffset.generatedColumn - 1
           : 0),
        bias: aArgs.bias
      });
    };

  /**
   * Return true if we have the source content for every source in the source
   * map, false otherwise.
   */
  IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
    function IndexedSourceMapConsumer_hasContentsOfAllSources() {
      return this._sections.every(function (s) {
        return s.consumer.hasContentsOfAllSources();
      });
    };

  /**
   * Returns the original source content. The only argument is the url of the
   * original source file. Returns null if no original source content is
   * available.
   */
  IndexedSourceMapConsumer.prototype.sourceContentFor =
    function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];

        var content = section.consumer.sourceContentFor(aSource, true);
        if (content) {
          return content;
        }
      }
      if (nullOnMissing) {
        return null;
      }
      else {
        throw new Error('"' + aSource + '" is not in the SourceMap.');
      }
    };

  /**
   * Returns the generated line and column information for the original source,
   * line, and column positions provided. The only argument is an object with
   * the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.
   *   - column: The column number in the original source.
   *
   * and an object is returned with the following properties:
   *
   *   - line: The line number in the generated source, or null.
   *   - column: The column number in the generated source, or null.
   */
  IndexedSourceMapConsumer.prototype.generatedPositionFor =
    function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];

        // Only consider this section if the requested source is in the list of
        // sources of the consumer.
        if (section.consumer.sources.indexOf(util.getArg(aArgs, 'source')) === -1) {
          continue;
        }
        var generatedPosition = section.consumer.generatedPositionFor(aArgs);
        if (generatedPosition) {
          var ret = {
            line: generatedPosition.line +
              (section.generatedOffset.generatedLine - 1),
            column: generatedPosition.column +
              (section.generatedOffset.generatedLine === generatedPosition.line
               ? section.generatedOffset.generatedColumn - 1
               : 0)
          };
          return ret;
        }
      }

      return {
        line: null,
        column: null
      };
    };

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  IndexedSourceMapConsumer.prototype._parseMappings =
    function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      this.__generatedMappings = [];
      this.__originalMappings = [];
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];
        var sectionMappings = section.consumer._generatedMappings;
        for (var j = 0; j < sectionMappings.length; j++) {
          var mapping = sectionMappings[i];

          var source = section.consumer._sources.at(mapping.source);
          if (section.consumer.sourceRoot !== null) {
            source = util.join(section.consumer.sourceRoot, source);
          }
          this._sources.add(source);
          source = this._sources.indexOf(source);

          var name = section.consumer._names.at(mapping.name);
          this._names.add(name);
          name = this._names.indexOf(name);

          // The mappings coming from the consumer for the section have
          // generated positions relative to the start of the section, so we
          // need to offset them to be relative to the start of the concatenated
          // generated file.
          var adjustedMapping = {
            source: source,
            generatedLine: mapping.generatedLine +
              (section.generatedOffset.generatedLine - 1),
            generatedColumn: mapping.column +
              (section.generatedOffset.generatedLine === mapping.generatedLine)
              ? section.generatedOffset.generatedColumn - 1
              : 0,
            originalLine: mapping.originalLine,
            originalColumn: mapping.originalColumn,
            name: name
          };

          this.__generatedMappings.push(adjustedMapping);
          if (typeof adjustedMapping.originalLine === 'number') {
            this.__originalMappings.push(adjustedMapping);
          }
        };
      };

      quickSort(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
      quickSort(this.__originalMappings, util.compareByOriginalPositions);
    };

  exports.IndexedSourceMapConsumer = IndexedSourceMapConsumer;

});

},{"./array-set":78,"./base64-vlq":79,"./binary-search":81,"./quick-sort":83,"./util":87,"amdefine":88}],85:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var base64VLQ = require('./base64-vlq');
  var util = require('./util');
  var ArraySet = require('./array-set').ArraySet;
  var MappingList = require('./mapping-list').MappingList;

  /**
   * An instance of the SourceMapGenerator represents a source map which is
   * being built incrementally. You may pass an object with the following
   * properties:
   *
   *   - file: The filename of the generated source.
   *   - sourceRoot: A root for all relative URLs in this source map.
   */
  function SourceMapGenerator(aArgs) {
    if (!aArgs) {
      aArgs = {};
    }
    this._file = util.getArg(aArgs, 'file', null);
    this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
    this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
    this._sources = new ArraySet();
    this._names = new ArraySet();
    this._mappings = new MappingList();
    this._sourcesContents = null;
  }

  SourceMapGenerator.prototype._version = 3;

  /**
   * Creates a new SourceMapGenerator based on a SourceMapConsumer
   *
   * @param aSourceMapConsumer The SourceMap.
   */
  SourceMapGenerator.fromSourceMap =
    function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
      var sourceRoot = aSourceMapConsumer.sourceRoot;
      var generator = new SourceMapGenerator({
        file: aSourceMapConsumer.file,
        sourceRoot: sourceRoot
      });
      aSourceMapConsumer.eachMapping(function (mapping) {
        var newMapping = {
          generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn
          }
        };

        if (mapping.source != null) {
          newMapping.source = mapping.source;
          if (sourceRoot != null) {
            newMapping.source = util.relative(sourceRoot, newMapping.source);
          }

          newMapping.original = {
            line: mapping.originalLine,
            column: mapping.originalColumn
          };

          if (mapping.name != null) {
            newMapping.name = mapping.name;
          }
        }

        generator.addMapping(newMapping);
      });
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          generator.setSourceContent(sourceFile, content);
        }
      });
      return generator;
    };

  /**
   * Add a single mapping from original source line and column to the generated
   * source's line and column for this source map being created. The mapping
   * object should have the following properties:
   *
   *   - generated: An object with the generated line and column positions.
   *   - original: An object with the original line and column positions.
   *   - source: The original source file (relative to the sourceRoot).
   *   - name: An optional original token name for this mapping.
   */
  SourceMapGenerator.prototype.addMapping =
    function SourceMapGenerator_addMapping(aArgs) {
      var generated = util.getArg(aArgs, 'generated');
      var original = util.getArg(aArgs, 'original', null);
      var source = util.getArg(aArgs, 'source', null);
      var name = util.getArg(aArgs, 'name', null);

      if (!this._skipValidation) {
        this._validateMapping(generated, original, source, name);
      }

      if (source != null && !this._sources.has(source)) {
        this._sources.add(source);
      }

      if (name != null && !this._names.has(name)) {
        this._names.add(name);
      }

      this._mappings.add({
        generatedLine: generated.line,
        generatedColumn: generated.column,
        originalLine: original != null && original.line,
        originalColumn: original != null && original.column,
        source: source,
        name: name
      });
    };

  /**
   * Set the source content for a source file.
   */
  SourceMapGenerator.prototype.setSourceContent =
    function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
      var source = aSourceFile;
      if (this._sourceRoot != null) {
        source = util.relative(this._sourceRoot, source);
      }

      if (aSourceContent != null) {
        // Add the source content to the _sourcesContents map.
        // Create a new _sourcesContents map if the property is null.
        if (!this._sourcesContents) {
          this._sourcesContents = {};
        }
        this._sourcesContents[util.toSetString(source)] = aSourceContent;
      } else if (this._sourcesContents) {
        // Remove the source file from the _sourcesContents map.
        // If the _sourcesContents map is empty, set the property to null.
        delete this._sourcesContents[util.toSetString(source)];
        if (Object.keys(this._sourcesContents).length === 0) {
          this._sourcesContents = null;
        }
      }
    };

  /**
   * Applies the mappings of a sub-source-map for a specific source file to the
   * source map being generated. Each mapping to the supplied source file is
   * rewritten using the supplied source map. Note: The resolution for the
   * resulting mappings is the minimium of this map and the supplied map.
   *
   * @param aSourceMapConsumer The source map to be applied.
   * @param aSourceFile Optional. The filename of the source file.
   *        If omitted, SourceMapConsumer's file property will be used.
   * @param aSourceMapPath Optional. The dirname of the path to the source map
   *        to be applied. If relative, it is relative to the SourceMapConsumer.
   *        This parameter is needed when the two source maps aren't in the same
   *        directory, and the source map to be applied contains relative source
   *        paths. If so, those relative source paths need to be rewritten
   *        relative to the SourceMapGenerator.
   */
  SourceMapGenerator.prototype.applySourceMap =
    function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
      var sourceFile = aSourceFile;
      // If aSourceFile is omitted, we will use the file property of the SourceMap
      if (aSourceFile == null) {
        if (aSourceMapConsumer.file == null) {
          throw new Error(
            'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
            'or the source map\'s "file" property. Both were omitted.'
          );
        }
        sourceFile = aSourceMapConsumer.file;
      }
      var sourceRoot = this._sourceRoot;
      // Make "sourceFile" relative if an absolute Url is passed.
      if (sourceRoot != null) {
        sourceFile = util.relative(sourceRoot, sourceFile);
      }
      // Applying the SourceMap can add and remove items from the sources and
      // the names array.
      var newSources = new ArraySet();
      var newNames = new ArraySet();

      // Find mappings for the "sourceFile"
      this._mappings.unsortedForEach(function (mapping) {
        if (mapping.source === sourceFile && mapping.originalLine != null) {
          // Check if it can be mapped by the source map, then update the mapping.
          var original = aSourceMapConsumer.originalPositionFor({
            line: mapping.originalLine,
            column: mapping.originalColumn
          });
          if (original.source != null) {
            // Copy mapping
            mapping.source = original.source;
            if (aSourceMapPath != null) {
              mapping.source = util.join(aSourceMapPath, mapping.source)
            }
            if (sourceRoot != null) {
              mapping.source = util.relative(sourceRoot, mapping.source);
            }
            mapping.originalLine = original.line;
            mapping.originalColumn = original.column;
            if (original.name != null) {
              mapping.name = original.name;
            }
          }
        }

        var source = mapping.source;
        if (source != null && !newSources.has(source)) {
          newSources.add(source);
        }

        var name = mapping.name;
        if (name != null && !newNames.has(name)) {
          newNames.add(name);
        }

      }, this);
      this._sources = newSources;
      this._names = newNames;

      // Copy sourcesContents of applied map.
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          if (aSourceMapPath != null) {
            sourceFile = util.join(aSourceMapPath, sourceFile);
          }
          if (sourceRoot != null) {
            sourceFile = util.relative(sourceRoot, sourceFile);
          }
          this.setSourceContent(sourceFile, content);
        }
      }, this);
    };

  /**
   * A mapping can have one of the three levels of data:
   *
   *   1. Just the generated position.
   *   2. The Generated position, original position, and original source.
   *   3. Generated and original position, original source, as well as a name
   *      token.
   *
   * To maintain consistency, we validate that any new mapping being added falls
   * in to one of these categories.
   */
  SourceMapGenerator.prototype._validateMapping =
    function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                                aName) {
      if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
          && aGenerated.line > 0 && aGenerated.column >= 0
          && !aOriginal && !aSource && !aName) {
        // Case 1.
        return;
      }
      else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
               && aOriginal && 'line' in aOriginal && 'column' in aOriginal
               && aGenerated.line > 0 && aGenerated.column >= 0
               && aOriginal.line > 0 && aOriginal.column >= 0
               && aSource) {
        // Cases 2 and 3.
        return;
      }
      else {
        throw new Error('Invalid mapping: ' + JSON.stringify({
          generated: aGenerated,
          source: aSource,
          original: aOriginal,
          name: aName
        }));
      }
    };

  /**
   * Serialize the accumulated mappings in to the stream of base 64 VLQs
   * specified by the source map format.
   */
  SourceMapGenerator.prototype._serializeMappings =
    function SourceMapGenerator_serializeMappings() {
      var previousGeneratedColumn = 0;
      var previousGeneratedLine = 1;
      var previousOriginalColumn = 0;
      var previousOriginalLine = 0;
      var previousName = 0;
      var previousSource = 0;
      var result = '';
      var mapping;

      var mappings = this._mappings.toArray();
      for (var i = 0, len = mappings.length; i < len; i++) {
        mapping = mappings[i];

        if (mapping.generatedLine !== previousGeneratedLine) {
          previousGeneratedColumn = 0;
          while (mapping.generatedLine !== previousGeneratedLine) {
            result += ';';
            previousGeneratedLine++;
          }
        }
        else {
          if (i > 0) {
            if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
              continue;
            }
            result += ',';
          }
        }

        result += base64VLQ.encode(mapping.generatedColumn
                                   - previousGeneratedColumn);
        previousGeneratedColumn = mapping.generatedColumn;

        if (mapping.source != null) {
          result += base64VLQ.encode(this._sources.indexOf(mapping.source)
                                     - previousSource);
          previousSource = this._sources.indexOf(mapping.source);

          // lines are stored 0-based in SourceMap spec version 3
          result += base64VLQ.encode(mapping.originalLine - 1
                                     - previousOriginalLine);
          previousOriginalLine = mapping.originalLine - 1;

          result += base64VLQ.encode(mapping.originalColumn
                                     - previousOriginalColumn);
          previousOriginalColumn = mapping.originalColumn;

          if (mapping.name != null) {
            result += base64VLQ.encode(this._names.indexOf(mapping.name)
                                       - previousName);
            previousName = this._names.indexOf(mapping.name);
          }
        }
      }

      return result;
    };

  SourceMapGenerator.prototype._generateSourcesContent =
    function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
      return aSources.map(function (source) {
        if (!this._sourcesContents) {
          return null;
        }
        if (aSourceRoot != null) {
          source = util.relative(aSourceRoot, source);
        }
        var key = util.toSetString(source);
        return Object.prototype.hasOwnProperty.call(this._sourcesContents,
                                                    key)
          ? this._sourcesContents[key]
          : null;
      }, this);
    };

  /**
   * Externalize the source map.
   */
  SourceMapGenerator.prototype.toJSON =
    function SourceMapGenerator_toJSON() {
      var map = {
        version: this._version,
        sources: this._sources.toArray(),
        names: this._names.toArray(),
        mappings: this._serializeMappings()
      };
      if (this._file != null) {
        map.file = this._file;
      }
      if (this._sourceRoot != null) {
        map.sourceRoot = this._sourceRoot;
      }
      if (this._sourcesContents) {
        map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
      }

      return map;
    };

  /**
   * Render the source map being generated to a string.
   */
  SourceMapGenerator.prototype.toString =
    function SourceMapGenerator_toString() {
      return JSON.stringify(this.toJSON());
    };

  exports.SourceMapGenerator = SourceMapGenerator;

});

},{"./array-set":78,"./base64-vlq":79,"./mapping-list":82,"./util":87,"amdefine":88}],86:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var SourceMapGenerator = require('./source-map-generator').SourceMapGenerator;
  var util = require('./util');

  // Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
  // operating systems these days (capturing the result).
  var REGEX_NEWLINE = /(\r?\n)/;

  // Newline character code for charCodeAt() comparisons
  var NEWLINE_CODE = 10;

  // Private symbol for identifying `SourceNode`s when multiple versions of
  // the source-map library are loaded. This MUST NOT CHANGE across
  // versions!
  var isSourceNode = "$$$isSourceNode$$$";

  /**
   * SourceNodes provide a way to abstract over interpolating/concatenating
   * snippets of generated JavaScript source code while maintaining the line and
   * column information associated with the original source code.
   *
   * @param aLine The original line number.
   * @param aColumn The original column number.
   * @param aSource The original source's filename.
   * @param aChunks Optional. An array of strings which are snippets of
   *        generated JS, or other SourceNodes.
   * @param aName The original identifier.
   */
  function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
    this.children = [];
    this.sourceContents = {};
    this.line = aLine == null ? null : aLine;
    this.column = aColumn == null ? null : aColumn;
    this.source = aSource == null ? null : aSource;
    this.name = aName == null ? null : aName;
    this[isSourceNode] = true;
    if (aChunks != null) this.add(aChunks);
  }

  /**
   * Creates a SourceNode from generated code and a SourceMapConsumer.
   *
   * @param aGeneratedCode The generated code
   * @param aSourceMapConsumer The SourceMap for the generated code
   * @param aRelativePath Optional. The path that relative sources in the
   *        SourceMapConsumer should be relative to.
   */
  SourceNode.fromStringWithSourceMap =
    function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
      // The SourceNode we want to fill with the generated code
      // and the SourceMap
      var node = new SourceNode();

      // All even indices of this array are one line of the generated code,
      // while all odd indices are the newlines between two adjacent lines
      // (since `REGEX_NEWLINE` captures its match).
      // Processed fragments are removed from this array, by calling `shiftNextLine`.
      var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
      var shiftNextLine = function() {
        var lineContents = remainingLines.shift();
        // The last line of a file might not have a newline.
        var newLine = remainingLines.shift() || "";
        return lineContents + newLine;
      };

      // We need to remember the position of "remainingLines"
      var lastGeneratedLine = 1, lastGeneratedColumn = 0;

      // The generate SourceNodes we need a code range.
      // To extract it current and last mapping is used.
      // Here we store the last mapping.
      var lastMapping = null;

      aSourceMapConsumer.eachMapping(function (mapping) {
        if (lastMapping !== null) {
          // We add the code from "lastMapping" to "mapping":
          // First check if there is a new line in between.
          if (lastGeneratedLine < mapping.generatedLine) {
            var code = "";
            // Associate first line with "lastMapping"
            addMappingWithCode(lastMapping, shiftNextLine());
            lastGeneratedLine++;
            lastGeneratedColumn = 0;
            // The remaining code is added without mapping
          } else {
            // There is no new line in between.
            // Associate the code between "lastGeneratedColumn" and
            // "mapping.generatedColumn" with "lastMapping"
            var nextLine = remainingLines[0];
            var code = nextLine.substr(0, mapping.generatedColumn -
                                          lastGeneratedColumn);
            remainingLines[0] = nextLine.substr(mapping.generatedColumn -
                                                lastGeneratedColumn);
            lastGeneratedColumn = mapping.generatedColumn;
            addMappingWithCode(lastMapping, code);
            // No more remaining code, continue
            lastMapping = mapping;
            return;
          }
        }
        // We add the generated code until the first mapping
        // to the SourceNode without any mapping.
        // Each line is added as separate string.
        while (lastGeneratedLine < mapping.generatedLine) {
          node.add(shiftNextLine());
          lastGeneratedLine++;
        }
        if (lastGeneratedColumn < mapping.generatedColumn) {
          var nextLine = remainingLines[0];
          node.add(nextLine.substr(0, mapping.generatedColumn));
          remainingLines[0] = nextLine.substr(mapping.generatedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
        }
        lastMapping = mapping;
      }, this);
      // We have processed all mappings.
      if (remainingLines.length > 0) {
        if (lastMapping) {
          // Associate the remaining code in the current line with "lastMapping"
          addMappingWithCode(lastMapping, shiftNextLine());
        }
        // and add the remaining lines without any mapping
        node.add(remainingLines.join(""));
      }

      // Copy sourcesContent into SourceNode
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          if (aRelativePath != null) {
            sourceFile = util.join(aRelativePath, sourceFile);
          }
          node.setSourceContent(sourceFile, content);
        }
      });

      return node;

      function addMappingWithCode(mapping, code) {
        if (mapping === null || mapping.source === undefined) {
          node.add(code);
        } else {
          var source = aRelativePath
            ? util.join(aRelativePath, mapping.source)
            : mapping.source;
          node.add(new SourceNode(mapping.originalLine,
                                  mapping.originalColumn,
                                  source,
                                  code,
                                  mapping.name));
        }
      }
    };

  /**
   * Add a chunk of generated JS to this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.add = function SourceNode_add(aChunk) {
    if (Array.isArray(aChunk)) {
      aChunk.forEach(function (chunk) {
        this.add(chunk);
      }, this);
    }
    else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      if (aChunk) {
        this.children.push(aChunk);
      }
    }
    else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Add a chunk of generated JS to the beginning of this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
    if (Array.isArray(aChunk)) {
      for (var i = aChunk.length-1; i >= 0; i--) {
        this.prepend(aChunk[i]);
      }
    }
    else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      this.children.unshift(aChunk);
    }
    else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Walk over the tree of JS snippets in this node and its children. The
   * walking function is called once for each snippet of JS and is passed that
   * snippet and the its original associated source's line/column location.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walk = function SourceNode_walk(aFn) {
    var chunk;
    for (var i = 0, len = this.children.length; i < len; i++) {
      chunk = this.children[i];
      if (chunk[isSourceNode]) {
        chunk.walk(aFn);
      }
      else {
        if (chunk !== '') {
          aFn(chunk, { source: this.source,
                       line: this.line,
                       column: this.column,
                       name: this.name });
        }
      }
    }
  };

  /**
   * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
   * each of `this.children`.
   *
   * @param aSep The separator.
   */
  SourceNode.prototype.join = function SourceNode_join(aSep) {
    var newChildren;
    var i;
    var len = this.children.length;
    if (len > 0) {
      newChildren = [];
      for (i = 0; i < len-1; i++) {
        newChildren.push(this.children[i]);
        newChildren.push(aSep);
      }
      newChildren.push(this.children[i]);
      this.children = newChildren;
    }
    return this;
  };

  /**
   * Call String.prototype.replace on the very right-most source snippet. Useful
   * for trimming whitespace from the end of a source node, etc.
   *
   * @param aPattern The pattern to replace.
   * @param aReplacement The thing to replace the pattern with.
   */
  SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
    var lastChild = this.children[this.children.length - 1];
    if (lastChild[isSourceNode]) {
      lastChild.replaceRight(aPattern, aReplacement);
    }
    else if (typeof lastChild === 'string') {
      this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
    }
    else {
      this.children.push(''.replace(aPattern, aReplacement));
    }
    return this;
  };

  /**
   * Set the source content for a source file. This will be added to the SourceMapGenerator
   * in the sourcesContent field.
   *
   * @param aSourceFile The filename of the source file
   * @param aSourceContent The content of the source file
   */
  SourceNode.prototype.setSourceContent =
    function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
      this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
    };

  /**
   * Walk over the tree of SourceNodes. The walking function is called for each
   * source file content and is passed the filename and source content.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walkSourceContents =
    function SourceNode_walkSourceContents(aFn) {
      for (var i = 0, len = this.children.length; i < len; i++) {
        if (this.children[i][isSourceNode]) {
          this.children[i].walkSourceContents(aFn);
        }
      }

      var sources = Object.keys(this.sourceContents);
      for (var i = 0, len = sources.length; i < len; i++) {
        aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
      }
    };

  /**
   * Return the string representation of this source node. Walks over the tree
   * and concatenates all the various snippets together to one string.
   */
  SourceNode.prototype.toString = function SourceNode_toString() {
    var str = "";
    this.walk(function (chunk) {
      str += chunk;
    });
    return str;
  };

  /**
   * Returns the string representation of this source node along with a source
   * map.
   */
  SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
    var generated = {
      code: "",
      line: 1,
      column: 0
    };
    var map = new SourceMapGenerator(aArgs);
    var sourceMappingActive = false;
    var lastOriginalSource = null;
    var lastOriginalLine = null;
    var lastOriginalColumn = null;
    var lastOriginalName = null;
    this.walk(function (chunk, original) {
      generated.code += chunk;
      if (original.source !== null
          && original.line !== null
          && original.column !== null) {
        if(lastOriginalSource !== original.source
           || lastOriginalLine !== original.line
           || lastOriginalColumn !== original.column
           || lastOriginalName !== original.name) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
        lastOriginalSource = original.source;
        lastOriginalLine = original.line;
        lastOriginalColumn = original.column;
        lastOriginalName = original.name;
        sourceMappingActive = true;
      } else if (sourceMappingActive) {
        map.addMapping({
          generated: {
            line: generated.line,
            column: generated.column
          }
        });
        lastOriginalSource = null;
        sourceMappingActive = false;
      }
      for (var idx = 0, length = chunk.length; idx < length; idx++) {
        if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
          generated.line++;
          generated.column = 0;
          // Mappings end at eol
          if (idx + 1 === length) {
            lastOriginalSource = null;
            sourceMappingActive = false;
          } else if (sourceMappingActive) {
            map.addMapping({
              source: original.source,
              original: {
                line: original.line,
                column: original.column
              },
              generated: {
                line: generated.line,
                column: generated.column
              },
              name: original.name
            });
          }
        } else {
          generated.column++;
        }
      }
    });
    this.walkSourceContents(function (sourceFile, sourceContent) {
      map.setSourceContent(sourceFile, sourceContent);
    });

    return { code: generated.code, map: map };
  };

  exports.SourceNode = SourceNode;

});

},{"./source-map-generator":85,"./util":87,"amdefine":88}],87:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  /**
   * This is a helper function for getting values from parameter/options
   * objects.
   *
   * @param args The object we are extracting values from
   * @param name The name of the property we are getting.
   * @param defaultValue An optional value to return if the property is missing
   * from the object. If this is not specified and the property is missing, an
   * error will be thrown.
   */
  function getArg(aArgs, aName, aDefaultValue) {
    if (aName in aArgs) {
      return aArgs[aName];
    } else if (arguments.length === 3) {
      return aDefaultValue;
    } else {
      throw new Error('"' + aName + '" is a required argument.');
    }
  }
  exports.getArg = getArg;

  var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
  var dataUrlRegexp = /^data:.+\,.+$/;

  function urlParse(aUrl) {
    var match = aUrl.match(urlRegexp);
    if (!match) {
      return null;
    }
    return {
      scheme: match[1],
      auth: match[2],
      host: match[3],
      port: match[4],
      path: match[5]
    };
  }
  exports.urlParse = urlParse;

  function urlGenerate(aParsedUrl) {
    var url = '';
    if (aParsedUrl.scheme) {
      url += aParsedUrl.scheme + ':';
    }
    url += '//';
    if (aParsedUrl.auth) {
      url += aParsedUrl.auth + '@';
    }
    if (aParsedUrl.host) {
      url += aParsedUrl.host;
    }
    if (aParsedUrl.port) {
      url += ":" + aParsedUrl.port
    }
    if (aParsedUrl.path) {
      url += aParsedUrl.path;
    }
    return url;
  }
  exports.urlGenerate = urlGenerate;

  /**
   * Normalizes a path, or the path portion of a URL:
   *
   * - Replaces consequtive slashes with one slash.
   * - Removes unnecessary '.' parts.
   * - Removes unnecessary '<dir>/..' parts.
   *
   * Based on code in the Node.js 'path' core module.
   *
   * @param aPath The path or url to normalize.
   */
  function normalize(aPath) {
    var path = aPath;
    var url = urlParse(aPath);
    if (url) {
      if (!url.path) {
        return aPath;
      }
      path = url.path;
    }
    var isAbsolute = (path.charAt(0) === '/');

    var parts = path.split(/\/+/);
    for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
      part = parts[i];
      if (part === '.') {
        parts.splice(i, 1);
      } else if (part === '..') {
        up++;
      } else if (up > 0) {
        if (part === '') {
          // The first part is blank if the path is absolute. Trying to go
          // above the root is a no-op. Therefore we can remove all '..' parts
          // directly after the root.
          parts.splice(i + 1, up);
          up = 0;
        } else {
          parts.splice(i, 2);
          up--;
        }
      }
    }
    path = parts.join('/');

    if (path === '') {
      path = isAbsolute ? '/' : '.';
    }

    if (url) {
      url.path = path;
      return urlGenerate(url);
    }
    return path;
  }
  exports.normalize = normalize;

  /**
   * Joins two paths/URLs.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be joined with the root.
   *
   * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
   *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
   *   first.
   * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
   *   is updated with the result and aRoot is returned. Otherwise the result
   *   is returned.
   *   - If aPath is absolute, the result is aPath.
   *   - Otherwise the two paths are joined with a slash.
   * - Joining for example 'http://' and 'www.example.com' is also supported.
   */
  function join(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }
    if (aPath === "") {
      aPath = ".";
    }
    var aPathUrl = urlParse(aPath);
    var aRootUrl = urlParse(aRoot);
    if (aRootUrl) {
      aRoot = aRootUrl.path || '/';
    }

    // `join(foo, '//www.example.org')`
    if (aPathUrl && !aPathUrl.scheme) {
      if (aRootUrl) {
        aPathUrl.scheme = aRootUrl.scheme;
      }
      return urlGenerate(aPathUrl);
    }

    if (aPathUrl || aPath.match(dataUrlRegexp)) {
      return aPath;
    }

    // `join('http://', 'www.example.com')`
    if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
      aRootUrl.host = aPath;
      return urlGenerate(aRootUrl);
    }

    var joined = aPath.charAt(0) === '/'
      ? aPath
      : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

    if (aRootUrl) {
      aRootUrl.path = joined;
      return urlGenerate(aRootUrl);
    }
    return joined;
  }
  exports.join = join;

  /**
   * Make a path relative to a URL or another path.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be made relative to aRoot.
   */
  function relative(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }

    aRoot = aRoot.replace(/\/$/, '');

    // It is possible for the path to be above the root. In this case, simply
    // checking whether the root is a prefix of the path won't work. Instead, we
    // need to remove components from the root one by one, until either we find
    // a prefix that fits, or we run out of components to remove.
    var level = 0;
    while (aPath.indexOf(aRoot + '/') !== 0) {
      var index = aRoot.lastIndexOf("/");
      if (index < 0) {
        return aPath;
      }

      // If the only part of the root that is left is the scheme (i.e. http://,
      // file:///, etc.), one or more slashes (/), or simply nothing at all, we
      // have exhausted all components, so the path is not relative to the root.
      aRoot = aRoot.slice(0, index);
      if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
        return aPath;
      }

      ++level;
    }

    // Make sure we add a "../" for each component we removed from the root.
    return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
  }
  exports.relative = relative;

  /**
   * Because behavior goes wacky when you set `__proto__` on objects, we
   * have to prefix all the strings in our set with an arbitrary character.
   *
   * See https://github.com/mozilla/source-map/pull/31 and
   * https://github.com/mozilla/source-map/issues/30
   *
   * @param String aStr
   */
  function toSetString(aStr) {
    return '$' + aStr;
  }
  exports.toSetString = toSetString;

  function fromSetString(aStr) {
    return aStr.substr(1);
  }
  exports.fromSetString = fromSetString;

  /**
   * Comparator between two mappings where the original positions are compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same original source/line/column, but different generated
   * line and column the same. Useful when searching for a mapping with a
   * stubbed out mapping.
   */
  function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
    var cmp = mappingA.source - mappingB.source;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0 || onlyCompareOriginal) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
      return cmp;
    }

    return mappingA.name - mappingB.name;
  };
  exports.compareByOriginalPositions = compareByOriginalPositions;

  /**
   * Comparator between two mappings with deflated source and name indices where
   * the generated positions are compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same generated line and column, but different
   * source/name/original line and column the same. Useful when searching for a
   * mapping with a stubbed out mapping.
   */
  function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
    var cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0 || onlyCompareGenerated) {
      return cmp;
    }

    cmp = mappingA.source - mappingB.source;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0) {
      return cmp;
    }

    return mappingA.name - mappingB.name;
  };
  exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

  function strcmp(aStr1, aStr2) {
    if (aStr1 === aStr2) {
      return 0;
    }

    if (aStr1 > aStr2) {
      return 1;
    }

    return -1;
  }

  /**
   * Comparator between two mappings with inflated source and name strings where
   * the generated positions are compared.
   */
  function compareByGeneratedPositionsInflated(mappingA, mappingB) {
    var cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0) {
      return cmp;
    }

    return strcmp(mappingA.name, mappingB.name);
  };
  exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

});

},{"amdefine":88}],88:[function(require,module,exports){
(function (process,__filename){
/** vim: et:ts=4:sw=4:sts=4
 * @license amdefine 1.0.0 Copyright (c) 2011-2015, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/amdefine for details
 */

/*jslint node: true */
/*global module, process */
'use strict';

/**
 * Creates a define for node.
 * @param {Object} module the "module" object that is defined by Node for the
 * current module.
 * @param {Function} [requireFn]. Node's require function for the current module.
 * It only needs to be passed in Node versions before 0.5, when module.require
 * did not exist.
 * @returns {Function} a define function that is usable for the current node
 * module.
 */
function amdefine(module, requireFn) {
    'use strict';
    var defineCache = {},
        loaderCache = {},
        alreadyCalled = false,
        path = require('path'),
        makeRequire, stringRequire;

    /**
     * Trims the . and .. from an array of path segments.
     * It will keep a leading path segment if a .. will become
     * the first path segment, to help with module name lookups,
     * which act like paths, but can be remapped. But the end result,
     * all paths that use this function should look normalized.
     * NOTE: this method MODIFIES the input array.
     * @param {Array} ary the array of path segments.
     */
    function trimDots(ary) {
        var i, part;
        for (i = 0; ary[i]; i+= 1) {
            part = ary[i];
            if (part === '.') {
                ary.splice(i, 1);
                i -= 1;
            } else if (part === '..') {
                if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                    //End of the line. Keep at least one non-dot
                    //path segment at the front so it can be mapped
                    //correctly to disk. Otherwise, there is likely
                    //no path mapping for a path starting with '..'.
                    //This can still fail, but catches the most reasonable
                    //uses of ..
                    break;
                } else if (i > 0) {
                    ary.splice(i - 1, 2);
                    i -= 2;
                }
            }
        }
    }

    function normalize(name, baseName) {
        var baseParts;

        //Adjust any relative paths.
        if (name && name.charAt(0) === '.') {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                baseParts = baseName.split('/');
                baseParts = baseParts.slice(0, baseParts.length - 1);
                baseParts = baseParts.concat(name.split('/'));
                trimDots(baseParts);
                name = baseParts.join('/');
            }
        }

        return name;
    }

    /**
     * Create the normalize() function passed to a loader plugin's
     * normalize method.
     */
    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(id) {
        function load(value) {
            loaderCache[id] = value;
        }

        load.fromText = function (id, text) {
            //This one is difficult because the text can/probably uses
            //define, and any relative paths and requires should be relative
            //to that id was it would be found on disk. But this would require
            //bootstrapping a module/require fairly deeply from node core.
            //Not sure how best to go about that yet.
            throw new Error('amdefine does not implement load.fromText');
        };

        return load;
    }

    makeRequire = function (systemRequire, exports, module, relId) {
        function amdRequire(deps, callback) {
            if (typeof deps === 'string') {
                //Synchronous, single module require('')
                return stringRequire(systemRequire, exports, module, deps, relId);
            } else {
                //Array of dependencies with a callback.

                //Convert the dependencies to modules.
                deps = deps.map(function (depName) {
                    return stringRequire(systemRequire, exports, module, depName, relId);
                });

                //Wait for next tick to call back the require call.
                if (callback) {
                    process.nextTick(function () {
                        callback.apply(null, deps);
                    });
                }
            }
        }

        amdRequire.toUrl = function (filePath) {
            if (filePath.indexOf('.') === 0) {
                return normalize(filePath, path.dirname(module.filename));
            } else {
                return filePath;
            }
        };

        return amdRequire;
    };

    //Favor explicit value, passed in if the module wants to support Node 0.4.
    requireFn = requireFn || function req() {
        return module.require.apply(module, arguments);
    };

    function runFactory(id, deps, factory) {
        var r, e, m, result;

        if (id) {
            e = loaderCache[id] = {};
            m = {
                id: id,
                uri: __filename,
                exports: e
            };
            r = makeRequire(requireFn, e, m, id);
        } else {
            //Only support one define call per file
            if (alreadyCalled) {
                throw new Error('amdefine with no module ID cannot be called more than once per file.');
            }
            alreadyCalled = true;

            //Use the real variables from node
            //Use module.exports for exports, since
            //the exports in here is amdefine exports.
            e = module.exports;
            m = module;
            r = makeRequire(requireFn, e, m, module.id);
        }

        //If there are dependencies, they are strings, so need
        //to convert them to dependency values.
        if (deps) {
            deps = deps.map(function (depName) {
                return r(depName);
            });
        }

        //Call the factory with the right dependencies.
        if (typeof factory === 'function') {
            result = factory.apply(m.exports, deps);
        } else {
            result = factory;
        }

        if (result !== undefined) {
            m.exports = result;
            if (id) {
                loaderCache[id] = m.exports;
            }
        }
    }

    stringRequire = function (systemRequire, exports, module, id, relId) {
        //Split the ID by a ! so that
        var index = id.indexOf('!'),
            originalId = id,
            prefix, plugin;

        if (index === -1) {
            id = normalize(id, relId);

            //Straight module lookup. If it is one of the special dependencies,
            //deal with it, otherwise, delegate to node.
            if (id === 'require') {
                return makeRequire(systemRequire, exports, module, relId);
            } else if (id === 'exports') {
                return exports;
            } else if (id === 'module') {
                return module;
            } else if (loaderCache.hasOwnProperty(id)) {
                return loaderCache[id];
            } else if (defineCache[id]) {
                runFactory.apply(null, defineCache[id]);
                return loaderCache[id];
            } else {
                if(systemRequire) {
                    return systemRequire(originalId);
                } else {
                    throw new Error('No module with ID: ' + id);
                }
            }
        } else {
            //There is a plugin in play.
            prefix = id.substring(0, index);
            id = id.substring(index + 1, id.length);

            plugin = stringRequire(systemRequire, exports, module, prefix, relId);

            if (plugin.normalize) {
                id = plugin.normalize(id, makeNormalize(relId));
            } else {
                //Normalize the ID normally.
                id = normalize(id, relId);
            }

            if (loaderCache[id]) {
                return loaderCache[id];
            } else {
                plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});

                return loaderCache[id];
            }
        }
    };

    //Create a define function specific to the module asking for amdefine.
    function define(id, deps, factory) {
        if (Array.isArray(id)) {
            factory = deps;
            deps = id;
            id = undefined;
        } else if (typeof id !== 'string') {
            factory = id;
            id = deps = undefined;
        }

        if (deps && !Array.isArray(deps)) {
            factory = deps;
            deps = undefined;
        }

        if (!deps) {
            deps = ['require', 'exports', 'module'];
        }

        //Set up properties for this module. If an ID, then use
        //internal cache. If no ID, then use the external variables
        //for this node module.
        if (id) {
            //Put the module in deep freeze until there is a
            //require call for it.
            defineCache[id] = [id, deps, factory];
        } else {
            runFactory(id, deps, factory);
        }
    }

    //define.require, which has access to all the values in the
    //cache. Useful for AMD modules that all have IDs in the file,
    //but need to finally export a value to node based on one of those
    //IDs.
    define.require = function (id) {
        if (loaderCache[id]) {
            return loaderCache[id];
        }

        if (defineCache[id]) {
            runFactory.apply(null, defineCache[id]);
            return loaderCache[id];
        }
    };

    define.amd = {};

    return define;
}

module.exports = amdefine;

}).call(this,require("DbRmao"),"/node_modules/handlebars/node_modules/source-map/node_modules/amdefine/amdefine.js")
},{"DbRmao":5,"path":4}],89:[function(require,module,exports){
module.exports = function InstanceOf(obj, type) {
  if(obj === null) return false;
  if(type === 'array') type = 'Array';
  var t = typeof obj;
  if(t === 'object') {
    if(type.toLowerCase() === t) return true; // Object === object
    if(obj.constructor.name === type) return true;
    if(obj.constructor.toString().match(/function (\w*)/)[1] === type) return true;
    return InstanceOf(Object.getPrototypeOf(obj), type);
  } else {
    return t === type;
  }
};

},{}],90:[function(require,module,exports){
'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 *
 * IO Box
 *
 * @param {String} name
 */
var IOBox = function (name, args, returns) {

  if (!(this instanceof IOBox)) {
    return new IOBox(name, args, returns);
  }

  EventEmitter.apply(this, arguments);

  this.name = name || 'UNNAMED';

  // to ensure correct order
  this._keys = [];

  args = args || [];
  returns = returns || [];

  this.setup(args, returns);

};

util.inherits(IOBox, EventEmitter);

/**
 *
 * Setup
 *
 * @param {Array} args
 * @param {Array} returns
 */
IOBox.prototype.setup = function (args, returns) {

  var i;

  this.args = {};
  this.returns = [];
  this.fn = undefined;

  // setup the empty input arguments object
  for (i = 0; i < args.length; i++) {
    this.addArg(args[i], undefined);
  }

  for (i = 0; i < returns.length; i++) {
    this.addReturn(returns[i]);
  }
};

/**
 *
 * Used to access the properties at the top level,
 * but still be able to get all relevant arguments
 * at once using this.args
 *
 * @param {String} key
 * @param {Mixed} initial
 */
IOBox.prototype.addArg = function (key, initial) {

  Object.defineProperty(this, key, {
    set: function (val) {
      this.args[key] = val;
    },
    get: function () {
      return this.args[key];
    }
  });

  this._keys.push(key);

  this[key] = initial; // can be undefined

};

IOBox.prototype.addReturn = function (r) {
  if (this.returns.indexOf(r) === -1) {
    if (this._keys.indexOf(r) !== -1) {
      this.returns.push(r);
    }
    else {
      throw Error([
        'Output `',
        r,
        '` is not one of',
        this._keys.join(', ')
      ].join(' '));
    }
  }
};

/**
 *
 * Sets a property of the sandbox.
 * Because the keys determine what arguments will
 * be generated for the function, it is important
 * we keep some kind of control over what is set.
 *
 * @param {String} key
 * @param {Mixed} value
 *
 */
IOBox.prototype.set = function (key, value) {

  if (this.args.hasOwnProperty(key)) {
    this.args[key] = value;
  }
  else {
    throw new Error([
      'Will not set unknown property',
      key
    ].join(' '));
  }
};

/**
 *
 * Compiles and returns the generated function.
 *
 * @param {String} fn
 * @param {Boolean} asObject
 * @return {String}
 */
IOBox.prototype.compile = function (fn, asObject) {

  if (!this.code) {
    this.generate(fn ? fn.trim() : fn, asObject);
  }

  this.fn = new Function(this.code)();

  return this.fn;

};

/**
 *
 * Fill with a precompiled function
 *
 * Return type in this case is determined by compiled function
 *
 * @param {String} fn
 * @return {String}
 */
IOBox.prototype.fill = function (fn) {

  // argument signature check?

  this.fn = fn;

  return this.fn;

};

/**
 *
 * Wraps the function in yet another function
 *
 * This way it's possible to get the original return.
 *
 * @param {String} fn
 * @return {String}
 */
IOBox.prototype._returnWrap = function (fn) {
  return ['function() {', fn, '}.call(this)'].join('\n');
};
/**
 *
 * Clear generated code
 */
IOBox.prototype.clear = function () {
  this.code = null;
};

/**
 *
 * Generates the function.
 *
 * This can be used directly
 *
 * @param {String} fn
 * @param {Boolean} asObject
 * @return {String}
 */
IOBox.prototype.generate = function (fn, asObject) {

  this.code = [
    'return function ',
    this.name,
    '(',
    this._keys.join(','),
    ') {\n',
    'var r = ', // r goes to 'return'
    this._returnWrap(fn),
    '; return ',
    asObject ? this._asObject() : this._asArray(),
    '; }'
  ].join('');

  return this.code;
};

/**
 *
 * Return output as array.
 *
 * @return {String}
 */
IOBox.prototype._asArray = function () {
  return '[' + this.returns.join(',') + ',r]';
};

/**
 *
 * Return output as object.
 *
 * @return {String}
 */
IOBox.prototype._asObject = function () {
  var ret = [];
  for (var i = 0; i < this.returns.length; i++) {
    ret.push(this.returns[i] + ':' + this.returns[i]);
  }
  ret.push('return:' + 'r');

  return '{' + ret.join(',') + '}';
};

/**
 *
 * Renders the function to string.
 *
 * @return {String}
 */
IOBox.prototype.toString = function () {
  if (this.fn) return this.fn.toString();
  return this.fn;
};

/**
 *
 * Runs the generated function
 *
 * @param {Mixed} bind   Context to bind to the function
 * @return {Mixed}
 */
IOBox.prototype.run = function (bind) {

  var v = [];
  var k;

  for (k in this.args) {
    if (this.args.hasOwnProperty(k)) {
      v[this._keys.indexOf(k)] = this.args[k];
    }
    else {
      throw new Error('unknown input ' + k);
    }
  }

  // returns the output, format depends on the `compile` step
  return this.fn.apply(bind, v);

};

module.exports = IOBox;

},{"events":2,"util":7}],91:[function(require,module,exports){
/*!
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors.
 * Licensed under the MIT License
 */

'use strict';

module.exports = function isPlainObject(o) {
  return !!o && typeof o === 'object' && o.constructor === Object;
};
},{}],92:[function(require,module,exports){
exports.getType = function (obj) {
	switch (Object.prototype.toString.call(obj)) {
		case '[object String]':
			return 'string';
		case '[object Number]':
			return (obj % 1 === 0) ? 'integer' : 'number';
		case '[object Boolean]':
			return 'boolean';
		case '[object Object]':
			return 'object';
		case '[object Array]':
			return 'array';
		case '[object Null]':
			return 'null';
		default:
			return 'undefined';
	}
}

exports.prettyType = function(type) {
	switch (type) {
		case 'string':
		case 'number':
		case 'boolean':
			return 'a ' + type;
		case 'integer':
		case 'object':
		case 'array':
			return 'an ' + type;
		case 'null':
			return 'null';
		case 'any':
			return 'any type';
		case 'undefined':
			return 'undefined';
		default:
			if (typeof type === 'object') {
				return 'a schema'
			} else {
				return type;
			}
	}
}


exports.isOfType = function (obj, type) {
	switch (type) {
		case 'string':
		case 'number':
		case 'boolean':
		case 'object':
		case 'array':
		case 'null':
			type = type.charAt(0).toUpperCase() + type.slice(1);
			return Object.prototype.toString.call(obj) === '[object ' + type + ']';
		case 'integer':
			return Object.prototype.toString.call(obj) === '[object Number]' && obj % 1 === 0;
		case 'any':
		default:
			return true;
	}
}

exports.getName = function (names) {
	return names.length === 0 ? '' : ' property \'' + names.join('.') + '\'';
};

exports.deepEquals = function (obj1, obj2) {
	var p;

	if (Object.prototype.toString.call(obj1) !== Object.prototype.toString.call(obj2)) {
		return false;
	}

	switch (typeof obj1) {
		case 'object':
			if (obj1.toString() !== obj2.toString()) {
				return false;
			}
			for (p in obj1) {
				if (!(p in obj2)) {
					return false;
				}
				if (!exports.deepEquals(obj1[p], obj2[p])) {
					return false;
				}
			}
			for (p in obj2) {
				if (!(p in obj1)) {
					return false;
				}
			}
			return true;
		case 'function':
			return obj1[p].toString() === obj2[p].toString();
		default:
			return obj1 === obj2;
	}
};

},{}],93:[function(require,module,exports){
var RE_0_TO_100 = '([1-9]?[0-9]|100)';
var RE_0_TO_255 = '([1-9]?[0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])';

function validateFormatUtcMillisec(obj) {
	return obj >= 0;
}

function validateFormatRegExp(obj) {
	try {
		var re = RegExp(obj);
		return true;
	} catch(err) {
		return false;
	}
}

var COLORS = ['aqua', 'black', 'blue', 'fuchsia', 'gray', 'green', 'lime', 'maroon', 'navy', 'olive', 'orange', 'purple', 'red', 'silver', 'teal', 'white', 'yellow'];
var colorsReHex3 = /^#[0-9A-Fa-f]{3}$/; // #rgb
var colorsReHex6 = /^#[0-9A-Fa-f]{6}$/; // #rrggbb
var colorsReRgbNum = RegExp('^rgb\\(\\s*' + RE_0_TO_255 + '(\\s*,\\s*' + RE_0_TO_255 + '\\s*){2}\\)$'); // rgb(255, 0, 128)
var colorsReRgbPerc = RegExp('^rgb\\(\\s*' + RE_0_TO_100 + '%(\\s*,\\s*' + RE_0_TO_100 + '%\\s*){2}\\)$'); // rgb(100%, 0%, 50%)

function validateFormatColor(obj) {
	return COLORS.indexOf(obj) !== -1 || obj.match(colorsReHex3) || obj.match(colorsReHex6)
		|| obj.match(colorsReRgbNum) || obj.match(colorsReRgbPerc);
}

var phoneReNational = /^(\(\d+\)|\d+)( \d+)*$/;
var phoneReInternational = /^\+\d+( \d+)*$/;

function validateFormatPhone(obj) {
	return obj.match(phoneReNational) || obj.match(phoneReInternational);
}

var formats = {
	'date-time': { // ISO 8601 (YYYY-MM-DDThh:mm:ssZ in UTC time)
		types: ['string'],
		regex: /^\d{4}-\d{2}-\d{2}T[0-2]\d:[0-5]\d:[0-5]\d([.,]\d+)?Z$/
	},
	'date': { // YYYY-MM-DD
		types: ['string'],
		regex: /^\d{4}-\d{2}-\d{2}$/
	},
	'time': { // hh:mm:ss
		types: ['string'],
		regex: /^[0-2]\d:[0-5]\d:[0-5]\d$/
	},
	'utc-millisec': {
		types: ['number', 'integer'],
		func: validateFormatUtcMillisec
	},
	'regex': { // ECMA 262/Perl 5
		types: ['string'],
		func: validateFormatRegExp
	},
	'color': { // W3C.CR-CSS21-20070719
		types: ['string'],
		func: validateFormatColor
	},
	/* TODO: support style
		* style - A string containing a CSS style definition, based on CSS 2.1 [W3C.CR-CSS21-20070719].
		Example: `'color: red; background-color:#FFF'`.

	'style': { // W3C.CR-CSS21-20070719
		types: ['string'],
		func: validateFormatStyle
	},*/
   	'phone': { // E.123
		types: ['string'],
		func: validateFormatPhone
	},
	'uri': {
		types: ['string'],
		regex: RegExp("^([a-z][a-z0-9+.-]*):(?://(?:((?:[a-z0-9-._~!$&'()*+,;=:]|%[0-9A-F]{2})*)@)?((?:[a-z0-9-._~!$&'()*+,;=]|%[0-9A-F]{2})*)(?::(\\d*))?(/(?:[a-z0-9-._~!$&'()*+,;=:@/]|%[0-9A-F]{2})*)?|(/?(?:[a-z0-9-._~!$&'()*+,;=:@]|%[0-9A-F]{2})+(?:[a-z0-9-._~!$&'()*+,;=:@/]|%[0-9A-F]{2})*)?)(?:\\?((?:[a-z0-9-._~!$&'()*+,;=:/?@]|%[0-9A-F]{2})*))?(?:#((?:[a-z0-9-._~!$&'()*+,;=:/?@]|%[0-9A-F]{2})*))?$", 'i')
	},
	'email': {
		types: ['string'],
		regex: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i
	},
	'ip-address': {
		types: ['string'],
		regex: RegExp('^' + RE_0_TO_255 + '(\\.' + RE_0_TO_255 + '){3}$')
	},
	'ipv6': {
		types: ['string'],
		regex: /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i
	},
	'host-name': {
		types: ['string'],
		regex: /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/
	}
};

exports.formats = formats;

},{}],94:[function(require,module,exports){
var validateSchema = require('./valid-schema'),
	validateObject = require('./valid-object');

var Schema = function(schema) {
	this.schema = schema;
	validateSchema(schema);

	this.validate = function(obj, done) {
		validateObject(obj, schema, done);
	}
}

module.exports.createSchema = function (schema) {
	return new Schema(schema);
}

},{"./valid-object":95,"./valid-schema":96}],95:[function(require,module,exports){
var formats = require('./formats').formats;
var common = require('./common'),
	getType = common.getType,
	prettyType = common.prettyType,
	isOfType = common.isOfType,
	getName = common.getName,
	deepEquals = common.deepEquals;

function throwInvalidValue(names, value, expected) {
	throw new Error('JSON object' + getName(names) + ' is ' + value + ' when it should be ' + expected);
}

function throwInvalidAttributeValue(names, attribFullName, value, expected) {
	throw new Error('JSON object' + getName(names) + ': ' + attribFullName + ' is ' + value + ' when it should be ' + expected);
}

function throwInvalidType(names, value, expected) {
	throw new Error('JSON object' + getName(names) + ' is ' + prettyType(getType(value)) + ' when it should be ' + expected);
}

function throwInvalidDisallow(names, value, expected) {
	throw new Error('JSON object' + getName(names) + ' is ' + prettyType(getType(value)) + ' when it should not be ' + expected);
}

function validateRequired(obj, schema, names) {
	//console.log('***', names, 'validateRequired');
	if (schema.required) {
		if (obj === undefined) {
			throw new Error('JSON object' + getName(names) + ' is required');
		}
	}
}

function applyDefault(obj, schema, names) {
	//console.log('***', names, 'applyDefault');
	if (schema.default !== undefined) {
		obj = schema.default;
	}

	return obj;
}

function validateType(obj, schema, names) {
	//console.log('***', names, 'validateType');
	if (schema.type !== undefined) {
		switch (getType(schema.type)) {
			case 'string':
				// simple type
				if (!isOfType(obj, schema.type)) {
					throwInvalidType(names, obj, prettyType(schema.type));
				}
				break;
			case 'array':
				// union type
				for (var i = 0; i < schema.type.length; ++i) {
					switch (getType(schema.type[i])) {
						case 'string':
							// simple type (inside union type)
							if (isOfType(obj, schema.type[i])) {
								return; // success
							}
							break;
						case 'object':
							// schema (inside union type)
							try {
								return validateSchema(obj, schema.type[i], names);
							} catch(err) {
								// validation failed
								// TOOD: consider propagating error message upwards
							}
							break;
					}
				}
				throwInvalidType(names, obj, 'either ' + schema.type.map(prettyType).join(' or '));
				break;
		}
	}
}

function validateDisallow(obj, schema, names) {
	//console.log('***', names, 'validateDisallow');
	if (schema.disallow !== undefined) {
		switch (getType(schema.disallow)) {
			case 'string':
				// simple type
				if (isOfType(obj, schema.disallow)) {
					throwInvalidDisallow(names, obj, prettyType(schema.disallow));
				}
				break;
			case 'array':
				// union type
				for (var i = 0; i < schema.disallow.length; ++i) {
					switch (getType(schema.disallow[i])) {
						case 'string':
							// simple type (inside union type)
							if (isOfType(obj, schema.disallow[i])) {
								throwInvalidType(names, obj, 'neither ' + schema.disallow.map(prettyType).join(' nor '));
							}
							break;
						case 'object':
							// schema (inside union type)
							try {
								validateSchema(obj, schema.disallow[i], names);
							} catch(err) {
								// validation failed
								continue;
							}
							throwInvalidType(names, obj, 'neither ' + schema.disallow.map(prettyType).join(' nor '));
							// TOOD: consider propagating error message upwards
							break;
					}
				}
				break;
		}
	}
}

function validateEnum(obj, schema, names) {
	//console.log('***', names, 'validateEnum');
	if (schema['enum'] !== undefined) {
		for (var i = 0; i < schema['enum'].length; ++i) {
			if (deepEquals(obj, schema['enum'][i])) {
				return;
			}
		}
		throw new Error('JSON object' + getName(names) + ' is not in enum');
	}
}

function validateArray(obj, schema, names) {
	//console.log('***', names, 'validateArray');
	var i, j;

	if (schema.minItems !== undefined) {
		if (obj.length < schema.minItems) {
			throwInvalidAttributeValue(names, 'number of items', obj.length, 'at least ' + schema.minItems);
		}
	}

	if (schema.maxItems !== undefined) {
		if (obj.length > schema.maxItems) {
			throwInvalidAttributeValue(names, 'number of items', obj.length, 'at most ' + schema.maxItems);
		}
	}

	if (schema.items !== undefined) {
		switch (getType(schema.items)) {
			case 'object':
				// all the items in the array MUST be valid according to the schema
				for (i = 0; i < obj.length; ++i) {
					obj[i] = validateSchema(obj[i], schema.items, names.concat([ '['+i+']' ]));
				}
				break;
			case 'array':
				// each position in the instance array MUST conform to the schema in the corresponding position for this array
				var numChecks = Math.min(obj.length, schema.items.length);
				for (i = 0; i < numChecks; ++i) {
					obj[i] = validateSchema(obj[i], schema.items[i], names.concat([ '['+i+']' ]));
				}
				if (obj.length > schema.items.length) {
					if (schema.additionalItems !== undefined) {
						if (schema.additionalItems === false) {
							throwInvalidAttributeValue(names, 'number of items', obj.length, 'at most ' + schema.items.length + ' - the length of schema items');
						}
						for (; i < obj.length; ++i) {
							obj[i] = validateSchema(obj[i], schema.additionalItems, names.concat([ '['+i+']' ]));
						}
					}
				}
				break;
		}
	}

	if (schema.uniqueItems !== undefined) {
		for (i = 0; i < obj.length - 1; ++i) {
			for (j = i + 1; j < obj.length; ++j) {
				if (deepEquals(obj[i], obj[j])) {
					throw new Error('JSON object' + getName(names) + ' items are not unique: element ' + i + ' equals element ' + j);
				}
			}
		}
	}
}

function validateObject(obj, schema, names) {
	//console.log('***', names, 'validateObject');
	var prop, property;
	if (schema.properties !== undefined) {
		for (property in schema.properties) {
			prop = validateSchema(obj[property], schema.properties[property], names.concat([property]));
			if (prop === undefined) {
				delete obj[property];
			} else {
				obj[property] = prop;
			}
		}
	}

	var matchingProperties = {};
	if (schema.patternProperties !== undefined) {
		for (var reStr in schema.patternProperties) {
			var re = RegExp(reStr);
			for (property in obj) {
				if (property.match(re)) {
					matchingProperties[property] = true;
					prop = validateSchema(obj[property], schema.patternProperties[reStr], names.concat(['patternProperties./' + property + '/']));
					if (prop === undefined) {
						delete obj[property];
					} else {
						obj[property] = prop;
					}
				}
			}
		}
	}

	if (schema.additionalProperties !== undefined) {
		for (property in obj) {
			if (schema.properties !== undefined && property in schema.properties) {
				continue;
			}
			if (property in matchingProperties) {
				continue;
			}
			// additional
			if (schema.additionalProperties === false) {
				throw new Error('JSON object' + getName(names.concat([property])) + ' is not explicitly defined and therefore not allowed');
			}
			obj[property] = validateSchema(obj[property], schema.additionalProperties, names.concat([property]));
		}
	}

	if (schema.dependencies !== undefined) {
		for (property in schema.dependencies) {
			switch (getType(schema.dependencies[property])) {
				case 'string':
					// simple dependency
					if (property in obj && !(schema.dependencies[property] in obj)) {
						throw new Error('JSON object' + getName(names.concat([schema.dependencies[property]])) + ' is required by property \'' + property + '\'');
					}
					break;
				case 'array':
					// simple dependency tuple
					for (var i = 0; i < schema.dependencies[property].length; ++i) {
						if (property in obj && !(schema.dependencies[property][i] in obj)) {
							throw new Error('JSON object' + getName(names.concat([schema.dependencies[property][i]])) + ' is required by property \'' + property + '\'');
						}
					}
					break;
				case 'object':
					// schema dependency
					validateSchema(obj, schema.dependencies[property], names.concat([ '[dependencies.'+property+']' ]));
					break;
			}
		}
	}
}

function validateNumber(obj, schema, names) {
	//console.log('***', names, 'validateNumber');

	if (schema.minimum !== undefined) {
		if (schema.exclusiveMinimum ? obj <= schema.minimum : obj < schema.minimum) {
			throwInvalidValue(names, obj, (schema.exclusiveMinimum ? 'greater than' : 'at least') + ' ' + schema.minimum);
		}
	}

	if (schema.maximum !== undefined) {
		if (schema.exclusiveMaximum ? obj >= schema.maximum : obj > schema.maximum) {
			throwInvalidValue(names, obj, (schema.exclusiveMaximum ? 'less than' : 'at most') + ' ' + schema.maximum);
		}
	}

	if (schema.divisibleBy !== undefined) {
		if (!isOfType(obj / schema.divisibleBy, 'integer')) {
			throwInvalidValue(names, obj, 'divisible by ' + schema.divisibleBy);
		}
	}
}

function validateString(obj, schema, names) {
	//console.log('***', names, 'validateString');

	if (schema.minLength !== undefined) {
		if (obj.length < schema.minLength) {
			throwInvalidAttributeValue(names, 'length', obj.length, 'at least ' + schema.minLength);
		}
	}

	if (schema.maxLength !== undefined) {
		if (obj.length > schema.maxLength) {
			throwInvalidAttributeValue(names, 'length', obj.length, 'at most ' + schema.maxLength);
		}
	}

	if (schema.pattern !== undefined) {
		if (!obj.match(RegExp(schema.pattern))) {
			throw new Error('JSON object' + getName(names) + ' does not match pattern');
		}
	}
}

function validateFormat(obj, schema, names) {
	//console.log('***', names, 'validateFormat');
	if (schema.format !== undefined) {
		var format = formats[schema.format];
		if (format !== undefined) {
			var conforms = true;
			if (format.regex) {
				conforms = obj.match(format.regex);
			} else if (format.func) {
				conforms = format.func(obj);
			}
			if (!conforms) {
				throw new Error('JSON object' + getName(names) + ' does not conform to the \'' + schema.format + '\' format');
			}
		}
	}
}

function validateItem(obj, schema, names) {
	//console.log('***', names, 'validateItem');
	switch (getType(obj)) {
		case 'number':
		case 'integer':
			validateNumber(obj, schema, names);
			break;
		case 'string':
			validateString(obj, schema, names);
			break;
	}

	validateFormat(obj, schema, names);
}

function validateSchema(obj, schema, names) {
	//console.log('***', names, 'validateSchema');

	validateRequired(obj, schema, names);
	if (obj === undefined) {
		obj = applyDefault(obj, schema, names);
	}
	if (obj !== undefined) {
		validateType(obj, schema, names);
		validateDisallow(obj, schema, names);
		validateEnum(obj, schema, names);

		switch (getType(obj)) {
			case 'object':
				validateObject(obj, schema, names);
				break;
			case 'array':
				validateArray(obj, schema, names);
				break;
			default:
				validateItem(obj, schema, names);
		}
	}

	return obj;
}

// Two operation modes:
// * Synchronous - done callback is not provided. will return nothing or throw error
// * Asynchronous - done callback is provided. will not throw error.
//        will call callback with error as first parameter and object as second
// Schema is expected to be validated.
module.exports = function(obj, schema, done) {
	try {
		validateSchema(obj, schema, []);
	} catch(err) {
		if (done) {
			done(err);
			return;
		} else {
			throw err;
		}
	} 

	if (done) {
		done(null, obj);
	}
};

},{"./common":92,"./formats":93}],96:[function(require,module,exports){
var formats = require('./formats').formats;
var common = require('./common'),
	getType = common.getType,
	prettyType = common.prettyType,
	isOfType = common.isOfType,
	getName = common.getName,
	validateObjectVsSchema = require('./valid-object');

function throwInvalidType(names, attribFullName, value, expected) {
	throw new Error('Schema' + getName(names) + ': ' + attribFullName + ' is ' + prettyType(getType(value)) + ' when it should be ' + expected);
}

function assertType(schema, attribName, expectedType, names) {
	if (schema[attribName] !== undefined) {
		if (!isOfType(schema[attribName], expectedType)) {
			throwInvalidType(names, '\'' + attribName + '\' attribute', schema[attribName], prettyType(expectedType));
		}
	}
}

function validateRequired(schema, names) {
	assertType(schema, 'required', 'boolean', names);
}

function validateDefault(schema, names) {
	if (schema.default !== undefined) {
		try {
			validateObjectVsSchema(schema.default, schema);
		} catch(err) {
			throw new Error('Schema' + getName(names) + ': \'default\' attribute value is not valid according to the schema: ' + err.message);
		}
	}
}

function validateType(schema, names) {
	if (schema.type !== undefined) {
		switch (getType(schema.type)) {
			case 'string':
				// simple type - nothing to validate
				break;
			case 'array':
				// union type
				if (schema.type.length < 2) {
					throw new Error('Schema' + getName(names) + ': \'type\' attribute union length is ' + schema.type.length + ' when it should be at least 2');
				}
				for (var i = 0; i < schema.type.length; ++i) {
					switch (getType(schema.type[i])) {
						case 'string':
							// simple type (inside union type) - nothing to validate
							break;
						case 'object':
							// schema (inside union type)
							try {
								validateSchema(schema.type[i], []);
							} catch(err) {
								throw new Error('Schema' + getName(names) + ': \'type\' attribute union element ' + i + ' is not a valid schema: ' + err.message);
							}
							break;
						default:
							throwInvalidType(names, '\'type\' attribute union element ' + i, schema.type[i], 'either an object (schema) or a string');
					}
				}
				break;
			default:
				throwInvalidType(names, '\'type\' attribute', schema.type, 'either a string or an array');
		}
	}
}

function validateDisallow(schema, names) {
	if (schema.disallow !== undefined) {
		switch (getType(schema.disallow)) {
			case 'string':
				// simple type - nothing to validate
				break;
			case 'array':
				// union type
				if (schema.disallow.length < 2) {
					throw new Error('Schema' + getName(names) + ': \'disallow\' attribute union length is ' + schema.disallow.length + ' when it should be at least 2');
				}
				for (var i = 0; i < schema.disallow.length; ++i) {
					switch (getType(schema.disallow[i])) {
						case 'string':
							// simple type (inside union type) - nothing to validate
							break;
						case 'object':
							// schema (inside union type)
							try {
								validateSchema(schema.disallow[i], []);
							} catch(err) {
								throw new Error('Schema' + getName(names) + ': \'disallow\' attribute union element ' + i + ' is not a valid schema: ' + err.message);
							}
							break;
						default:
							throwInvalidType(names, '\'disallow\' attribute union element ' + i, schema.disallow[i], 'either an object (schema) or a string');
					}
				}
				break;
			default:
				throwInvalidType(names, '\'disallow\' attribute', schema.disallow, 'either a string or an array');
		}
	}
}

function validateEnum(schema, names) {
	assertType(schema, 'enum', 'array', names);
}

function validateArray(schema, names) {
	assertType(schema, 'minItems', 'integer', names);
	assertType(schema, 'maxItems', 'integer', names);

	if (schema.items !== undefined) {
		var i;
		switch (getType(schema.items)) {
			case 'object':
				// all the items in the array MUST be valid according to the schema
				try {
					validateSchema(schema.items, []);
				} catch(err) {
					throw new Error('Schema' + getName(names) + ': \'items\' attribute is not a valid schema: ' + err.message);
				}
				break;
			case 'array':
				// each position in the instance array MUST conform to the schema in the corresponding position for this array
				for (i = 0; i < schema.items.length; ++i) {
					try {
						validateSchema(schema.items[i], []);
					} catch(err) {
						throw new Error('Schema' + getName(names) + ': \'items\' attribute element ' + i + ' is not a valid schema: ' + err.message);
					}
				}
				break;
			default:
				throwInvalidType(names, '\'items\' attribute', schema.items, 'either an object (schema) or an array');
		}
	}

	if (schema.additionalItems !== undefined) {
		if (schema.additionalItems === false) {
			// ok
		} else if (!isOfType(schema.additionalItems, 'object')) {
			throwInvalidType(names, '\'additionalItems\' attribute', schema.additionalItems, 'either an object (schema) or false');
		} else {
			try {
				validateSchema(schema.additionalItems, []);
			} catch(err) {
				throw new Error('Schema' + getName(names) + ': \'additionalItems\' attribute is not a valid schema: ' + err.message);
			}
		}
	}

	assertType(schema, 'uniqueItems', 'boolean', names);
}

function validateObject(schema, names) {
	assertType(schema, 'properties', 'object', names);
	if (schema.properties !== undefined) {
		for (var property in schema.properties) {
			validateSchema(schema.properties[property], names.concat([property]));
		}
	}

	assertType(schema, 'patternProperties', 'object', names);
	if (schema.patternProperties !== undefined) {
		for (var reStr in schema.patternProperties) {
			validateSchema(schema.patternProperties[reStr], names.concat(['patternProperties./' + reStr + '/']));
		}
	}

	if (schema.additionalProperties !== undefined) {
		if (schema.additionalProperties === false) {
			// ok
		} else if (!isOfType(schema.additionalProperties, 'object')) {
			throwInvalidType(names, '\'additionalProperties\' attribute', schema.additionalProperties, 'either an object (schema) or false');
		} else {
			try {
				validateSchema(schema.additionalProperties, []);
			} catch(err) {
				throw new Error('Schema' + getName(names) + ': \'additionalProperties\' attribute is not a valid schema: ' + err.message);
			}
		}
	}

	assertType(schema, 'dependencies', 'object', names);
	if (schema.dependencies !== undefined) {
		for (var property in schema.dependencies) {
			switch (getType(schema.dependencies[property])) {
				case 'string':
					// simple dependency - nothing to validate
					break;
				case 'array':
					// simple dependency tuple
					for (var i = 0; i < schema.dependencies[property].length; ++i) {
						if (isOfType(schema.dependencies[property][i], 'string')) {
							// simple dependency (inside array) - nothing to validate
						} else {
							throwInvalidType(names, '\'dependencies\' attribute: value of property \'' + property + '\' element ' + i, schema.dependencies[property][i], 'a string');
						}
					}
					break;
				case 'object':
					// schema dependency
					try {
						validateSchema(schema.dependencies[property], []);
					} catch(err) {
						throw new Error('Schema' + getName(names) + ': \'dependencies\' attribute: value of property \'' + property + '\' is not a valid schema: ' + err.message);
					}
					break;
				default:
					throwInvalidType(names, '\'dependencies\' attribute: value of property \'' + property + '\'', schema.dependencies[property], 'either a string, an array or an object (schema)');
			}
		}
	}
}

function validateNumber(schema, names) {
	assertType(schema, 'minimum', 'number', names);
	assertType(schema, 'exclusiveMinimum', 'boolean', names);
	assertType(schema, 'maximum', 'number', names);
	assertType(schema, 'exclusiveMaximum', 'boolean', names);
	assertType(schema, 'divisibleBy', 'number', names);
	if (schema.divisibleBy !== undefined) {
		if (schema.divisibleBy === 0) {
			throw new Error('Schema' + getName(names) + ': \'divisibleBy\' attribute must not be 0');
		}
	}
};

function validateString(schema, names) {
	assertType(schema, 'minLength', 'integer', names);
	assertType(schema, 'maxLength', 'integer', names);
	assertType(schema, 'pattern', 'string', names);
}

function validateFormat(schema, names) {
	assertType(schema, 'format', 'string', names);

	if (schema.format !== undefined) {
		if (schema.format in formats) {
			if (formats[schema.format].types.indexOf(schema.type) === -1) {
				throw new Error('Schema' + getName(names) + ': \'type\' attribute does not conform to the \'' + schema.format + '\' format');
			}
		}
	}
}

function validateItem(schema, names) {
	validateNumber(schema, names);
	validateString(schema, names);
	validateFormat(schema, names);
}

function validateSchema(schema, names) {
	if (!isOfType(schema, 'object')) {
		throw new Error('Schema' + getName(names) + ' is ' + prettyType(getType(schema)) + ' when it should be an object');
	}
	validateRequired(schema, names);
	validateType(schema, names);
	validateDisallow(schema, names);
	validateEnum(schema, names);
	validateObject(schema, names);
	validateArray(schema, names);
	validateItem(schema, names);
	// defaults are applied last after schema is validated
	validateDefault(schema, names);
}

module.exports = function(schema) {
	if (schema === undefined) {
		throw new Error('Schema is undefined');
	}

	// validate schema parameters for object root
	if (!isOfType(schema, 'object')) {
		throw new Error('Schema is ' + prettyType(getType(schema)) + ' when it should be an object');
	}

	validateSchema(schema, []);
};

},{"./common":92,"./formats":93,"./valid-object":95}],97:[function(require,module,exports){
'use strict';

var proto = Element.prototype;
var vendor = proto.matches
  || proto.matchesSelector
  || proto.webkitMatchesSelector
  || proto.mozMatchesSelector
  || proto.msMatchesSelector
  || proto.oMatchesSelector;

module.exports = match;

/**
 * Match `el` to `selector`.
 *
 * @param {Element} el
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

function match(el, selector) {
  if (vendor) return vendor.call(el, selector);
  var nodes = el.parentNode.querySelectorAll(selector);
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] == el) return true;
  }
  return false;
}
},{}],98:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],"router-lib":[function(require,module,exports){
module.exports=require('ifsK7d');
},{}],"ifsK7d":[function(require,module,exports){
module.exports = {
  router: require('./router'),
  helpers: require('./lib/helpers'),
  browser: require('./lib/browser'),
  Route: require('./lib/Route'),
  Matcher: require('./lib/Matcher'),
  Params: require('./lib/Params'),
  Query: require('./lib/Query')
};

},{"./lib/Matcher":101,"./lib/Params":102,"./lib/Query":103,"./lib/Route":104,"./lib/browser":105,"./lib/helpers":106,"./router":110}],101:[function(require,module,exports){
var regexpFromPath = require('path-to-regexp');
var helpers = require('./helpers');

var Matcher = {};

Matcher.fromPaths = function(paths) {
  return helpers.map(Matcher.fromPath, paths);
};

Matcher.fromPath = function(path) {
  var keys = [];
  var regexp = regexpFromPath(path, keys);
  return {
    path: path,
    regexp: regexp,
    keys: keys
  };
};

Matcher.matchWithRegexp = function(matchers, pattern) {
  return helpers.reduce(function(match, matcher) {
    if (match) {
      return match;
    }
    var regexp = matcher.regexp;
    if (regexp.test(pattern)) {
      return matcher;
    }
    return null;
  }, null, matchers);
};

Matcher.matchWithPath = function(matchers, path) {
  return helpers.reduce(function(match, matcher) {
    if (match) {
      return match;
    }
    if (matcher.path === path) {
      return matcher;
    }
    return null;
  }, null, matchers);
};

module.exports = Matcher;

},{"./helpers":106,"path-to-regexp":108}],102:[function(require,module,exports){
var helpers = require('./helpers');
var browser = require('./browser');

var Params = {};

Params.injectIntoPath = function(path, params) {
  var pattern = path;
  var paramNames = helpers.properties(params);
  helpers.each(function(name) {
    pattern = pattern.replace(':' + name, browser.uriEncode(params[name]));
  }, paramNames);
  return pattern;
};

Params.fromMatchedPattern = function(matcher, pattern) {
  var values = matcher.regexp.exec(pattern);
  if (!values) {
    return null;
  }
  values = helpers.slice(values, 1);
  var params = helpers.reduce(function(acc, key, index) {
    acc[key.name] = browser.uriDecode(values[index]);
    return acc;
  }, {}, matcher.keys);
  if (!helpers.properties(params).length) {
    return null;
  }
  return params;
};

module.exports = Params;

},{"./browser":105,"./helpers":106}],103:[function(require,module,exports){
var qs = require('qs');

var Query = {};

Query._regexp = /\?(.+)/;

Query.stringify = function(query) {
  return qs.stringify(query);
};

Query.parse = function(queryString) {
  return qs.parse(queryString);
};

Query.uriWithoutQueryString = function(uri) {
  return uri.replace(Query._regexp, '');
};

Query.fromUri = function(uri) {
  var queryString = Query._queryStringFromUri(uri);
  if (!queryString) {
    return null;
  }
  return Query.parse(queryString);
};

Query._queryStringFromUri = function(uri) {
  var match = uri.match(Query._regexp);
  return match && match[1];
};

module.exports = Query;

},{"qs":109}],104:[function(require,module,exports){
var Params = require('./Params');
var Query = require('./Query');

var Route = {};

Route.toUri = function(route) {
  var uri = Route._injectParams(route);

  var query = route.query;
  if (query) {
    uri = uri + '?' + Query.stringify(query);
  }

  return uri;
};

Route._injectParams = function(route) {
  var path = route.path;
  if (!path) {
    throw new Error('Can\'t build URI pattern from route without a "path" property');
  }
  var params = route.params || {};
  return Params.injectIntoPath(path, params);
};

Route.fromMatchedUri = function(matcher, uri) {
  var pattern = Query.uriWithoutQueryString(uri);
  var params = Params.fromMatchedPattern(matcher, pattern);
  var query = Query.fromUri(uri);

  var route = {path: matcher.path};
  if (params) {
    route.params = params;
  }
  if (query) {
    route.query = query;
  }

  return route;
};

module.exports = Route;

},{"./Params":102,"./Query":103}],105:[function(require,module,exports){
var helpers = require('./helpers');

var browser = {};

browser.on = function(eventName, handler, context) {
  window.addEventListener(eventName, helpers.bind(handler, context), false);
};

browser.uriEncode = function(str) {
  return encodeURIComponent(str);
};

browser.uriDecode = function(str) {
  return decodeURIComponent(str);
};

browser.setUri = function(uri) {
  location.hash = uri;
};

browser.replaceUri = function(uri) {
  location.replace('#' + uri);
};

browser.getCurrentUri = function () {
  return location.hash.replace('#', '');
};

module.exports = browser;

},{"./helpers":106}],106:[function(require,module,exports){
var fn = require('fn.js');

var helpers = {};

helpers.slice = function(array) {
  var args = Array.prototype.slice.call(arguments, 1);
  return Array.prototype.slice.apply(array, args);
};

helpers.bind = function(func, context) {
  return function() {
    func.apply(context, Array.prototype.slice.call(arguments));
  };
};

helpers.map = fn.map;

helpers.reduce = fn.reduce;

helpers.each = fn.each;

helpers.properties = fn.properties;

module.exports = helpers;

},{"fn.js":107}],107:[function(require,module,exports){
(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define(factory);
	} else if (typeof exports === 'object') {
		module.exports = factory(require, exports, module);
	} else {
		root.fn = factory();
	}
}(this, function(require, exports, module) {
'use strict';

var fn = { };

fn.toArray = function (collection) {
	return [ ].slice.call(collection);
};

fn.cloneArray = fn.toArray;

fn.op = {
	'+': function (value1, value2) {
		return value1 + value2;
	},
	'-': function (value1, value2) {
		return value1 - value2;
	},
	'*': function (value1, value2) {
		return value1 * value2;
	},
	'/': function (value1, value2) {
		return value1 / value2;
	},
	'==': function (value1, value2) {
		/*eslint-disable eqeqeq */
		return value1 == value2;
		/*eslint-enable eqeqeq */
	},
	'===': function (value1, value2) {
		return value1 === value2;
	}
};

fn.type = function (value) {
	// If the value is null or undefined, return the stringified name,
	// otherwise get the [[Class]] and compare to the relevant part of the value
	return value == null ?
		'' + value :
		{ }.toString.call(value).slice(8, -1).toLowerCase();
};

fn.is = function (type, value) {
	return type === fn.type(value);
};

fn.apply = function (handler, args) {
	return handler.apply(null, args);
};

fn.concat = function () {
	var args = fn.toArray(arguments);
	var first = args[ 0 ];

	if (!fn.is('array', first) && !fn.is('string', first)) {
		first = args.length ? [ first ] : [ ];
	}

	return first.concat.apply(first, args.slice(1));
};

fn.partial = function () {
	var args = fn.toArray(arguments);
	var handler = args[ 0 ];
	var partialArgs = args.slice(1);

	return function () {
		return fn.apply(handler, fn.concat(partialArgs, fn.toArray(arguments)) );
	};
};

fn.identity = function (arg) {
	return arg;
};

var currier = function makeCurry(rightward) {
	return function (handler, arity) {
		if (handler.curried) {
			return handler;
		}

		arity = arity || handler.length;

		var curry = function curry() {
			var args = fn.toArray(arguments);

			if (args.length >= arity) {
				var transform = rightward ? 'reverse' : 'identity';
				return fn.apply(handler, fn[ transform ](args));
			}

			var inner = function () {
				return fn.apply(curry, args.concat(fn.toArray(arguments)));
			};

			inner.curried = true;

			return inner;
		};

		curry.curried = true;

		return curry;
	};
};

fn.curry = currier(false);

fn.curryRight = currier(true);

fn.properties = function (object) {
	var accumulator = [ ];

	for (var property in object) {
		if (object.hasOwnProperty(property)) {
			accumulator.push(property);
		}
	}

	return accumulator;
};

fn.each = function (handler, collection, params) {
	for (var index = 0, collectionLength = collection.length; index < collectionLength; index++) {
		fn.apply(handler, fn.concat([ collection[ index ], index, collection ], params));
	}
};

fn.reduce = function (handler, accumulator, collection, params) {
	fn.each(function (value, index) {
		accumulator = fn.apply(handler, fn.concat([ accumulator, value, index ], params));
	}, collection);

	return accumulator;
};

fn.filter = function (expression, collection) {
	return fn.reduce(function (accumulator, item, index) {
		expression(item, index) && accumulator.push(item);
		return accumulator;
	}, [ ], collection);
};

fn.op[ '++' ] = fn.partial(fn.op[ '+' ], 1);
fn.op[ '--' ] = fn.partial(fn.op[ '+' ], -1);

fn.map = function (handler, collection, params) {
	return fn.reduce(function (accumulator, value, index) {
		accumulator.push( fn.apply(handler, fn.concat([ value, index, collection ], params)) );
		return accumulator;
	}, [ ], collection);
};

fn.reverse = function (collection) {
	return fn.cloneArray(collection).reverse();
};

fn.pipeline = function () {
	var functions = fn.toArray(arguments);

	return function () {
		return fn.reduce(function (args, func) {
			return [ fn.apply(func, args) ];
		}, fn.toArray(arguments), functions)[ 0 ];
	};
};

fn.compose = function () {
	return fn.apply(fn.pipeline, fn.reverse(arguments));
};

fn.prop = fn.curry(function (name, object) {
	return object[ name ];
});

fn.merge = function () {
	return fn.reduce(function (accumulator, value) {
		fn.each(function (property) {
			accumulator[ property ] = value[ property ];
		}, fn.properties(value));

		return accumulator;
	}, { }, fn.toArray(arguments));
};

fn.memoize = function memoize(handler, serializer) {
	var cache = { };

	return function () {
		var args = fn.toArray(arguments);
		var key = serializer ? serializer(args) : memoize.serialize(args);

		return key in cache ?
			cache[ key ] :
			cache[ key ] = fn.apply(handler, args);
	};
};

fn.memoize.serialize = function (values) {
	return fn.type(values[ 0 ]) + '|' + JSON.stringify(values[ 0 ]);
};

fn.flip = function (handler) {
	return function () {
		return fn.apply(handler, fn.reverse(arguments));
	};
};

fn.delay = function (handler, msDelay) {
	return setTimeout(handler, msDelay);
};

fn.delayFor = fn.flip(fn.delay);

fn.delayed = function (handler, msDelay) {
	return function () {
		return fn.delay(fn.partial(handler, fn.toArray(arguments)), msDelay);
	};
};

fn.delayedFor = fn.flip(fn.delayed);

fn.async = fn.compose(fn.partial(fn.delayedFor, 0));

fn.throttle = function (handler, msDelay) {
	var throttling;

	return function () {
		var args = fn.toArray(arguments);

		if (throttling) {
			return;
		}

		throttling = fn.delay(function () {
			throttling = false;

			fn.apply(handler, args);
		}, msDelay);
	};
};

fn.debounce = function (handler, msDelay) {
	var debouncing;

	return function () {
		var args = fn.toArray(arguments);

		if (debouncing) {
			clearTimeout(debouncing);
		}

		debouncing = fn.delay(function () {
			debouncing = false;

			fn.apply(handler, args);
		}, msDelay);
	};
};

return fn;
}));
},{}],108:[function(require,module,exports){
/**
 * Expose `pathtoRegexp`.
 */
module.exports = pathtoRegexp;

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match already escaped characters that would otherwise incorrectly appear
  // in future matches. This allows the user to escape special characters that
  // shouldn't be transformed.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?"]
  // "/route(\\d+)" => [undefined, undefined, undefined, "\d+", undefined]
  '([\\/.])?(?:\\:(\\w+)(?:\\(((?:\\\\.|[^)])*)\\))?|\\(((?:\\\\.|[^)])*)\\))([+*?])?',
  // Match regexp special characters that should always be escaped.
  '([.+*?=^!:${}()[\\]|\\/])'
].join('|'), 'g');

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {String} group
 * @return {String}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$\/()])/g, '\\$1');
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {RegExp} re
 * @param  {Array}  keys
 * @return {RegExp}
 */
var attachKeys = function (re, keys) {
  re.keys = keys;

  return re;
};

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array should be passed in, which will contain the placeholder key
 * names. For example `/user/:id` will then contain `["id"]`.
 *
 * @param  {(String|RegExp|Array)} path
 * @param  {Array}                 keys
 * @param  {Object}                options
 * @return {RegExp}
 */
function pathtoRegexp (path, keys, options) {
  if (keys && !Array.isArray(keys)) {
    options = keys;
    keys = null;
  }

  keys = keys || [];
  options = options || {};

  var strict = options.strict;
  var end = options.end !== false;
  var flags = options.sensitive ? '' : 'i';
  var index = 0;

  if (path instanceof RegExp) {
    // Match all capturing groups of a regexp.
    var groups = path.source.match(/\((?!\?)/g) || [];

    // Map all the matches to their numeric keys and push into the keys.
    keys.push.apply(keys, groups.map(function (match, index) {
      return {
        name:      index,
        delimiter: null,
        optional:  false,
        repeat:    false
      };
    }));

    // Return the source back to the user.
    return attachKeys(path, keys);
  }

  if (Array.isArray(path)) {
    // Map array parts into regexps and return their source. We also pass
    // the same keys and options instance into every generation to get
    // consistent matching groups before we join the sources together.
    path = path.map(function (value) {
      return pathtoRegexp(value, keys, options).source;
    });

    // Generate a new regexp instance by joining all the parts together.
    return attachKeys(new RegExp('(?:' + path.join('|') + ')', flags), keys);
  }

  // Alter the path string into a usable regexp.
  path = path.replace(PATH_REGEXP, function (match, escaped, prefix, key, capture, group, suffix, escape) {
    // Avoiding re-escaping escaped characters.
    if (escaped) {
      return escaped;
    }

    // Escape regexp special characters.
    if (escape) {
      return '\\' + escape;
    }

    var repeat   = suffix === '+' || suffix === '*';
    var optional = suffix === '?' || suffix === '*';

    keys.push({
      name:      key || index++,
      delimiter: prefix || '/',
      optional:  optional,
      repeat:    repeat
    });

    // Escape the prefix character.
    prefix = prefix ? '\\' + prefix : '';

    // Match using the custom capturing group, or fallback to capturing
    // everything up to the next slash (or next period if the param was
    // prefixed with a period).
    capture = escapeGroup(capture || group || '[^' + (prefix || '\\/') + ']+?');

    // Allow parameters to be repeated more than once.
    if (repeat) {
      capture = capture + '(?:' + prefix + capture + ')*';
    }

    // Allow a parameter to be optional.
    if (optional) {
      return '(?:' + prefix + '(' + capture + '))?';
    }

    // Basic parameter support.
    return prefix + '(' + capture + ')';
  });

  // Check whether the path ends in a slash as it alters some match behaviour.
  var endsWithSlash = path[path.length - 1] === '/';

  // In non-strict mode we allow an optional trailing slash in the match. If
  // the path to match already ended with a slash, we need to remove it for
  // consistency. The slash is only valid at the very end of a path match, not
  // anywhere in the middle. This is important for non-ending mode, otherwise
  // "/test/" will match "/test//route".
  if (!strict) {
    path = (endsWithSlash ? path.slice(0, -2) : path) + '(?:\\/(?=$))?';
  }

  // In non-ending mode, we need prompt the capturing groups to match as much
  // as possible by using a positive lookahead for the end or next path segment.
  if (!end) {
    path += strict && endsWithSlash ? '' : '(?=\\/|$)';
  }

  return attachKeys(new RegExp('^' + path + (end ? '$' : ''), flags), keys);
};

},{}],109:[function(require,module,exports){
/**
 * Object#toString() ref for stringify().
 */

var toString = Object.prototype.toString;

/**
 * Object#hasOwnProperty ref
 */

var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Array#indexOf shim.
 */

var indexOf = typeof Array.prototype.indexOf === 'function'
  ? function(arr, el) { return arr.indexOf(el); }
  : function(arr, el) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] === el) return i;
      }
      return -1;
    };

/**
 * Array.isArray shim.
 */

var isArray = Array.isArray || function(arr) {
  return toString.call(arr) == '[object Array]';
};

/**
 * Object.keys shim.
 */

var objectKeys = Object.keys || function(obj) {
  var ret = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      ret.push(key);
    }
  }
  return ret;
};

/**
 * Array#forEach shim.
 */

var forEach = typeof Array.prototype.forEach === 'function'
  ? function(arr, fn) { return arr.forEach(fn); }
  : function(arr, fn) {
      for (var i = 0; i < arr.length; i++) fn(arr[i]);
    };

/**
 * Array#reduce shim.
 */

var reduce = function(arr, fn, initial) {
  if (typeof arr.reduce === 'function') return arr.reduce(fn, initial);
  var res = initial;
  for (var i = 0; i < arr.length; i++) res = fn(res, arr[i]);
  return res;
};

/**
 * Cache non-integer test regexp.
 */

var isint = /^[0-9]+$/;

function promote(parent, key) {
  if (parent[key].length == 0) return parent[key] = {}
  var t = {};
  for (var i in parent[key]) {
    if (hasOwnProperty.call(parent[key], i)) {
      t[i] = parent[key][i];
    }
  }
  parent[key] = t;
  return t;
}

function parse(parts, parent, key, val) {
  var part = parts.shift();
  
  // illegal
  if (Object.getOwnPropertyDescriptor(Object.prototype, key)) return;
  
  // end
  if (!part) {
    if (isArray(parent[key])) {
      parent[key].push(val);
    } else if ('object' == typeof parent[key]) {
      parent[key] = val;
    } else if ('undefined' == typeof parent[key]) {
      parent[key] = val;
    } else {
      parent[key] = [parent[key], val];
    }
    // array
  } else {
    var obj = parent[key] = parent[key] || [];
    if (']' == part) {
      if (isArray(obj)) {
        if ('' != val) obj.push(val);
      } else if ('object' == typeof obj) {
        obj[objectKeys(obj).length] = val;
      } else {
        obj = parent[key] = [parent[key], val];
      }
      // prop
    } else if (~indexOf(part, ']')) {
      part = part.substr(0, part.length - 1);
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
      // key
    } else {
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
    }
  }
}

/**
 * Merge parent key/val pair.
 */

function merge(parent, key, val){
  if (~indexOf(key, ']')) {
    var parts = key.split('[')
      , len = parts.length
      , last = len - 1;
    parse(parts, parent, 'base', val);
    // optimize
  } else {
    if (!isint.test(key) && isArray(parent.base)) {
      var t = {};
      for (var k in parent.base) t[k] = parent.base[k];
      parent.base = t;
    }
    set(parent.base, key, val);
  }

  return parent;
}

/**
 * Compact sparse arrays.
 */

function compact(obj) {
  if ('object' != typeof obj) return obj;

  if (isArray(obj)) {
    var ret = [];

    for (var i in obj) {
      if (hasOwnProperty.call(obj, i)) {
        ret.push(obj[i]);
      }
    }

    return ret;
  }

  for (var key in obj) {
    obj[key] = compact(obj[key]);
  }

  return obj;
}

/**
 * Parse the given obj.
 */

function parseObject(obj){
  var ret = { base: {} };

  forEach(objectKeys(obj), function(name){
    merge(ret, name, obj[name]);
  });

  return compact(ret.base);
}

/**
 * Parse the given str.
 */

function parseString(str){
  var ret = reduce(String(str).split('&'), function(ret, pair){
    var eql = indexOf(pair, '=')
      , brace = lastBraceInKey(pair)
      , key = pair.substr(0, brace || eql)
      , val = pair.substr(brace || eql, pair.length)
      , val = val.substr(indexOf(val, '=') + 1, val.length);

    // ?foo
    if ('' == key) key = pair, val = '';
    if ('' == key) return ret;

    return merge(ret, decode(key), decode(val));
  }, { base: {} }).base;

  return compact(ret);
}

/**
 * Parse the given query `str` or `obj`, returning an object.
 *
 * @param {String} str | {Object} obj
 * @return {Object}
 * @api public
 */

exports.parse = function(str){
  if (null == str || '' == str) return {};
  return 'object' == typeof str
    ? parseObject(str)
    : parseString(str);
};

/**
 * Turn the given `obj` into a query string
 *
 * @param {Object} obj
 * @return {String}
 * @api public
 */

var stringify = exports.stringify = function(obj, prefix) {
  if (isArray(obj)) {
    return stringifyArray(obj, prefix);
  } else if ('[object Object]' == toString.call(obj)) {
    return stringifyObject(obj, prefix);
  } else if ('string' == typeof obj) {
    return stringifyString(obj, prefix);
  } else {
    return prefix + '=' + encodeURIComponent(String(obj));
  }
};

/**
 * Stringify the given `str`.
 *
 * @param {String} str
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyString(str, prefix) {
  if (!prefix) throw new TypeError('stringify expects an object');
  return prefix + '=' + encodeURIComponent(str);
}

/**
 * Stringify the given `arr`.
 *
 * @param {Array} arr
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyArray(arr, prefix) {
  var ret = [];
  if (!prefix) throw new TypeError('stringify expects an object');
  for (var i = 0; i < arr.length; i++) {
    ret.push(stringify(arr[i], prefix + '[' + i + ']'));
  }
  return ret.join('&');
}

/**
 * Stringify the given `obj`.
 *
 * @param {Object} obj
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyObject(obj, prefix) {
  var ret = []
    , keys = objectKeys(obj)
    , key;

  for (var i = 0, len = keys.length; i < len; ++i) {
    key = keys[i];
    if ('' == key) continue;
    if (null == obj[key]) {
      ret.push(encodeURIComponent(key) + '=');
    } else {
      ret.push(stringify(obj[key], prefix
        ? prefix + '[' + encodeURIComponent(key) + ']'
        : encodeURIComponent(key)));
    }
  }

  return ret.join('&');
}

/**
 * Set `obj`'s `key` to `val` respecting
 * the weird and wonderful syntax of a qs,
 * where "foo=bar&foo=baz" becomes an array.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {String} val
 * @api private
 */

function set(obj, key, val) {
  var v = obj[key];
  if (Object.getOwnPropertyDescriptor(Object.prototype, key)) return;
  if (undefined === v) {
    obj[key] = val;
  } else if (isArray(v)) {
    v.push(val);
  } else {
    obj[key] = [v, val];
  }
}

/**
 * Locate last brace in `str` within the key.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function lastBraceInKey(str) {
  var len = str.length
    , brace
    , c;
  for (var i = 0; i < len; ++i) {
    c = str[i];
    if (']' == c) brace = false;
    if ('[' == c) brace = true;
    if ('=' == c && !brace) return i;
  }
}

/**
 * Decode `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function decode(str) {
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch (err) {
    return str;
  }
}

},{}],110:[function(require,module,exports){
var browser = require('./lib/browser');
var Route = require('./lib/Route');
var Matcher = require('./lib/Matcher');
var Query = require('./lib/Query');

var router = {
  _matcher: [],
  _onChangeHandler: function() {},

  setMatchedPaths: function(paths) {
    this._matchers = Matcher.fromPaths(paths);
    return this;
  },

  setOnChangeHandler: function(handler) {
    this._onChangeHandler = handler;
    return this;
  },

  start: function() {
    this._addEventListeners();
    this._onUriChange();
  },

  isRouteMatched: function(route) {
    if (!route) {
      return false;
    }
    var path = route.path;
    return Boolean(Matcher.matchWithPath(this._matchers, path));
  },

  _skipNextOnChangeHandler: false,

  updateBrowserUri: function(route, options) {
    options = options || {};
    var currentUri = browser.getCurrentUri();
    var newUri = this.uriFromRoute(route);

    if (newUri === currentUri) {
      // Will not fire browser's hash change handler
      // and there is no need to update anyway
      return;
    }

    // Will fire browser's hash change handler,
    // but we just want to do a "silent" update
    this._skipNextOnChangeHandler = true;

    if (options.replace) {
      browser.replaceUri(newUri);
    }
    else {
      browser.setUri(newUri);
    }
  },

  uriFromRoute: function(route) {
    return Route.toUri(route);
  },

  _addEventListeners: function() {
    browser.on('hashchange', this._onUriChange, this);
  },

  _onUriChange: function() {
    if (this._skipNextOnChangeHandler) {
      this._skipNextOnChangeHandler = false;
      return;
    }

    var uri = browser.getCurrentUri();

    if (!(uri && uri.length)) {
      uri = '/';
      browser.replaceUri(uri);
      return;
    }

    var route = null;
    var pattern = Query.uriWithoutQueryString(uri);
    var matcher = Matcher.matchWithRegexp(this._matchers, pattern);
    if (matcher) {
      route = Route.fromMatchedUri(matcher, uri);
    }

    this._onChangeHandler(uri, route);
  }
};

module.exports = router;

},{"./lib/Matcher":101,"./lib/Query":103,"./lib/Route":104,"./lib/browser":105}],"ZKusGn":[function(require,module,exports){
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],"underscore":[function(require,module,exports){
module.exports=require('ZKusGn');
},{}],113:[function(require,module,exports){
(function (global){

var rng;

if (global.crypto && crypto.getRandomValues) {
  // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
  // Moderately fast, high quality
  var _rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(_rnds8);
    return _rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  _rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return _rnds;
  };
}

module.exports = rng;


}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],114:[function(require,module,exports){
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var _rng = require('./rng');

// Maps for number <-> hex string conversion
var _byteToHex = [];
var _hexToByte = {};
for (var i = 0; i < 256; i++) {
  _byteToHex[i] = (i + 0x100).toString(16).substr(1);
  _hexToByte[_byteToHex[i]] = i;
}

// **`parse()` - Parse a UUID into it's component bytes**
function parse(s, buf, offset) {
  var i = (buf && offset) || 0, ii = 0;

  buf = buf || [];
  s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
    if (ii < 16) { // Don't overflow!
      buf[i + ii++] = _hexToByte[oct];
    }
  });

  // Zero out remaining bytes if string was short
  while (ii < 16) {
    buf[i + ii++] = 0;
  }

  return buf;
}

// **`unparse()` - Convert UUID byte array (ala parse()) into a string**
function unparse(buf, offset) {
  var i = offset || 0, bth = _byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = _rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; n++) {
    b[i + n] = node[n];
  }

  return buf ? buf : unparse(b);
}

// **`v4()` - Generate random UUID**

// See https://github.com/broofa/node-uuid for API details
function v4(options, buf, offset) {
  // Deprecated - 'format' argument, as supported in v1.2
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || _rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ii++) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || unparse(rnds);
}

// Export public API
var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;
uuid.parse = parse;
uuid.unparse = unparse;

module.exports = uuid;

},{"./rng":113}],"QCA6vm":[function(require,module,exports){
var Loader = function() {

  // will be replaced with the json.
  this.dependencies = {"npm":{"chix-flow":"0.x.x","discore-closest":"0.2.x","handlebars":"latest","router-lib":"0.x.x","underscore":"1.x.x"}};
  //this.nodes = ;
  this.nodeDefinitions = {"https://serve-chix.rhcloud.com/nodes/{ns}/{name}":{"core":{"actor":{"_id":"5486929dab54be2e930fbd64","name":"actor","ns":"core","title":"Actor","description":"Chix Actor","phrases":{"active":"Exposing Actor"},"ports":{"input":{"actor":{"title":"Actor","type":"Actor","default":null},"loader":{"title":"Loader","type":"Loader","default":null},"io":{"title":"IO Handler","type":"IOMapHandler","default":null},"pm":{"title":"Process Manager","type":"ProcessManager","default":null}},"output":{"actor":{"title":"Actor","type":"Actor"},"addNode":{"title":"Node added","type":"xNode"},"removeNode":{"title":"Node removed","type":"xNode"},"addLink":{"title":"Link added","type":"xLink"},"removeLink":{"title":"Link removed","type":"xLink"},"connect":{"title":"Link connected","type":"xLink"},"disconnect":{"title":"Link disconnected","type":"xLink"},"qm":{"title":"Queue Manager","type":"QueueManager"},"pm":{"title":"Process Manager","type":"ProcessManager"},"io":{"title":"Io Handler","type":"IOMapHandler"},"error":{"title":"Error","type":"object"}}},"dependencies":{"npm":{"chix-flow":"0.x.x"}},"fn":"output = function (cb) {\n\n  var actor = input.actor || this.getParent();\n\n  // probably should do almost the same as npmlog monitor\n\n  actor.on('inputRequired', function (data) {\n    cb({\n      error: data\n    });\n  });\n\n  actor.on('error', function (data) {\n    cb({\n      error: data\n    });\n  });\n\n  actor.on('addNode', function (event) {\n    cb({\n      addNode: event.node\n    });\n  });\n\n  actor.on('removeNode', function (event) {\n    cb({\n      removeNode: event.node\n    });\n  });\n\n  actor.on('addLink', function (link) {\n    cb({\n      addLink: link\n    });\n  });\n\n  actor.on('removeLink', function (link) {\n    cb({\n      removeLink: link\n    });\n  });\n\n  actor.ioHandler.on('connect', function (link) {\n    cb({\n      connect: link\n    });\n  });\n\n  actor.ioHandler.on('disconnect', function (link) {\n    cb({\n      disconnect: link\n    });\n  });\n\n  // useally the actor already started so we send what we have\n  // manually\n  Object.keys(actor.nodes).forEach(function(key) {\n    cb({addNode: actor.nodes[key]});\n  });\n\n  Object.keys(actor.links).forEach(function(key) {\n    cb({addLink: actor.links[key]});\n\n    // also report them all as connected for now\n    cb({connect: actor.links[key]});\n  });\n\n  cb({\n    qm: actor.ioHandler.queueManager,\n    io: actor.ioHandler,\n    pm: actor.processManager\n  });\n\n  // not really useful I guess\n  /*\n  actor.ioHandler.on('data', function (link) {\n    cb({\n      disconnectLink: link\n    });\n  });\n  */\n\n};\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"}},"dom":{"addMouseEvent":{"_id":"52be4f096a14bb6fbd924a28","name":"addMouseEvent","ns":"dom","description":"Add Mouse Event Listener","async":true,"phrases":{"active":"Adding {{input.event}} handler"},"ports":{"input":{"in":{"title":"Input","type":"any","async":true,"default":null},"element":{"type":"HTMLElement","title":"Dom Element","async":true},"preventDefault":{"type":"boolean","title":"Prevent Default Event","default":true},"event":{"type":"string","enum":["click","dblclick","mousedown","mouseup","mouseover","mousemove","mouseout","dragstart","drag","dragenter","dragleave","dragover","drop","dragend"],"title":"Dom Event"}},"output":{"element":{"type":"any","title":"Element"},"out":{"type":"any","title":"Output"},"event":{"type":"MouseEvent","title":"Event"}}},"fn":"state.in = undefined;\nstate.event = null;\nstate.preventDefault = null;\n\nstate.clickHandler = function(ev) {\n  if(state.preventDefault) ev.preventDefault();\n  output({\n    out: state.in,\n    event: ev\n  });\n};\n\non.input.in = function() {\n  state.in = data;\n};\n\non.input.element = function() {\n  if (state.in === undefined) return false;\n\n  if(state.el) {\n    state.el.removeEventListener(state.event);\n  }\n  state.el = input.element;\n  state.event = input.event;\n  state.preventDefault = input.preventDefault;\n\n  state.el.addEventListener(input.event, state.clickHandler, false);\n  output({element: input.element});\n};\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"},"addKeyboardEvent":{"_id":"52bf38966a14bb6fbd924a2d","name":"addKeyboardEvent","ns":"dom","description":"Add Keyboard Event Listener","async":true,"phrases":{"active":"Adding {{input.event}} handler"},"ports":{"input":{"in":{"title":"Input","type":"any","async":true,"default":null},"element":{"type":"HTMLElement","title":"Dom Element","async":true},"preventDefault":{"type":"boolean","title":"Prevent Default Event","default":true},"event":{"type":"string","enum":["keydown","keypress","keyup"],"title":"Dom Event"}},"output":{"element":{"type":"HTMLElement","title":"Dom Element"},"out":{"type":"any","title":"Output"},"event":{"type":"KeyboardEvent","title":"Event"}}},"fn":"state.in = undefined;\nstate.event = null;\nstate.preventDefault = null;\n\nstate.clickHandler = function(ev) {\n  if(state.preventDefault) ev.preventDefault();\n  output({\n    out: state.in,\n    event: ev\n  });\n};\n\non.input.in = function() {\n  state.in = data;\n};\n\non.input.element = function() {\n  if (state.in === undefined) return false;\n\n  if(state.el) {\n    state.el.removeEventListener(state.event);\n  }\n  state.el = input.element;\n  state.event = input.event;\n  state.preventDefault = input.preventDefault;\n\n  state.el.addEventListener(input.event, state.clickHandler, false);\n  output({element: input.element});\n};\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"},"closest":{"_id":"5486feb1ab54be2e930fbd66","name":"closest","ns":"dom","title":"Closest","async":true,"description":" Finds the closest parent that matches a selector.","expose":["document"],"dependencies":{"npm":{"discore-closest":"0.2.x"}},"phrases":{"active":"Finding closest parent: {{input.selector}}"},"ports":{"input":{"element":{"title":"Element","description":"will check this elements parents","type":"HTMLElement","async":true},"selector":{"title":"Selector","description":"CSS selector to match parents","type":"string"},"checkSelf":{"title":"Check Self","description":"check element. If falsey, will begin with element.parentNode and is synonymous to $.fn.parents. Otherwise, it's $.fn.closest.","type":"boolean","default":false},"within":{"title":"Within","description":"check only within this element. By default, document","type":"HTMLElement","required":false}},"output":{"element":{"title":"Element","type":"HTMLElement"},"selection":{"title":"Selection","type":"HTMLElement"},"error":{"title":"Error","type":"Error"}}},"fn":"on.input.element = function(data) {\n  var sel = discore_closest(\n    data, input.selector, input.checkSelf,\n    input.within || document\n  );\n  var res = { element: data };\n  if (sel) {\n    res.selection = sel;\n  } else {\n    res.error = new Error('Selector didn\\'t match:' + input.selector);\n  }\n\n  output(res);\n\n};\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"},"querySelector":{"_id":"527299bb30b8af4b8910216b","name":"querySelector","ns":"dom","title":"querySelector","description":"[Document query selector](https://developer.mozilla.org/en-US/docs/Web/API/document.querySelector)","expose":["document"],"phrases":{"active":"Gathering elements matching criteria: {{input.selector}}"},"ports":{"input":{"element":{"title":"Element","type":"HTMLElement","default":null},"selector":{"title":"Selector","type":"string"}},"output":{"element":{"title":"Element","type":"HTMLElement"},"selection":{"title":"Selection","type":"HTMLElement"},"error":{"title":"Error","type":"Error"}}},"fn":"var el = input.element ? input.element : document;\noutput = {\n  element: el\n};\n\nvar selection = el.querySelector(input.selector);\nif(selection) {\n  output.selection = selection;\n} else {\n  output.error = Error('Selector ' + input.selector + ' did not match');\n}\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"},"setHtml":{"_id":"52be32d46a14bb6fbd924a24","name":"setHtml","ns":"dom","description":"dom setHtml","async":true,"phrases":{"active":"Adding html"},"ports":{"input":{"element":{"type":"HTMLElement","title":"Dom Element"},"html":{"type":"string","format":"html","title":"html","async":true}},"output":{"element":{"type":"HTMLElement","title":"Dom Element"}}},"fn":"on.input.html = function(data) {\n  input.element.innerHTML = data;\n  output({ element: input.element });\n};\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"},"appendChild":{"_id":"52be32d46a14bb6fbd924a20","name":"appendChild","ns":"dom","description":"dom appendChild","async":true,"phrases":{"active":"Adding child node"},"ports":{"input":{"element":{"type":"HTMLElement","title":"Dom Element"},"child":{"type":"HTMLElement","async":true,"title":"Child Element"}},"output":{"element":{"type":"HTMLElement","title":"Dom Element"},"out":{"type":"object"}}},"fn":"on.input.child = function() {\n\n  output( {\n    element: input.element,\n    out: input.element.appendChild(data)\n  } );\n\n}\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"},"createElement":{"_id":"531160f50dfaa3eb4a7e1730","name":"createElement","ns":"dom","async":true,"description":"dom createElement","phrases":{"active":"Creating element"},"ports":{"input":{"in":{"type":"string","title":"Tagname","async":true,"default":"div"}},"output":{"out":{"type":"HTMLElement"}}},"fn":"on.input.in = function() {\n  output( { out: document.createElement(data) });\n}\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"}},"console":{"log":{"_id":"52645993df5da0102500004e","name":"log","ns":"console","description":"Console log","async":true,"phrases":{"active":"Logging to console"},"ports":{"input":{"msg":{"type":"any","title":"Log message","description":"Logs a message to the console","async":true,"required":true}},"output":{"out":{"type":"any","title":"Log message"}}},"fn":"on.input.msg = function() {\n  console.log(data);\n  output( { out: data });\n}\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"}},"data":{"string":{"_id":"526b1327b8a561ad0ebfa3b7","name":"string","ns":"data","title":"String","async":true,"description":"String","phrases":{"active":"Creating string {{input.string}}"},"ports":{"input":{"in":{"title":"String","type":"any","async":true,"required":true}},"output":{"out":{"title":"out","type":"string"}}},"fn":"on.input.in = function() {\n  output( { out: typeof data === null ? 'null' : data.toString() });\n};\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"}},"template":{"handlebars":{"_id":"52ea878d1905561c7aa3bdbc","name":"handlebars","ns":"template","description":"Handlebars Template engine","phrases":{"active":"Compiling handlebars template"},"ports":{"input":{"body":{"type":"string","format":"html","title":"Template body","description":"The body of the handlebars template","required":true},"vars":{"type":"object","title":"Input variables","description":"the input variables for this template","default":{}},"handlebars":{"type":"function","title":"Handlebars","default":null}},"output":{"out":{"title":"HTML","type":"string"}}},"dependencies":{"npm":{"handlebars":"latest"}},"fn":"var hb = input.handlebars || handlebars;\nvar tpl = hb.compile(input.body);\noutput = {\n  out: tpl(input.vars)\n}\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"}},"router":{"client":{"_id":"54876bdfab54be2e930fbd67","name":"client","ns":"router","description":"Client Side Router, to simplify usage outputs an object keyed by route","async":true,"dependencies":{"npm":{"router-lib":"0.x.x"}},"phrases":{"active":"Routing"},"ports":{"input":{"routes":{"title":"Routes","type":"array","async":true}},"output":{"error":{"title":"Error","type":"Error"},"out":{"title":"Route","type":"object","additionalProperties":true}}},"fn":"state.router = null;\non.input.routes = function(data) {\n  state.router = null;\n  state.router = router_lib.router;\n  state.router.setMatchedPaths(data);\n  state.router.setOnChangeHandler(function(uri, route) {\n    if (route) {\n      var ret = {out: {}};\n      ret.out[route.path] = route;\n      output(ret);\n    } else {\n      output({ error: new Error('URI was not matched') });\n    }\n  });\n  state.router.start();\n};\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"}},"object":{"create":{"_id":"52fa908e909495ebbe6ded4c","name":"create","ns":"object","async":true,"description":"Create an object, if input is a direct object it just returns a copy of the object","phrases":{"active":"Creating object"},"ports":{"input":{"in":{"title":"Object","type":"object","async":true}},"output":{"out":{"title":"out","type":"object"}}},"fn":"on.input.in = function(data) { output({out: data}); };\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"},"values":{"_id":"52ef3631cf8e1bab142d539a","name":"values","ns":"object","async":true,"description":"Retrieve all of the values of the object's properties","phrases":{"active":"Retrieving object values"},"ports":{"input":{"in":{"title":"Object","type":"object","async":true}},"output":{"out":{"title":"out","type":"array"}}},"dependencies":{"npm":{"underscore":"1.x.x"}},"fn":"on.input.in = function(data) {\n  output({out: underscore.values(data)});\n};\n","provider":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"}}}};

};

Loader.prototype.hasNodeDefinition = function(nodeId) {

  return !!this.nodes[nodeId];

};

Loader.prototype.getNodeDefinition = function(node, map) {

  if (!this.nodeDefinitions[node.provider]) {

    // needed for subgraphs
    if (map.providers && map.providers[node.provider]) {
      node.provider = map.providers[node.provider].path ||
        map.providers[node.provider].url;
    } else if (map.providers && map.providers['@']) {
      node.provider = map.providers['@'].path ||
        map.providers['@'].url;
    } else {
      throw new Error('Node Provider not found for ' + node.name);
    }
  }

  return this.nodeDefinitions[node.provider][node.ns][node.name];

};

var Flow = require('chix-flow').Flow;
var loader = new Loader();

var map = {"type":"flow","nodes":[{"id":"Actor","title":"Actor","ns":"core","name":"actor"},{"id":"MouseMove","title":"MouseMove","ns":"dom","name":"addMouseEvent"},{"id":"MouseClick","title":"MouseClick","ns":"dom","name":"addMouseEvent"},{"id":"KeyboardEvent","title":"KeyboardEvent","ns":"dom","name":"addKeyboardEvent"},{"id":"Closest","title":"Closest","ns":"dom","name":"closest"},{"id":"BodyEl","title":"BodyEl","ns":"dom","name":"querySelector"},{"id":"CanvasEl","title":"CanvasEl","ns":"dom","name":"querySelector"},{"id":"PanelEl","title":"PanelEl","ns":"dom","name":"querySelector"},{"id":"ConnectionsEl","title":"ConnectionsEl","ns":"dom","name":"querySelector"},{"id":"UpdateMouseView","title":"UpdateMouseView","ns":"dom","name":"setHtml"},{"id":"UpdateConnectionsView","title":"UpdateConnectionsView","ns":"dom","name":"setHtml"},{"id":"Log","title":"Log","ns":"console","name":"log"},{"id":"toString","title":"toString","ns":"data","name":"string"},{"id":"MouseView","title":"MouseView","ns":"template","name":"handlebars"},{"id":"NodeView","title":"NodeView","ns":"template","name":"handlebars"},{"id":"ConnectionsView","title":"ConnectionsView","ns":"template","name":"handlebars"},{"id":"ProcessManagerView","title":"ProcessManagerView","ns":"template","name":"handlebars"},{"id":"AppendNode","title":"AppendNode","ns":"dom","name":"appendChild"},{"id":"CreateNode","title":"CreateNode","ns":"dom","name":"createElement"},{"id":"UpdateNodeView","title":"UpdateNodeView","ns":"dom","name":"setHtml"},{"id":"Router","title":"Router","ns":"router","name":"client"},{"id":"Poll","title":"Poll","ns":"object","name":"create"},{"id":"PMPoll","title":"PMPoll","ns":"object","name":"create"},{"id":"NodeValues","title":"NodeValues","ns":"object","name":"values"}],"links":[{"source":{"id":"CanvasEl","port":"selection"},"target":{"id":"MouseMove","port":"element"},"metadata":{"title":"CanvasEl selection -> element MouseMove"}},{"source":{"id":"CanvasEl","port":"selection"},"target":{"id":"MouseClick","port":"element"},"metadata":{"title":"CanvasEl selection -> element MouseClick"}},{"source":{"id":"CanvasEl","port":"selection"},"target":{"id":"AppendNode","port":"element","setting":{"persist":true}},"metadata":{"title":"CanvasEl selection -> element AppendNode"}},{"source":{"id":"BodyEl","port":"selection"},"target":{"id":"KeyboardEvent","port":"element"},"metadata":{"title":"BodyEl selection -> element KeyboardEvent"}},{"source":{"id":"Router","port":"out"},"target":{"id":"Log","port":"msg"},"metadata":{"title":"Router out -> msg Log"}},{"source":{"id":"MouseMove","port":"event"},"target":{"id":"MouseView","port":"vars"},"metadata":{"title":"MouseMove event -> vars MouseView"}},{"source":{"id":"MouseView","port":"out"},"target":{"id":"UpdateMouseView","port":"html"},"metadata":{"title":"MouseView out -> html UpdateMouseView"}},{"source":{"id":"PanelEl","port":"selection"},"target":{"id":"UpdateMouseView","port":"element","setting":{"persist":true}},"metadata":{"title":"PanelEl selection -> element UpdateMouseView"}},{"source":{"id":"ConnectionsEl","port":"selection"},"target":{"id":"UpdateConnectionsView","port":"element","setting":{"persist":true}},"metadata":{"title":"ConnectionsEl selection -> element UpdateConnectionsView"}},{"source":{"id":"Actor","port":"io"},"target":{"id":"Poll","port":"in","setting":{"persist":true}},"metadata":{"title":"Actor io -> in Poll"}},{"source":{"id":"Actor","port":"pm"},"target":{"id":"PMPoll","port":"in","setting":{"persist":true}},"metadata":{"title":"Actor pm -> in PMPoll"}},{"source":{"id":"Actor","port":"pm","setting":{"index":"processes"}},"target":{"id":"NodeValues","port":"in"},"metadata":{"title":"Actor pm -> in NodeValues"}},{"source":{"id":"CreateNode","port":"out"},"target":{"id":"UpdateNodeView","port":"element"},"metadata":{"title":"CreateNode out -> element UpdateNodeView"}},{"source":{"id":"NodeValues","port":"out"},"target":{"id":"CreateNode","port":":start","setting":{"cyclic":true}},"metadata":{"title":"NodeValues out -> :start CreateNode"}},{"source":{"id":"NodeValues","port":"out"},"target":{"id":"NodeView","port":"vars","setting":{"cyclic":true}},"metadata":{"title":"NodeValues out -> vars NodeView"}},{"source":{"id":"NodeView","port":"out"},"target":{"id":"UpdateNodeView","port":"html"},"metadata":{"title":"NodeView out -> html UpdateNodeView"}},{"source":{"id":"UpdateNodeView","port":"element"},"target":{"id":"AppendNode","port":"child"},"metadata":{"title":"UpdateNodeView element -> child AppendNode"}},{"source":{"id":"MouseMove","port":"event"},"target":{"id":"Poll","port":":start"},"metadata":{"title":"MouseMove event -> :start Poll"}},{"source":{"id":"Poll","port":"out"},"target":{"id":"ConnectionsView","port":"vars"},"metadata":{"title":"Poll out -> vars ConnectionsView"}},{"source":{"id":"ConnectionsView","port":"out"},"target":{"id":"UpdateConnectionsView","port":"html"},"metadata":{"title":"ConnectionsView out -> html UpdateConnectionsView"}},{"source":{"id":"MouseClick","port":"event","setting":{"index":"target"}},"target":{"id":"Closest","port":"element"},"metadata":{"title":"MouseClick event -> element Closest"}},{"source":{"id":"Closest","port":"selection"},"target":{"id":"Log","port":"msg"},"metadata":{"title":"Closest selection -> msg Log"}},{"source":{"id":"MouseClick","port":"event"},"target":{"id":"Log","port":"msg"},"metadata":{"title":"MouseClick event -> msg Log"}},{"source":{"id":"KeyboardEvent","port":"event"},"target":{"id":"PMPoll","port":":start"},"metadata":{"title":"KeyboardEvent event -> :start PMPoll"}},{"source":{"id":"PMPoll","port":"out"},"target":{"id":"ProcessManagerView","port":"vars"},"metadata":{"title":"PMPoll out -> vars ProcessManagerView"}},{"source":{"id":"ProcessManagerView","port":"out"},"target":{"id":"UpdateMouseView","port":"html"},"metadata":{"title":"ProcessManagerView out -> html UpdateMouseView"}}],"title":"Mouse event example","id":"MouseExample","providers":{"@":{"url":"https://serve-chix.rhcloud.com/nodes/{ns}/{name}"}}};

var actor;
window.Actor = actor = Flow.create(map, loader);


function onDeviceReady() {
actor.run();
actor.push();
actor.sendIIPs([{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"BodyEl","port":"selector"},"metadata":{"title":"Mouse event example :iip -> selector BodyEl"},"data":"body"},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"PanelEl","port":"selector"},"metadata":{"title":"Mouse event example :iip -> selector PanelEl"},"data":"#panel"},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"ConnectionsEl","port":"selector"},"metadata":{"title":"Mouse event example :iip -> selector ConnectionsEl"},"data":"#connections"},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"CanvasEl","port":"selector"},"metadata":{"title":"Mouse event example :iip -> selector CanvasEl"},"data":"#canvas"},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"MouseMove","port":"event"},"metadata":{"title":"Mouse event example :iip -> event MouseMove"},"data":"mousemove"},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"MouseClick","port":"event"},"metadata":{"title":"Mouse event example :iip -> event MouseClick"},"data":"click"},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"KeyboardEvent","port":"event"},"metadata":{"title":"Mouse event example :iip -> event KeyboardEvent"},"data":"keydown"},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"MouseView","port":"body","setting":{"persist":true}},"metadata":{"title":"Mouse event example :iip -> body MouseView"},"data":"<div>x: {{clientX}}, y: {{clientY}}</div>"},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"ConnectionsView","port":"body","setting":{"persist":true}},"metadata":{"title":"Mouse event example :iip -> body ConnectionsView"},"data":"<table class=\"table table-striped\">\n  <thead>\n    <tr>\n      <th>Link</th>\n      <th>Fills</th>\n      <th>Rejects</th>\n      <th>Writes</th>\n    </tr>\n  </thead>\n  <tbody>\n    {{#each connections}}\n    <tr>\n      <td>{{this.source.id}} {{this.source.port}} -> {{this.target.port}} {{this.target.id}}</td>\n      <td class=\"success\">fills: {{this.fills}}</td>\n      <td class=\"danger\">rejects: {{this.rejects}}</td>\n      <td class=\"success\">writes: {{this.writes}}</td>\n    </tr>\n    {{/each}}\n  </tbody>\n</table>\n"},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"NodeView","port":"body","setting":{"persist":true}},"metadata":{"title":"Mouse event example :iip -> body NodeView"},"data":"<div id=\"{{id}}\" class=\"node pull-left {{status}}\">\n  <table>\n    <caption>{{title}}</caption>\n    <tbody>\n      <tr><th>id</th><td>{{id}}</td></tr>\n      <tr><th>pid</th><td>{{pid}}</td></tr>\n      <tr><th>Identifier</th><td>{{identifier}}</td></tr>\n      <tr><th>Title</th><td>{{title}}</td></tr>\n      <tr><th>Input ports</th><td>{{inPorts}}</td></tr>\n      <tr><th>Output ports</th><td>{{outPorts}}</td></tr>\n      <tr><th>Status</th><td>{{status}}</td></tr>\n      <tr><th>Run Count</th><td>{{runCount}}</td></tr>\n      <tr><th>Output Count</th><td>{{outputCount}}</td></tr>\n    </tbody>\n  </table>\n</div>\n"},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"ProcessManagerView","port":"body","setting":{"persist":true}},"metadata":{"title":"Mouse event example :iip -> body ProcessManagerView"},"data":"{{#each processes}}\n\n  <table class=\"table table-striped\">\n    <tr><th>pid</th><td>{{@key}}</td></tr>\n    <tr><th>Identifier</th><td>{{this.identifier}}</td></tr>\n    <tr><th>Title</th><td>{{this.title}}</td></tr>\n    <tr><th>Input ports</th><td>{{this.inPorts}}</td></tr>\n    <tr><th>Output ports</th><td>{{this.outPorts}}</td></tr>\n    <tr><th>Output ports</th><td>{{this.outPorts}}</td></tr>\n    <tr><th>Status</th><td>{{this.status}}</td></tr>\n  </table>\n\n{{/each}}\n"},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"Router","port":"routes"},"metadata":{"title":"Mouse event example :iip -> routes Router"},"data":["/items","/#/items"]},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"Actor","port":":start"},"metadata":{"title":"Mouse event example :iip -> :start Actor"},"data":""},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"CreateNode","port":"in"},"metadata":{"title":"Mouse event example :iip -> in CreateNode"},"data":"div"},{"source":{"id":"MouseExample","port":":iip"},"target":{"id":"Closest","port":"selector","setting":{"persist":true}},"metadata":{"title":"Mouse event example :iip -> selector Closest"},"data":".node"}]);

};

if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
  document.addEventListener("deviceready", onDeviceReady, false);
} else {
  document.addEventListener("DOMContentLoaded" , onDeviceReady); //this is the browser
}

// for entry it doesn't really matter what is the module.
// as long as this module is loaded.
module.exports = actor;

},{"chix-flow":"jXAsbI"}],"mouse":[function(require,module,exports){
module.exports=require('QCA6vm');
},{}]},{},["QCA6vm"])