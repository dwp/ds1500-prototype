// Use this file to change prototype configuration.

// Note: prototype config can be overridden using environment variables (eg on heroku)

module.exports = {

  // Service name used in header. Eg: 'Renew your passport'
  serviceName: "Service name goes here",

  // Default port that prototype runs on
  port: '3000',

  // Enable or disable password protection on production
  useAuth: 'true',

  // Force HTTP to redirect to HTTPs on production
  useHttps: 'true',

  // Cookie warning - update link to service's cookie page.
  cookieText: 'GOV.UK uses cookies to make the site simpler. <a href="#" title="Find out more about cookies">Find out more about cookies</a>',

  // this could be accessed from a variety of required js modules so placed here in config
  prototypePaths: {
    version: '/versions/:phase/:version*',                     // e.g '/versions/alpha/alpha-01/'
    step: '/versions/:phase/:version*/app/:step*',              // e.g '/versions/alpha/alpha-01/app/address'
    startPage: 'index',
    appsGlob: [
      __dirname + '/views/versions/**/index.html',
      '!' + __dirname + '/views/versions/**/app/index.html',
    ],
    routesGlob: [
      __dirname + '/views/versions/**/version_routes.js'
    ]
  },
  
  // service design stages with iterations (used to generate automatic directory)
  stages: ['design-sprint'],
  
  // name of the version specific routes file
  versionRoutesFile: 'version_routes.js'

};
	