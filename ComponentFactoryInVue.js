const loaderUtils = require('loader-utils');
const cheerio = require('cheerio');

class ComponentFactoryInVue {

    constructor(loaderContext, content) {

        // console.log('==========================content:', content)

        this.loaderContext = loaderContext;
        this.content = content;

        this.options = loaderUtils.getOptions(loaderContext) || {};

        const ret = this.parseHTML();

        if(ret){
            this.createVue();

        } else {
            if(this.html.fileName.indexOf('type=style')>-1){
                this.createStyle();
            } else if(this.html.fileName.indexOf('type=component')>-1){
                this.createComponent();
            } else {
                this.createContent();
            }
        }

        this.createModule();

    }

    parseHTML(){

        const fileName = loaderUtils.getRemainingRequest(this.loaderContext).split(/[\\\/]/).pop();
        
        if(fileName.indexOf('.vue')>-1){
            return this.html = {
                fileName
            };
        }

        const content = '<page>' + this.content + '</page>';
        const $ = cheerio.load(content);

        // console.log('============= fileName', fileName);

        const uiStart = this.content.indexOf('<ui>');
        const uiEnd = this.content.indexOf('</ui>');
        let ui = '';
        if(uiStart>-1&&uiEnd>-1){
            ui = this.content.substring(uiStart+4, uiEnd);
        }

        // console.log(fileName, ui);

        this.html = {
            ui: ui.trim(),
            script: ($('script').html()||'').trim(),
            style: ($('style').html()||'').trim(),
            styleType: $('style').attr('type') || '',
            fileName
        };
    }

    createVue(){
        this.$module = this.replaceAuiDefined(this.content).replace(/<style[^>]*>/ig, (s)=>{
            return s + this.createCssVar();
        });
    }

    replaceAuiDefined(content){
        return content.replace(/\<([\/]?)aui\-/ig, function(s, s1){
            return `<${s1}auix-`;
        });
    }

    createCssVar(style){
        let cssVar = (this.options && this.options.cssvar) || [];
        if(!(cssVar instanceof Array)){
            cssVar = [cssVar];
        }

        cssVar = cssVar.slice(0);

        cssVar.forEach(function(v, i){
            v = v.replace(/\\/g, '/');
            cssVar[i] = `@import "${v}";`
        });

        return '\n' + cssVar.join('\n') + '\n' + (style||'');
    }

    createStyle(){
        const {style} = this.html;

        this.$module = this.createCssVar(style);
    }

    createContent(){
        const {fileName, style, styleType, script} = this.html;
        const contents = [];

        if(style) contents.push(`import 'vue-style-loader!css-loader!${styleType?styleType+'-loader!':''}./${fileName}?type=style';`);
        if(script) contents.push(`import 'babel-loader!./${fileName}?type=component';`);

        this.$module = contents.join('\n');
    }

    createComponent(){
        const {ui, script} = this.html;

        const contents = [];

        contents.push(`let __AUI_COMPONENT_DEFINE__ = {};`);

        const content = script.replace(/(export)[ ]+(default)/, function(){
            return `__AUI_COMPONENT_DEFINE__ = `;
        });

        contents.push(content);

        contents.push('require("agile-ui/libs/AuiBasic").util.defineComponent(\`'+ui+'\`)(__AUI_COMPONENT_DEFINE__);');

        contents.push(`export default __AUI_COMPONENT_DEFINE__;`);

        this.$module = contents.join('\n');
    }

    createModule(){
        // console.log('------------\n', this.html.fileName, this.$module, '\n--------------')
        this.loaderContext.callback(null, this.$module);
    }
}

module.exports = ComponentFactoryInVue;
