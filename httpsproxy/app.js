'use strict';

const MAX_DATA_SIZE = '1mb';

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(express.json({limit: MAX_DATA_SIZE}));
app.use(express.urlencoded({ limit: MAX_DATA_SIZE, extended: false }));
app.use(cookieParser());
app.use(express.static( path.join(__dirname, 'public')));
app.use(cors());

const http = require('http');
const https = require('https');

app.all('*', async function(req, res) {
//  console.log(req);
  try{
    console.log('\tmethod=' + req.method);
    console.log('\tendpoint=' + req.params[0]);

    if( req.method == 'GET' && req.params[0].startsWith('/public/') ){
      console.log(req.query);

      var redirect_uri = req.query.redirect_uri;
      var endpoint = req.params[0].slice(7);
      console.log('\tredirect_uri=' + redirect_uri);
      console.log('\turl=' + redirect_uri + endpoint);

      await do_get_stream(redirect_uri + endpoint, req.query, res);
    }else
    if( req.method == 'GET' ){
      console.log(req.query);
      var redirect_uri = req.query.redirect_uri;
      console.log('\tredirect_uri=' + redirect_uri);
      console.log('\turl=' + redirect_uri + req.params[0]);
      delete req.query.redirect_uri;
      delete req.headers.host;
      var ret = await do_get(redirect_uri + req.params[0], req.headers, req.query);
      console.log(ret);
      res.type('application/json');
      for( let key in ret.headers )
        res.set(key, ret.headers[key]);
      res.send(ret);
    }else
    if( req.method == 'POST' ){
      console.log(req.body);
      var redirect_uri = req.body.redirect_uri;
      console.log('\tredirect_uri=' + redirect_uri);
      console.log('\turl=' + redirect_uri + req.params[0]);
      delete req.body.redirect_uri;
      delete req.headers.host;
      var ret = await do_post(redirect_uri + req.params[0], req.headers, req.body);
      console.log(ret);
      res.type('application/json');
      for( let key in ret.headers )
        res.set(key, ret.headers[key]);
      res.send(ret);
    }else{
      console.log('Unknown Endpoint');
      res.sendStatus(404);
    }
  }catch(error){
    console.error(error);
    res.sendStatus(500);
  }
});

var port = Number(process.env.PORT) || 20080;
app.listen(port, () =>{
  console.log('http PORT=' + port)
})

const { URL, URLSearchParams } = require('url');
const fetch = require('node-fetch');
const Headers = fetch.Headers;

function do_post(url, header, body) {
//  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  const headers = new Headers(header);

  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: headers
  })
  .then((response) => {
    if (!response.ok)
      throw 'status is not 200';
    var content_type = response.headers.get("Content-Type");
    if( content_type.indexOf("text/") >= 0 )
    	return response.text();
    if( content_type.indexOf("/json") >= 0 )
        return response.json();
    return response.arrayBuffer();
//    return response.json();
//    return response.text();
//    return response.blob();
//    return response.arrayBuffer();
  });
}

function do_get(url, header, qs) {
  const params = new URLSearchParams(qs);
  const headers = new Headers(header);

  var params_str = params.toString();
  var postfix = (params_str == "") ? "" : ((url.indexOf('?') >= 0) ? ('&' + params_str) : ('?' + params_str));
  return fetch(url + postfix, {
    method: 'GET',
    headers: headers
  })
  .then((response) => {
    if (!response.ok)
      throw 'status is not 200';
    var content_type = response.headers.get("Content-Type");
    if( content_type.indexOf("text/") >= 0 )
    	return response.text();
    if( content_type.indexOf("/json") >= 0 )
        return response.json();
    return response.arrayBuffer();
//    return response.json();
//    return response.text();
//    return response.blob();
//    return response.arrayBuffer();
  });
}

function do_get_stream(url, qs, res) {
  var myhttp;
  if (url.startsWith('https'))
    myhttp = https;
  else
    myhttp = http;

  const params = new URLSearchParams(qs);
  var params_str = params.toString();
  var postfix = (params_str == "") ? "" : ((url.indexOf('?') >= 0) ? ('&' + params_str) : ('?' + params_str));

  myhttp.get(url + postfix, (stream) => {
    for (let key in stream.headers)
      res.set(key, stream.headers[key]);

    stream.pipe(res);
  });
}
