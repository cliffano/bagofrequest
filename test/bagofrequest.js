var buster = require('buster-node'),
  bag = require('../lib/bagofrequest'),
  referee = require('referee'),
  request = require('request'),
  assert = referee.assert;

buster.testCase('http - request', {
  setUp: function () {
    this.mock({});
  },
  'should pass agentOptions to underlying request': function  (done) {
    this.stub(request, 'post', function (params, cb) {
      assert.equals(params.headers.foo, 'bar');
      assert.equals(params.agentOptions.passphrase, 'a123');
      cb(null, { statusCode: 200 });
    });
    function _success(result, cb) {
      cb(null, result);
    }
    bag.request('POST', 'http://someurl', { headers: { foo: 'bar' },agentOptions: { passphrase: 'a123'}, handlers: { 200: _success }}, function (err, result) {
      assert.isNull(err);
      done();
    });
  },
  'should pass error to callback when there is an error while sending request': function (done) {
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, 'http://someproxy');
      assert.equals(params.qs.param1, 'value1');
      cb(new Error('someerror'));
    });
    bag.request('GET', 'http://someurl', { proxy: 'http://someproxy', queryStrings: { param1: 'value1' } }, function (err, result) {
      assert.equals(err.message, 'someerror');
      assert.equals(result, undefined);
      done();
    });
  },
  'should handle result based on status code': function (done) {
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, 'http://someproxy');
      assert.equals(params.qs.param1, 'value1');
      cb(null, { statusCode: 200, body: 'somebody' });
    });
    function _success(result, cb) {
      assert.equals(result.statusCode, 200);
      assert.equals(result.body, 'somebody');
      cb(null, result);
    }
    bag.request('GET', 'http://someurl', { proxy: 'http://someproxy', queryStrings: { param1: 'value1' }, handlers: { 200: _success } }, function (err, result) {
      assert.isNull(err);
      assert.equals(result.statusCode, 200);
      assert.equals(result.body, 'somebody');
      done();
    });
  },
  'should aliased http#req delete method into request del method': function (done) {
    this.stub(process, 'env', {});
    this.stub(request, 'del', function (params, cb) {
      assert.equals(params.url, 'http://someurl');
      cb(null, { statusCode: 200, body: 'somebody' });
    });
    function _success(result, cb) {
      cb(null, result);
    }
    bag.request('DELETE', 'http://someurl', { handlers: { 200: _success } }, function (err, result) {
      done();
    });
  },
  'should handle result based on wildcard status code': function (done) {
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      cb(null, { statusCode: 200, body: 'somebody' });
    });
    function _success(result, cb) {
      assert.equals(result.statusCode, 200);
      cb(null, result);
    }
    function _honeypot(result, cb) {
      // should never be called
    }
    bag.request('GET', 'http://someurl', { proxy: 'http://someproxy', queryStrings: { param1: 'value1' }, handlers: { 201: _honeypot, '20x': _success } }, function (err, result) {
      assert.isNull(err);
      assert.equals(result.statusCode, 200);
      done();
    });
  },
  'should handle result based on wildcard status code with multiple wildcard characters': function (done) {
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      cb(null, { statusCode: 200, body: 'somebody' });
    });
    function _success(result, cb) {
      assert.equals(result.statusCode, 200);
      cb(null, result);
    }
    function _honeypot(result, cb) {
      // should never be called
    }
    bag.request('GET', 'http://someurl', { proxy: 'http://someproxy', queryStrings: { param1: 'value1' }, handlers: { '2xx': _success, 201: _honeypot } }, function (err, result) {
      assert.isNull(err);
      assert.equals(result.statusCode, 200);
      done();
    });
  },
  'should handle result based on first match when there are multiple matches': function (done) {
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      cb(null, { statusCode: 200, body: 'somebody' });
    });
    function _success(result, cb) {
      assert.equals(result.statusCode, 200);
      cb(null, result);
    }
    function _honeypot(result, cb) {
      // should never be called
    }
    bag.request('GET', 'http://someurl', { proxy: 'http://someproxy', queryStrings: { param1: 'value1' }, handlers: { 200: _success, '2xx': _honeypot } }, function (err, result) {
      assert.isNull(err);
      assert.equals(result.statusCode, 200);
      done();
    });
  },
  'should pass error results to error handler if specified': function (done) {
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      cb(new Error('triumph'));
    });
    function _error(err, result, cb) {
      assert.equals(err.message, 'triumph');
      cb(err, result);
    }
    function _honeypot(result, cb) {
      // should never be called
    }
    bag.request('GET', 'http://someurl', { proxy: 'http://someproxy', queryStrings: { param1: 'value1' }, handlers: { error: _error, 'xxx': _honeypot } }, function (err, result) {
      assert.equals(err.message, 'triumph');
      done();
    });
  },
  'should pass error to callback when result status code is not expected': function (done) {
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, undefined);
      assert.equals(params.qs, undefined);
      cb(null, { statusCode: 888, body: 'somebody' });
    });
    bag.request('GET', 'http://someurl', {}, function (err, result) {
      assert.equals(err.message, 'Unexpected status code: 888\nResponse body:\nsomebody');
      assert.equals(result, undefined);
      done();
    });
  },
  'should set proxy to environment variable when available': function (done) {
    this.stub(process, 'env', { http_proxy: 'http://someproxy', https_proxy: 'https://someproxy' });
    this.stub(request, 'get', function (params, cb) {
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, 'http://someproxy');
      assert.equals(params.qs, undefined);
      cb(null, { statusCode: 888, body: 'somebody' });
    });
    bag.request('GET', 'http://someurl', {}, function (err, result) {
      assert.equals(err.message, 'Unexpected status code: 888\nResponse body:\nsomebody');
      assert.equals(result, undefined);
      done();
    });
  },
  'should not set proxy when URL hostname is on the default no proxy hosts array': function (done) {
    this.stub(process, 'env', { http_proxy: 'http://someproxy', https_proxy: 'https://someproxy' });
    this.stub(request, 'get', function (params, cb) {
      assert.equals(params.url, 'http://localhost');
      assert.equals(params.proxy, undefined);
      cb(null, { statusCode: 200, body: 'somebody' });
    });
    bag.request('GET', 'http://localhost', {}, function (err, result) {
      assert.equals(result, undefined);
      done();
    });
  },
  'should not set proxy when URL hostname is on no proxy hosts opt': function (done) {
    this.stub(process, 'env', { http_proxy: 'http://someproxy', https_proxy: 'https://someproxy' });
    this.stub(request, 'get', function (params, cb) {
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, undefined);
      cb(null, { statusCode: 200, body: 'somebody' });
    });
    bag.request('GET', 'http://someurl', { noProxyHosts: ['someurl'] }, function (err, result) {
      assert.equals(result, undefined);
      done();
    });
  },
  'should accept self-signed certificate': function (done) {
    this.stub(request, 'post', function (params, cb) {
      assert.isFalse(params.rejectUnauthorized);
      cb(null, { statusCode: 200, body: 'somebody' });
    });
    function _success(result, cb) {
      cb(null, result);
    }
    bag.request('POST', 'http://someurl', { handlers: { 200: _success }}, function (err, result) {
      assert.isNull(err);
      done();
    });
  },
  'should follow non-GET redirection': function (done) {
    this.stub(request, 'post', function (params, cb) {
      assert.isTrue(params.followAllRedirects);
      cb(null, { statusCode: 302, body: 'somebody' });
    });
    function _redirect(result, cb) {
      cb(null, result);
    }
    bag.request('POST', 'http://someurl', { handlers: { 302: _redirect }}, function (err, result) {
      assert.isNull(err);
      done();
    });
  },
  'should set timeout': function (done) {
    this.stub(request, 'post', function (params, cb) {
      assert.equals(params.timeout, 10000);
      cb(null, { statusCode: 200 });
    });
    function _success(result, cb) {
      cb(null, result);
    }
    bag.request('POST', 'http://someurl', { timeout: 10000, handlers: { 200: _success }}, function (err, result) {
      assert.isNull(err);
      done();
    });
  },
  'should set headers': function (done) {
    this.stub(request, 'post', function (params, cb) {
      assert.equals(params.headers.foo, 'bar');
      cb(null, { statusCode: 200 });
    });
    function _success(result, cb) {
      cb(null, result);
    }
    bag.request('POST', 'http://someurl', { headers: { foo: 'bar' }, handlers: { 200: _success }}, function (err, result) {
      assert.isNull(err);
      done();
    });
  },
  'should set request payload': function (done) {
    this.stub(request, 'post', function (params, cb) {
      assert.equals(params.json, '{ "foo": "bar" }');
      cb(null, { statusCode: 200 });
    });
    function _success(result, cb) {
      cb(null, result);
    }
    bag.request('POST', 'http://someurl', { json: '{ "foo": "bar" }', handlers: { 200: _success }}, function (err, result) {
      assert.isNull(err);
      done();
    });
  },
  'should override http#req params when requestOpts is provided': function (done) {
    this.stub(process, 'env', { http_proxy: 'http://someproxy', https_proxy: 'https://someproxy' });
    this.stub(request, 'get', function (params, cb) {
      assert.equals(params.proxy, 'http://overrideproxy');
      cb(null, { statusCode: 200, body: 'somebody' });
    });
    function _success(result, cb) {
      cb(null, result);
    }
    bag.request('GET', 'http://someurl', { requestOpts: { proxy: 'http://overrideproxy' }, handlers: { 200: _success }}, function (err, result) {
      assert.isNull(err);
      done();
    });
  }
});

buster.testCase('http - retry', {
  setUp: function () {
    this.mock({});
  },
  'should finish instantly if there is no error': function (done) {
    function successHandler(result, cb) {
      cb(null, result);
    }
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, undefined);
      assert.equals(params.qs, undefined);
      cb(null, { statusCode: 200, body: 'somebody' });
    });
    bag.request('GET', 'http://someurl', { retry: true, handlers: { 200: successHandler } }, function (err, result) {
      assert.isNull(err);
      assert.equals(result.statusCode, 200);
      assert.equals(result._retry.retryCount, 0);
      assert.isFalse(result._retry.retryLimitHit);
      done();
    });
  },
  'should finish instantly if a non temporary error occurs (non retryable status codes)': function (done) {
    var callCount = 0;
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      callCount++;
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, undefined);
      assert.equals(params.qs, undefined);
      cb(null, { statusCode: 400, body: 'somebody' });
    });
    bag.request('GET', 'http://someurl', { retry: true }, function (err, result) {
      assert.equals(err.message, 'Unexpected status code: 400\nResponse body:\nsomebody');
      assert.equals(result, undefined);
      assert.equals(callCount, 1);
      done();
    });
  },
  'should retry when a temporary error occurs before an unexpected result error': function (done) {
    var callCount = 0,
      clock = this.useFakeTimers();
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      callCount++;
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, undefined);
      assert.equals(params.qs, undefined);
      if (callCount === 1) {
        cb(null, { statusCode: 503, body: 'somebody' });
        clock.tick(1000);
        return;
      }
      cb(null, { statusCode: 409, body: 'somebody' });
    });
    bag.request('GET', 'http://someurl', { retry: true }, function (err, result) {
      assert.equals(err.message, 'Unexpected status code: 409\nResponse body:\nsomebody');
      assert.equals(callCount, 2);
      assert.equals(result, undefined);
      done();
    });
  },
  'should finish if max retries is hit': function (done) {
    var callCount = 0,
      expectedTime = 500,
      clock = this.useFakeTimers(),
      opts = {
        retry: true,
        handlers: { '503': testHandler }};
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      callCount++;
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, undefined);
      assert.equals(params.qs, undefined);
      cb(null, { statusCode: 503, body: 'somebody' + callCount });
      expectedTime += expectedTime * 0.5;
      clock.tick(expectedTime);
    });
    function testHandler(result, cb) {
      cb(null, result);
    }
    bag.request('GET', 'http://someurl', opts, function (err, result) {
      assert.isTrue(result._retry.retryLimitHit);
      assert.equals(result._retry.retryCount, 10);
      assert.equals(callCount, 11);
      done();
    });
  },
  'should not retry when max retries is set to 0': function (done) {
    var callCount = 0,
      expectedTime = 500,
      clock = this.useFakeTimers(),
      opts = {
        retry: { statusCodes: [ '5xx' ], scale: 0, delay: 0, maxRetries: 0 },
        handlers: { '503': testHandler }};
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      callCount++;
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, undefined);
      assert.equals(params.qs, undefined);
      cb(null, { statusCode: 503, body: 'somebody' + callCount });
      expectedTime += expectedTime * 0.5;
      clock.tick(expectedTime);
    });
    function testHandler(result, cb) {
      cb(null, result);
    }
    bag.request('GET', 'http://someurl', opts, function (err, result) {
      assert.isTrue(result._retry.retryLimitHit);
      assert.equals(result._retry.retryCount, 0);
      assert.equals(callCount, 1);
      done();
    });
  },
  'should retry only once when max retries is set to 1': function (done) {
    var callCount = 0,
      expectedTime = 500,
      clock = this.useFakeTimers(),
      opts = {
        retry: { statusCodes: [ '5xx' ], scale: 0, delay: 0, maxRetries: 1 },
        handlers: { '503': testHandler }};
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      callCount++;
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, undefined);
      assert.equals(params.qs, undefined);
      cb(null, { statusCode: 503, body: 'somebody' + callCount });
      expectedTime += expectedTime * 0.5;
      clock.tick(expectedTime);
    });
    function testHandler(result, cb) {
      cb(null, result);
    }
    bag.request('GET', 'http://someurl', opts, function (err, result) {
      assert.isTrue(result._retry.retryLimitHit);
      assert.equals(result._retry.retryCount, 1);
      assert.equals(callCount, 2);
      done();
    });
  },
  'should support wildcard matches in custom retry options': function (done) {
    var callCount = 0,
      expectedTime = 500,
      clock = this.useFakeTimers(),
      opts = {
        retry: { statusCodes: [ '5xx' ], scale: 0.5, delay: 500, maxRetries: 37 },
        handlers: { '513': testHandler }};
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      callCount++;
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, undefined);
      assert.equals(params.qs, undefined);
      cb(null, { statusCode: 513, body: 'somebody' + callCount });
      expectedTime += expectedTime * 0.5;
      clock.tick(expectedTime);
    });
    function testHandler(result, cb) {
      cb(null, result);
    }
    bag.request('GET', 'http://someurl', opts, function (err, result) {
      assert.isTrue(result._retry.retryLimitHit);
      assert.equals(callCount, 38);
      done();
    });
  },
  'should retry on socket error': function (done) {
    var callCount = 0,
      expectedTime = 500,
      clock = this.useFakeTimers(),
      opts = {
        retry: { statusCodes: [ '5xx' ], scale: 0, delay: 0, maxRetries: 1, errorCodes: ['CHEESES'] },
        handlers: { 'error': testErrorHandler }};
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      callCount++;
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, undefined);
      assert.equals(params.qs, undefined);
      var error = new Error('I am such a socket error');
      error.code = 'CHEESES';
      cb(error);
      expectedTime += expectedTime * 0.5;
      clock.tick(expectedTime);
    });
    function testErrorHandler(err, result, cb) {
      cb(err, result);
    }
    bag.request('GET', 'http://someurl', opts, function (err, result) {
      assert.equals(err.message, 'I am such a socket error');
      assert.isTrue(result._retry.retryLimitHit);
      assert.equals(result._retry.retryCount, 1);
      assert.equals(callCount, 2);
      done();
    });
  },
  'should error on unsupported socket error': function (done) {
    var callCount = 0,
      expectedTime = 500,
      clock = this.useFakeTimers(),
      opts = {
        retry: { statusCodes: [ '5xx' ], scale: 0, delay: 0, maxRetries: 1, errorCodes: ['CHEESES'] },
        handlers: { 'error': testErrorHandler }};
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      callCount++;
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, undefined);
      assert.equals(params.qs, undefined);
      var error = new Error('I am such a socket error');
      error.code = 'NOTCHEESES';
      cb(error);
      expectedTime += expectedTime * 0.5;
      clock.tick(expectedTime);
    });
    function testErrorHandler(err, result, cb) {
      cb(err, result);
    }
    bag.request('GET', 'http://someurl', opts, function (err, result) {
      assert.equals(err.message, 'I am such a socket error');
      assert.isFalse(result._retry.retryLimitHit);
      assert.equals(callCount, 1);
      done();
    });
  },
  'should retry on any socket error if true': function (done) {
    var callCount = 0,
      expectedTime = 500,
      clock = this.useFakeTimers(),
      opts = {
        retry: { statusCodes: [ '5xx' ], scale: 0, delay: 0, maxRetries: 1, errorCodes: true },
        handlers: { 'error': testErrorHandler }};
    this.stub(process, 'env', {});
    this.stub(request, 'get', function (params, cb) {
      callCount++;
      assert.equals(params.url, 'http://someurl');
      assert.equals(params.proxy, undefined);
      assert.equals(params.qs, undefined);
      var error = new Error('I am such a socket error');
      error.code = 'CHEESES';
      cb(error);
      expectedTime += expectedTime * 0.5;
      clock.tick(expectedTime);
    });
    function testErrorHandler(err, result, cb) {
      cb(err, result);
    }
    bag.request('GET', 'http://someurl', opts, function (err, result) {
      assert.equals(err.message, 'I am such a socket error');
      assert.isTrue(result._retry.retryLimitHit);
      assert.equals(result._retry.retryCount, 1);
      assert.equals(callCount, 2);
      done();
    });
  }
});

buster.testCase('http - proxy', {
  setUp: function () {
    this.mock({});
  },
  'should return http proxy when url uses http and both http and https proxy exist': function () {
    this.stub(process, 'env', { http_proxy: 'http://someproxy', https_proxy: 'https://someproxy' });
    assert.equals(bag.proxy('http://someurl'), 'http://someproxy');
  },
  'should return undefined when url uses http and https proxy exist but not http proxy': function () {
    this.stub(process, 'env', { https_proxy: 'https://someproxy' });
    assert.equals(bag.proxy('http://someurl'), undefined);
  },
  'should return undefined when url uses http and no proxy environment variable exists': function () {
    this.stub(process, 'env', {});
    assert.equals(bag.proxy('http://someurl'), undefined);
  },
  'should return https proxy when url uses https and both http and https proxy exist': function () {
    this.stub(process, 'env', { http_proxy: 'http://someproxy', https_proxy: 'https://someproxy' });
    assert.equals(bag.proxy('https://someurl'), 'https://someproxy');
  },
  'should return https proxy when url uses https and both http and HTTPS PROXY exist': function () {
    this.stub(process, 'env', { http_proxy: 'http://someproxy', HTTPS_PROXY: 'https://someproxy' });
    assert.equals(bag.proxy('https://someurl'), 'https://someproxy');
  },
  'should return http proxy when url uses https and http proxy exists but not https proxy': function () {
    this.stub(process, 'env', { http_proxy: 'http://someproxy' });
    assert.equals(bag.proxy('https://someurl'), 'http://someproxy');
  },
  'should return http proxy when url uses https and HTTP PROXY exists but not https proxy': function () {
    this.stub(process, 'env', { HTTP_PROXY: 'http://someproxy' });
    assert.equals(bag.proxy('https://someurl'), 'http://someproxy');
  },
  'should return undefined when url uses https and no proxy environment variable exist': function () {
    this.stub(process, 'env', {});
    assert.equals(bag.proxy('http://someurl'), undefined);
  },
  'should return http proxy when url does not specify protocol and both http and https proxy exist': function () {
    this.stub(process, 'env', { http_proxy: 'http://someproxy', https_proxy: 'https://someproxy' });
    assert.equals(bag.proxy('someurl'), 'http://someproxy');
  },
  'should return undefined when url does not specify protocol and https proxy exists but not http proxy': function () {
    this.stub(process, 'env', { https_proxy: 'https://someproxy' });
    assert.equals(bag.proxy('someurl'), undefined);
  },
  'should return undefined when url does not specify protocol and no proxy environment variable exists': function () {
    this.stub(process, 'env', {});
    assert.equals(bag.proxy('someurl'), undefined);
  },
  'should return http proxy when url is not specified and both http and https proxy exist': function () {
    this.stub(process, 'env', { http_proxy: 'http://someproxy', https_proxy: 'https://someproxy' });
    assert.equals(bag.proxy(), 'http://someproxy');
  },
  'should return http proxy when url is not specified and http proxy exists but not https proxy': function () {
    this.stub(process, 'env', { http_proxy: 'http://someproxy' });
    assert.equals(bag.proxy(), 'http://someproxy');
  },
  'should return http proxy when url is not specified and HTTP PROXY exists but not https proxy': function () {
    this.stub(process, 'env', { HTTP_PROXY: 'http://someproxy' });
    assert.equals(bag.proxy(), 'http://someproxy');
  },
  'should return https proxy when url is not specified and https proxy exists but not http proxy': function () {
    this.stub(process, 'env', { https_proxy: 'https://someproxy' });
    assert.equals(bag.proxy(), 'https://someproxy');
  },
  'should return http proxy when url is not specified and HTTPS PROXY exists but not https proxy': function () {
    this.stub(process, 'env', { HTTPS_PROXY: 'https://someproxy' });
    assert.equals(bag.proxy(), 'https://someproxy');
  },
  'should return https proxy when url is not specified and HTTPS PROXY exists but not http proxy': function () {
    this.stub(process, 'env', { HTTPS_PROXY: 'https://someproxy' });
    assert.equals(bag.proxy(), 'https://someproxy');
  },
  'should return undefined when url is not specified and no proxy environment variable exists': function () {
    this.stub(process, 'env', {});
    assert.equals(bag.proxy(), undefined);
  },
  'should return undefined when host is localhost or 127.0.0.1': function () {
    this.stub(process, 'env', { HTTP_PROXY: 'http://someproxy', HTTPS_PROXY: 'https://someproxy' });
    assert.equals(bag.proxy('http://localhost/somepath'), undefined);
    assert.equals(bag.proxy('http://127.0.0.1/somepath'), undefined);
    assert.equals(bag.proxy('https://localhost/somepath'), undefined);
    assert.equals(bag.proxy('https://127.0.0.1/somepath'), undefined);
  },
  'should return undefined when host is on custom ignore host list': function () {
    var opts = {
      noProxyHosts: ['somehost1', 'somehost2']
    };
    assert.equals(bag.proxy('http://somehost1', opts), undefined);
    assert.equals(bag.proxy('http://somehost2', opts), undefined);
  },
  'should return proxy when host is not on custom ignore host list': function () {
    this.stub(process, 'env', { HTTP_PROXY: 'http://someproxy' });
    var opts = {
      noProxyHosts: ['somehost1', 'somehost2']
    };
    assert.equals(bag.proxy('http://somehost3', opts), 'http://someproxy');
  }
});
