/*jshint esnext: true */
var request = require('request'),
  _url = require('url'),
  async = require('async');

/**
 * Sends a HTTP request to a specified URL with optional proxy, query strings, and handlers.
 * Convenient handling of request error and unexpected status code.
 * GET redirection is handled by default by request module.
 * Non-GET redirection is handled by params followAllRedirects: true.
 *
 * @param {String} method: http method
 * @param {String} url: URL without query string
 * @param {Object} opts: optional
 *   - proxy: proxy server URL with format http://user:pass@host:port
 *   - noProxyHosts: an array of host names which will ignore any proxy settings, defaults to: localhost, 127.0.0.1
 *   - queryStrings: object containing URL query strings with format { name: value }
 *   - handlers: response handlers with format { statuscode: function(result, cb) }
 *   - headers: object containing http headers, exact map to mikeal/request headers opt
 *   - body, form, json, multipart: request payload, exact map to mikeal/request module body, form, json, multipart opts
 *   - retry: request retry configuration, false for disabled, true for sensible defaults, otherwise
 *            { statusCodes: [ 503 ], scale: 0.5, delay: 1000, maxRetries: 10 }
 *   - timeout: request timeout in milliseconds, default to 30000 milliseconds
 *   - requestOpts: mikeal/request module opts, these opts will override any params set by http#req
 * @param {Function} cb: standard cb(err, result) callback
 */
function req(method, url, opts, cb) {
  opts.handlers = opts.handlers || {};
  opts.retry = opts.retry || false;

  const TIMEOUT = 30000;
  // init default settings with follow redirections on all methods, and 30 seconds timeout
  var params = {
      url: url,
      followAllRedirects: true,
      rejectUnauthorized: false,
      timeout: opts.timeout || TIMEOUT
    },
    envProxy = proxy(url);

  // set proxy setting based on environment variable
  if (!_proxyIgnored(url, opts)) {
    if (opts.proxy) {
      params.proxy = opts.proxy;
    } else if (envProxy) {
      params.proxy = envProxy;
    }
  }

  // just a more readable opt name for query strings
  if (opts.queryStrings) {
    params.qs = opts.queryStrings;
  }

  // headers and payload handling
  ['headers', 'body', 'form', 'json', 'multipart'].forEach(function (opt) {
    if (opts[opt]) {
      params[opt] = opts[opt];
    }
  });

  // override defaults with mikeal/request-specific opts
  if (opts.requestOpts) {
    Object.keys(opts.requestOpts).forEach(function (opt) {
      params[opt] = opts.requestOpts[opt];
    });
  }

  // check for any wildcard match (e.g. 201 matches 2xx)
  function _wildcardMatch(statusCode) {
    var match;
    Object.keys(opts.handlers).forEach(function (handlerStatusCode) {
      var regex = new RegExp(handlerStatusCode.replace(/x/g, '.'));
      if (!match && statusCode.toString().match(regex)) {
        match = handlerStatusCode;
      }
    });
    return match;
  }

  function _requestMethod(method) {
    var requestMethod = method.toLowerCase();
    if (requestMethod === 'delete') {
      requestMethod = 'del';
    }
    return requestMethod;
  }

  _execRequest(opts, _requestMethod(method), params, function (err, result) {
    if (err) {
      cb(err);
    } else {
      var wildcardMatch = _wildcardMatch(result.statusCode);
      if (opts.handlers[result.statusCode]) {
        opts.handlers[result.statusCode](result, cb);
      } else if (wildcardMatch) {
        opts.handlers[wildcardMatch](result, cb);
      } else {
        cb(new Error('Unexpected status code: ' + result.statusCode + '\nResponse body:\n' + result.body));
      }
    }
  });
}

function _execRequest(opts, method, params, cb) {
  var defaults = { statusCodes: [ 408, 502, 503, 504 ], scale: 0.5, delay: 500, maxRetries: 10 },
    retry = opts.retry === true ? defaults : opts.retry,
    retryCount = 0,
    scaleFactor = retry.scale || 0.5,
    currentDelay = retry.delay || 500,
    hasValidResult = false,
    lastErr = null,
    lastResult = null,
    retryLimitHit = false;
  retry.maxRetries = retry.maxRetries >= 0 ? retry.maxRetries : NaN;
  retry.statusCodes = retry.statusCodes || [];

  function _retryableStatusCodeMatch(statusCode) {
    var matches = false;
    if (retry) {
      (retry.statusCodes || []).forEach(function (aWildStatusCodeAppears) {
        var regex = new RegExp(aWildStatusCodeAppears.toString().replace(/x/g, '.'));
        matches = matches || statusCode.toString().match(regex);
      });
    }
    return matches;
  }

  async.whilst(
    function doesNotHaveValidResultOrRetryLimitHit() {
      retryLimitHit = !(retryCount < retry.maxRetries);
      return !hasValidResult && (!retry || (retry && !retryLimitHit));
    },
    function retryRequest(cb) {
      request[method](params, function (err, result) {
        result = result || {};
        result._retry = { retryCount: retryCount };
        lastErr = err;
        lastResult = result;

        var hasRetryStatus = _retryableStatusCodeMatch(result.statusCode),
          isLastRetry = !(retryCount + 1 < retry.maxRetries);

        if (hasRetryStatus && isLastRetry) {
          retryCount++;
          cb();
        } else if (hasRetryStatus) {
          retryCount++;
          setTimeout(cb, currentDelay);
          currentDelay += currentDelay * scaleFactor;
        } else {
          hasValidResult = true;
          cb();
        }
      });
    },
    function done(err) {
      if (lastResult) lastResult._retry.retryLimitHit = retryLimitHit;
      cb(lastErr, lastResult);
    }
  );
}

/**
 * Determines proxy value based on URL and process environment variable (http_proxy, https_proxy).
 * This allows library clients to control which proxy to use by setting environment variable.
 * - if url starts with http, use http_proxy when available
 * - if url starts with https, use https_proxy when available, otherwise fallback to http_proxy
 * - if url does not have protocol, assume http protocol
 * - if url is not specified, http_proxy takes precedence over https_proxy
 *
 * @param {String} url: URL used to determine which proxy environment variable to use
 * @param {Object} opts: optional
 *   - noProxyHosts: an array of host names which will ignore any proxy settings, defaults to: localhost, 127.0.0.1
 */
function proxy(url, opts) {
  opts = opts || {};

  var _proxy;

  if (!url) {
    _proxy = process.env.http_proxy || process.env.HTTP_PROXY || process.env.https_proxy || process.env.HTTPS_PROXY;
  } else if (!_proxyIgnored(url, opts)) {
    if (!url.match(/^https?:\/\//)) {
      url += 'http://' + url;
    }

    if (url.match(/^https:\/\//)) {
      _proxy = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY;
    } else {
      _proxy = process.env.http_proxy || process.env.HTTP_PROXY;
    }
  }

  return _proxy;
}

function _proxyIgnored(url, opts) {
  const NO_PROXY_HOSTS = ['localhost', '127.0.0.1'];
  return (opts.noProxyHosts || NO_PROXY_HOSTS).indexOf(_url.parse(url).hostname) !== -1;
}

exports.request = req;
exports.proxy = proxy;
