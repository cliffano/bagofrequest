var buster = require('buster-node'),
  bag = require('../lib/bagofrequest'),
  referee = require('referee'),
  assert = referee.assert;

buster.testCase('http - request', {
  setUp: function () {
    this.timeout = 5000;
  },
  'should send GET request': function (done) {
    bag.request('GET', 'http://google.com', {
        noProxyHosts: 'google.com',
        handlers: {
          200: function (result, cb) {
            assert.match(result.body, /.+Google.+/);
            cb(null);
          }
        }
      },
      function (err, result) {
        assert.isNull(err);
        done();
      });
  }
});

buster.testCase('http - proxy', {
  'should return env var proxy': function () {
    process.env.http_proxy = 'http://someproxy';
    assert.equals(bag.proxy('http://someurl'), 'http://someproxy');

    process.env.https_proxy = 'https://someproxy';
    assert.equals(bag.proxy('https://someurl'), 'https://someproxy');
  }
});
