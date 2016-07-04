var express = require('express'),
  router = express.Router(),
  fs = require('fs'),
  _ = require('lodash'),
  path = require('path'),
  glob = require('globby'),
  appConfig = require(__dirname + '/config'),
  prototypePaths = appConfig.prototypePaths,
  utils = require(__dirname + '/utils');

/**
 * format title based on folder name
 * @method function
 * @param  {string} s the folder name
 * @return {string}   formatted title
 */
var formatTitle = function(s) {
  return s[0].toUpperCase() + s.slice(1).replace("-", ' ');
}

/**
 * Redirect to index file
 */
router.get('/', function (req, res) {
  res.redirect('index');
});

/**
 * loop each version route file and bring it in passing router and some config
 */
glob.sync(prototypePaths.routesGlob).forEach(function(p){
  
  var thisTitle = utils.getVersionName(p).title,
      appRoute = prototypePaths.version.replace(':version*', thisTitle) + '/app/',
      stepRoute = prototypePaths.step.replace(':version*', thisTitle);
  // redirect / to the start page for all versions
  router.all(appRoute, function(req,res,next){
    res.redirect(prototypePaths.startPage);
    next();
  });
  
  // hack to get around the prototyping kit and dynamically routing versions
  // this will render the file it finds exists rather than via static middleware
  router.get(appRoute + 'assets/:type/:file', function(req,res,next){
      var type = req.params.type, 
          file = req.params.file;
      if (file.indexOf('..') === -1) {
        return res.sendFile(p.replace(appConfig.versionRoutesFile,'') + '/app/assets/' + type +'/' + file);
      } else {
        res.status = 404;
        return res.send('Not Found');
      }
  });
  
  // load in the routes file specific to this version
  require(p)(router, { 
    path: p,
    prototypePaths: prototypePaths,
    routes: {
      root: appRoute,
      step: stepRoute
    }
  });
  
});

/**
 * for all routes provide some standard context data.
 */
router.use(function(req, res, next){
  // protoypes config obj
  var prototype = { versions: [], stages: appConfig.stages }
  // using glob pattern for the predefined folder structure to grep url and title
  glob.sync(prototypePaths.appsGlob).forEach(function(p){
    var v = utils.getVersionName(p);
    prototype.versions.push({ url: '/versions/' + v.computedPath, title: formatTitle(v.title) });
  });
  // update locals so this data is accessible
  _.merge(res.locals,{
    postData: (req.body ? req.body : false),
    prototype: prototype
  });
  next();
});

/**
 * handle 'phase' (alpha/beta,etc) and 'version' of prototypes by passing some
 * enhanced context data (useful to nunjucks templates).
 */
router.all([prototypePaths.version], function(req, res, next){
  var appPath = '/versions/' + req.params.phase + '/' + req.params.version + '/app/';
  _.merge(res.locals.prototype, {
    current: {
      phase: formatTitle(req.params.phase),
      version: formatTitle(req.params.version),
      body_class: req.params.phase + ' ' + req.params.version,
      path: appPath,
      layout: appPath.substring(1) + 'layout.html'
    }
  });
  next();
});

/**
 * makes param for 'step' available to the view via locals
 */
router.all(prototypePaths.step, function(req,res,next){
  var version = req.params.version || false,
    step = req.params.step || false,
    p = {
      current: {
        page: step
      }
    }
  // update local proto obj with useful data
  res.locals.prototype ? _.merge(res.locals.prototype, p) : res.locals.prototype = p;
  next();
});

module.exports = router;