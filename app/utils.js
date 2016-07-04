var _ = require('lodash');

/**
 * takes a file path and returns a computed relatative path and title based on
 * the first directory name after 'views'
 * @method function
 * @param  {string} path the file path of the thing you want to get a url from
 * @return {object}      process data object
 */
exports.getVersionName = function(path) {
  var sp = path.split('/');
  var computedPath = _.join( _.slice( sp, ( _.indexOf(sp, 'versions') +1 ) ), '/' );
  return {
    computedPath: computedPath,
    title: computedPath.split('/')[1],
  }
}