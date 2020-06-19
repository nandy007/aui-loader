const loaderUtils = require('loader-utils');
const cheerio = require('cheerio');
const jqlite = require('chestnut-utils').jqlite;

function stringify(str, isArraySel) {
    str = str || '';
    var htmlArr = str.replace(/\\/g, "\\\\").replace(/\\/g, "\\/").replace(/\'/g, "\\\'").split('\n');
    var len = htmlArr.length;
    var outArr = [];
    if (isArraySel) {
        outArr.push("[");
        htmlArr.forEach(function (value, index) {

            if (index === len - 1) {
                outArr.push("\'" + value + "\'");
            } else {
                if (value !== "") outArr.push("\'" + value + "\',\n");
            }

        });
        outArr.push("].join(\"\\n\")");
    } else {
        htmlArr.forEach(function (value, index) {

            if (index === len - 1) {
                outArr.push("\'" + value + "\';");
            } else {
                if (value !== "") outArr.push("\'" + value + "\'+\n");
            }

        });
    }

    return outArr.join("");
}

function queryToParams(obj, exclude){
    var arr = [];
    for(var k in obj){
        if(exclude&&exclude.indexOf(k)>-1) continue;
        arr.push(k+'='+obj[k]);
    }
    return arr.join('&');
}


class ComponentFactory {

    constructor(loaderContext, content) {

        this.loaderContext = loaderContext;

        const options = loaderUtils.getOptions(loaderContext) || {};

        this.initOptions(options);
        
        this.query = options;

        this.$ = jqlite(content);

        const type = this.$('script').attr('type');

        if(options.only === 'css'){
            this.createCssModule();
        }else if (type === 'text/javascript') {
            this.createStringModule();
        } else {
            this.createComponent(options);
        }

        this.createModule(this.$module);
    }

    initOptions(options){
        if(!options.cssloader) options.cssloader = 'style-loader!css-loader!postcss-loader';
        if(!options.csscache) options.csscache = '__auicssloader__';

        this.cssloader = this.getCssloaderStr(options.cssloader);
        // delete options.cssloader;

        this.precssloader = this.getCssloaderStr(options.precssloader);
        
        this.cssStrCacheKey = options.csscache;
    }

    getCssloaderStr(cssloader){
        if(!cssloader) return '';
        if(!(cssloader instanceof Array)) return cssloader.replace(/[\\]+/g, '/');
        let myuse = cssloader;
        myuse = myuse.map((lo) => {
            if (typeof lo === 'string') return lo.replace(/[\\]+/g, '/');
            return lo.loader.replace(/[\\]+/g, '/') + (function (options) {
                if (!options) return '';
                let args = [];
                for (let k in options) {
                    args.push(k + '=' + options[k]);
                }
                return '?' + args.join('&');
            })(lo.options);
        });
        return myuse.join('!');
    }

    getPathFromRemainingRequest(){
        return loaderUtils.getRemainingRequest(this.loaderContext).split('!').pop();
    }

    set cssCache(str){
        if(!global[this.cssStrCacheKey]) global[this.cssStrCacheKey] = {};
        const key = this.getPathFromRemainingRequest();
        global[this.cssStrCacheKey][key] = str;
    }

    get cssCache(){
        const key = this.getPathFromRemainingRequest();
        return (global[this.cssStrCacheKey] || {})[key] || '';
    }

    createCssModule(){
        this.$module = this.cssCache;
    }

    trim(str){
        if(!str) return str;
        return str.trim();
    }

    createStringModule() {
        const $ = this.$;
        const moduleStr = this.trim($('script').html());

        const funcFragments = [
            'const __mod__ = {exports:{}};',
            'const __str__ = ' + stringify(moduleStr, true)+';',
            '(new Function("module", __str__))(__mod__);',
            "module.exports = __mod__.exports;"
        ];

        this.$module = funcFragments.join('\n');
    }

    uiSplite($els){
        const $ = this.$;
        let templateStr, templates = [], _this = this;
        $els.each(function(){
            const $tpl = $(this), type = $tpl.attr('type'), id = $tpl.attr('id');
            if(type==='template'){
                if(!id){
                    console.log('组件解析错误：模板不符合规范，缺少[ id ]属性。')
                    return;
                }
                const $$ = cheerio.load('<ui>' + $tpl.html() + '</ui>', {decodeEntities:false});
                templates.push(`JQLite.template.setter('${id}', `, _this.trim(stringify($$('ui').html(), true)), `);`);
            }else{
                if(templateStr){
                    console.log('组件解析错误：发现多个ui定义')
                    return;
                }
                templateStr = _this.trim($tpl.html());
            }
            
        });

        return {
            templateStr,
            templates
        };
    }

    decompose(options) {
        const decompose = this._decompose;
        if(decompose) return decompose;
        const $ = this.$;
        const {templateStr, templates} = this.uiSplite($('ui'));
        const moduleStr = this.trim($('script').html());
        
        let styleStr = this.trim($('style').html());
        const styleType = $('style').attr('type') || 'css';
        let globalCss = options && options[styleType+'Global'];
        if(styleStr && globalCss){
            if(typeof globalCss==='string'){
                globalCss = [globalCss];
            }
            const csss = [];
            globalCss.forEach((u)=>{
                csss.push(`@import '${u}';`);
            });
            csss.push(styleStr);
            styleStr = csss.join('\n');
        }

        return this._decompose = {
            templateStr: templateStr,
            moduleStr: moduleStr,
            styleObj: {
                type: styleType,
                text: styleStr
            },
            templates: templates.length===0 ? '' : templates.join('\n')
        }
    }

    parseStyle (styleStr){
        const imports = [];
        styleStr = (styleStr||'').replace(/\@import[ ]+url[ ]*\([ ]*([^ \)]+)[ ]*\)[ ]*;?/g, function(s, s1){
            if(s1.indexOf('.')===0){
                imports.push('require("'+s1+'");');
                return '';
            }
            return s;
        });
        return {
            imports: imports,
            styleStr: stringify(styleStr, true)
        }
    }

    makeCssReqirePath(){
        const { templateStr, moduleStr, styleObj } = this.decompose();
        this.cssCache = styleObj.text;
        const params = queryToParams(this.query, ['cssloader']);
        const cssRequirePaths = [
            'aui-loader?only=css' + (params?'&'+params:''),
            './' + loaderUtils.getRemainingRequest(this.loaderContext).split(/[\/\\]/g).pop()
        ];

        if(this.precssloader) cssRequirePaths.unshift(this.precssloader);

        if(styleObj.type && styleObj.type!=='css') cssRequirePaths.unshift(styleObj.type+'-loader');

        const defaultLoader = this.cssloader;
        cssRequirePaths.unshift(defaultLoader);

        return cssRequirePaths.join('!');
    }

    createComponent(options) {
        const { templateStr, moduleStr, styleObj, templates } = this.decompose(options);
        const auiClassStr = options.auiclass || `require("agile-ui")`; // 可指定aui类全局变量
        const funcFragments = [
            moduleStr,
            '',
            templates,
            `${auiClassStr}.AuiComponent.create(module.exports.default || module.exports, ` + stringify(templateStr, true) + ');'
        ];

        funcFragments.unshift.call(funcFragments, 'require("'+this.makeCssReqirePath()+'");');
        
        this.$module = funcFragments.join('\n');

        
    }

    createModule(){
        this.loaderContext.callback(null, this.$module);
    }

    getModule() {
        return this.$module;
    }

}

module.exports = ComponentFactory;