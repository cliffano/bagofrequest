<img align="right" src="https://raw.github.com/cliffano/bagofrequest/master/avatar.jpg" alt="Avatar"/>

[![Build Status](https://secure.travis-ci.org/cliffano/bagofrequest.png?branch=master)](http://travis-ci.org/cliffano/bagofrequest)
[![Dependencies Status](https://david-dm.org/cliffano/bagofrequest.png)](http://david-dm.org/cliffano/bagofrequest)
[![Published Version](https://badge.fury.io/js/bagofrequest.png)](http://badge.fury.io/js/bagofrequest)
<br/>
[![npm Badge](https://nodei.co/npm/bagofrequest.png)](http://npmjs.org/package/bagofrequest)

Bag Of Request
--------------
Bag Of Request contains request utility functions.

bag.request 
-----------

Send http request using [http://github.com/mikeal/request](mikeal/request), with the following additional features:

* status code-based response handlers registration
* wildcard status code support (e.g. 2xx, 50x)
* unexpected status code error handling with request body included in message
* request retry with increasing delay and maximum retries
* proxy setting based on env vars http_proxy, HTTP_PROXY, https_proxy, HTTPS_PROXY
* proxy exclusion for localhost and 127.0.0.1
* request timeout of 30 seconds
* follow redirects
* accepts self-signed SSL certificates
* all of the above defaults can be overridden

bag.proxy
---------

Proxy retrieval based on URL and environment variables:

* if URL uses http, then sets proxy to http_proxy or HTTP_PROXY
* if URL uses https, then sets proxy to htps_proxy or HTTPS_PROXY, otherwise fallback to http_proxy or HTTP_PROXY
* if URL does not have a protocol, assume http protocol
* if URL is not provided, then set proxy to http_proxy or HTTP_PROXY, otherwise fallback to https_proxy or HTTPS_PROXY

Installation
------------

    npm install bagofrequest

or as a dependency in package.json file:

    "dependencies": {
      "bagofrequest": "x.y.z"
    }

Usage
-----

    var bag = require('bagofrequest');

    bag.request('get', 'http://google.com.au', { timeout: 30000 }, function (err, result) {
    });

    var proxy = bag.proxy('https://google.com.au');
