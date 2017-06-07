/* Include the Security module, we will use this later to escape a HTML attribute*/
var Security = require('ep_etherpad-lite/static/js/security');

/* Time silider detection from md_linkify */
var timesliderRegexp = new RegExp(/p\/[^\/]*\/timeslider/g);
var relativeLink = new RegExp(/^[^\/\:][^\:]*$/g);

var imgRegex =     /[!]\[[^\]]*\]\(([^\)\s]+)(\s[^\)]*)?\)/g ;
var linkRegex = /(^|\ )\[[^\]]*\]\(([^\)\s]+)(\s[^\)]*)?\)/g ;
var referenceRegex = /(^|\ )\[[^\]]*\]\:\ ([^\ ]*)(\ [\"\'\(][^\"\'\)]+[\"\'\)])?/g ;

// Helper functions

matchFilter = function(result, modify) {
  if(!result) return result;
  var s = result[0];
  result[0] = modify(s);
  return result;
};

var unspaceFn = function(result) {
  return matchFilter(result, function(s) {
    return s.replace(/\s/g, "_");
  });
};

var trimFn = function(result, head, tail) {
  if(!result) return result;
  var s = result[0];
  result.index = result.index + head;
  result[0] = s.substr(head, s.length - (head + tail));
  return result;
};

var rmAfter = function(result, str) {
  return matchFilter(result, function(s){
    return s.replace(new RegExp(str + '.*$'), "");
  });
};

var mdLinkSanitizingFn = function(result) {
  if(!result) return result;
  var offset = result[0].indexOf("](") + 2;
  result = trimFn(result, offset, 1);
  result = rmAfter(result, "\\ ");
  result = unspaceFn(result);
  return result;
};

var mdReferenceSanitizingFn = function(result) {
  if(!result) return result;
  s = result[0];
  l = s.length;
  s = s.replace(referenceRegex, "$2");
  result[0] = Array(l - s.length + 1).join("_") + s;
  return result;
};

var CustomRegexp = function(regexp, sanitizeResultFn){
  this.regexp = regexp;
  this.sanitizeResultFn = sanitizeResultFn;
};

CustomRegexp.prototype.exec = function(text){
  var result = this.regexp.exec(text);
  return this.sanitizeResultFn(result);
};

var getCustomRegexpFilter = function(regExp, tag, sanitizeFn, linestylefilter) {
  var customRegexp = new CustomRegexp(regExp, sanitizeFn);
  var filter = linestylefilter.getRegexpFilter(customRegexp, tag);
  return filter;
};

var inlineRegex = function(c) {
  return new RegExp('(^|\\ )('+c+'[^\\ '+c+']((['+c+']*[^'+c+'\\.\\,\\!\\?\\;\\+\\-])*[^\\ '+c+'])?'+c+')', "g");
};

var headingCount = function(str){
  var count = str.replace(/^[^#]*/, '').replace(/[^#].*$/, '').length;
  if(count > 6) return 6;
  if(count < 1) return 1;
  return count;
};

// The core: syntax and tags
// DON'T forget /g at the end of each regex or it will break etherpad! /* why ??? */
var tags = {


  mdTest: { regex: inlineRegex('\\:\\:') },
  mdRight: { regex: /^=.*/g },
  mdWrong: { regex: /^~.*/g },
  mdTrue: { regex: /{T}/g },
  mdFalse: { regex: /{F}/g },
  mdTest2: { regex: /{####.*\.\.\.}/g },
  //mdTest2: { regex: /{\\#\\#\\#\\#(.|\s)*\\.\\.\\.}/g }



};

// add extra html-tags and css-classes
exports.aceCreateDomLine = function(name, context) {
  var imgSrc;
  var mdHeading;
  var cls = context.cls;
  var domline = context.domline;
  var out = [];
  var values = {};

  var keys=Object.keys(tags);

  var clsFn = function(x0, space, value) {
    values[tag] = value;
    var tagClass = tagData.tag ? tagData.tag(value) : '';
    return space + tag + " " + tagClass ;
  };

  for (var i=0;i<keys.length;i++)
  {
    var tag = keys[i];
    var tagData = tags[tag];
    if (cls.indexOf(tag) >= 0) {
      cls = cls.replace(new RegExp("(^| )" + tag + ":(\\S+)","g"), clsFn);
    }
    if(values[tag]) {
      var modifier = {
        extraOpenTags:  (tagData.open ? tagData.open(values[tag]) : ''),
        extraCloseTags: (tagData.close ? tagData.close(values[tag]) : ''),
        cls: cls
      };
      out.push(modifier);
    }
  }

  if(out.length > 0) return out;
  return out;
};

// find matches and add basic tags
exports.aceGetFilterStack = function(name, context) {
  var linestylefilter = context.linestylefilter;
  var array = [];
  var keys=Object.keys(tags);

  for (var i=0;i<keys.length;i++) {
    var tag = keys[i];
    var sanatize = unspaceFn;
    if(tags[tag].sanatize){
      sanatize = tags[tag].sanatize;
    }
    var filter = getCustomRegexpFilter(new RegExp(tags[tag].regex), tag, sanatize, linestylefilter);
    array.push(filter);
  }

  return array;
};

exports.aceEditorCSS = function() {
  return ['ep_giftify/static/css/giftify.css'];
};
