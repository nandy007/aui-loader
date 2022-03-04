const loaderUtils = require('loader-utils');

module.exports = function(content){
    const options = loaderUtils.getOptions(this) || {};

    const Factory = options&&(options.runin==='vue') ? require('./ComponentFactoryInVue') : require('./ComponentFactory');

    new Factory(this, content);

}