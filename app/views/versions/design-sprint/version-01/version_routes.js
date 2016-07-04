module.exports = function(router, config) {
  
  // routing for all pages directly below version/app/
  router.all(config.routes.step, function(req,res,next){

    var requestedPage = req.params.step,
        postData = req.body || {};
        
    // place version routing below this line:
    // console.log(requestedPage);
    
    next();
  
  });

  return router;
}
