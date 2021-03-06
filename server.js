var path = require('path'),
    express = require('express'),
    session = require('express-session'),
    nunjucks = require('express-nunjucks'),
    routes = require(__dirname + '/app/routes.js'),
    favicon = require('serve-favicon'),
    app = express(),
    basicAuth = require('basic-auth'),
    bodyParser = require('body-parser'),
    browserSync = require('browser-sync'),
    config = require(__dirname + '/app/config.js'),
    port = (process.env.PORT || config.port),
    packageJson = require(__dirname + '/package.json'),
    utils = require(__dirname + '/lib/utils.js'),
    multer = require('multer'),

// Grab environment variables specified in Procfile or as Heroku config vars
    releaseVersion = packageJson.version,
    username = process.env.USERNAME,
    password = process.env.PASSWORD,
    env      = process.env.NODE_ENV || 'development',
    useAuth  = process.env.USE_AUTH || config.useAuth,
    useHttps  = process.env.USE_HTTPS || config.useHttps;

    env      = env.toLowerCase();
    useAuth  = useAuth.toLowerCase();
    useHttps   = useHttps.toLowerCase();

// Application settings
app.set('view engine', 'html');
app.set('views', [__dirname + '/app/views', __dirname + '/lib']);

// Support session data
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: Math.round(Math.random()*100000).toString()
}));

// app.use(multer({dest:__dirname+'/file/uploads/'}).any());

var storage = multer.diskStorage({
   destination : function(req, file, callback) {
       callback(null, __dirname + '/file/uploads/');
   },
   filename : function(req, file, callback) {
       callback(null, 'dummy-image' + path.extname(file.originalname));
   }
});

//Store image using Multer
//userPhoto is HTML form file name.
app.use (multer({storage : storage}).any());




nunjucks.setup({
  autoescape: true,
  watch: true,
  noCache: true
}, app);

nunjucks.ready(function(nj) {

  // require core and custom filters, merges to one object
  // and then add the methods to nunjucks env obj
  var coreFilters = require(__dirname + '/lib/core_filters.js')(nj, app),
    customFilters = require(__dirname + '/app/filters.js')(nj, app),
    filters = Object.assign(coreFilters, customFilters);
  Object.keys(filters).forEach(function(filterName) {
    nj.addFilter(filterName, filters[filterName]);
  });

  /**
   * allow to declaratively to add something globally
   * @method addFilter
   * @param  {string}  '__setglobal__' name of filterName
   * @param  {function}  function(v,k) value and the key
   */
	nj.addFilter('__setglobal__', function(v, k) {
		nj.addGlobal(k, v);
	});

  // handle adding auto data storage to views
  app.use(/^\/([^.]+)$/,function(req,res,next){
    /**
     * when called will return the value from session object of the key
     * ('name') that's passed in
     * @method addGlobal
     * @param  {string}  "getValue"        name of global function to
     *                                     be added
     *
     * @param  {function}  function('name' key to be looked up from the
     *                                     session object)
     */
    nj.addGlobal("getValue", function(name) {
      return req.session.data[name];
    });

    /**
     * makes the response locals available to templates
     * @method addGlobal
     * @param  {string}  "__locals__" name of the global variables
     * @param  {object}  res.locals   the response locals object
     */
    nj.addGlobal("__locals__", res.locals);

    /**
     * when called with return checked if the input 'name' contains the 'value' passed in
     * @method addGlobal
     * @param  {string}  "checked"      name of the global function to be added
     * @param  {function}  function(name, value)
     */
    nj.addGlobal("isChecked",function(name, value){
        var storedValue = nj.globals.getValue(name);
        if (storedValue != undefined){
          if (Array.isArray(storedValue)){
            return (storedValue.indexOf(value) != -1 ? "checked" : "");
          } else {
            return (value == storedValue ? "checked" : "");
          }
        } else {
          return ""
        }
    });

    next();

  });

  // Authenticate against the environment-provided credentials, if running
  // the app in production (Heroku, effectively)
  if (env === 'production' && useAuth === 'true'){
      app.use(utils.basicAuth(username, password));
  }

  // Middleware to serve static assets
  app.use('/public', express.static(__dirname + '/public'));
  app.use('/public', express.static(__dirname + '/govuk_modules/govuk_template/assets'));
  app.use('/public', express.static(__dirname + '/govuk_modules/govuk_frontend_toolkit'));
  app.use('/public/images/icons', express.static(__dirname + '/govuk_modules/govuk_frontend_toolkit/images'));
  app.use('/public', express.static(__dirname + '/file/uploads'));

  // Elements refers to icon folder instead of images folder
  app.use(favicon(path.join(__dirname, 'govuk_modules', 'govuk_template', 'assets', 'images','favicon.ico')));

  // Support for parsing data in POSTs
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  // Add variables that are available in all views
  app.use(function (req, res, next) {
    res.locals.asset_path="/public/";
    res.locals.serviceName=config.serviceName;
    res.locals.cookieText=config.cookieText;
    res.locals.releaseVersion="v" + releaseVersion;
    next();
  });

  // Force HTTPs on production connections
  if (env === 'production' && useHttps === 'true'){
    app.use(utils.forceHttps);
  }

  // Disallow search index idexing
  app.use(function (req, res, next) {
    // Setting headers stops pages being indexed even if indexed pages link to them.
    res.setHeader('X-Robots-Tag', 'noindex');
    next();
  });

  // add hidden inputs to allow for auto data storage of checkboxes
  app.use(function(req,res,next){

    // store original render function
    var _render = res.render;

    // new render function
    res.render = function(view, options, callback){

      _render.call(this, view, options, function(err, output){

        res.send(output);

      });

    };

    next();

  });

  app.use(utils.autoStoreData);

  app.get('/robots.txt', function (req, res) {
    res.type('text/plain');
    res.send("User-agent: *\nDisallow: /");
  });

  // routes (found in app/routes.js)
  if (typeof(routes) != "function"){
    console.log(routes.bind);
    console.log("Warning: the use of bind in routes is deprecated - please check the prototype kit documentation for writing routes.")
    routes.bind(app);
  } else {
    app.use("/", routes);
  }

  // Strip .html and .htm if provided
  app.get(/\.html?$/i, function (req, res){
    var path = req.path;
    var parts = path.split('.');
    parts.pop();
    path = parts.join('.');
    res.redirect(path);
  });

  // auto render any view that exists
  app.get(/^\/([^.]+)$/, function (req, res) {

    var path = (req.params[0]);

    res.render(path, function(err, html) {
      if (err) {
        res.render(path + "/index", function(err2, html) {
          if (err2) {
            console.log(err);
            res.status(404).send(err + "<br>" + err2);
          } else {
            res.end(html);
          }
        });
      } else {
        res.end(html);
      }
    });

  });

  // redirect all POSTs to GETs to avoid nasty refresh warning
  app.post(/^\/([^.]+)$/, function(req, res){
    res.redirect("/" + req.params[0]);
  });

  console.log("\nGOV.UK Prototype kit v" + releaseVersion);
  // Display warning not to use kit for production services.
  console.log("\nNOTICE: the kit is for building prototypes, do not use it for production services.");

  // start the app
  utils.findAvailablePort(app, function(port) {
    console.log('Listening on port ' + port + '   url: http://localhost:' + port);
    if (env === 'production') {
      app.listen(port);
    } else {
      app.listen(port-50,function()
      {
        browserSync({
          proxy:'localhost:'+(port-50),
          port:port,
          ui:false,
          files:['public/**/*.*','app/views/**/*.*'],
          ghostmode:false,
          open:false,
          notify:false,
          logLevel: "error"
        });
      });
    }
  });


});
