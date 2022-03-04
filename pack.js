var path = require('path'),
    fs = require('fs');
var UglifyJS = require("uglify-es");

console.log('文件打包开始');

var packageJSON = require('./package.json');

var fileName = 'aui.js'

var content = fs.readFileSync('./'+fileName, 'utf8');
content = ['const str = \`', content,`\`;
if(window.define && window.define.amd){
	(new Function(str))();
}`].join('');
var result = UglifyJS.minify(content);
if(result.error){
    console.error(result.error);
}else{
    content = result.code;
}

const arr = [];
arr.push('/**');
arr.push('  * aui-loader aui组件加载器');
arr.push('  * Version: '+packageJSON.version+'.'+new Date().getTime());
arr.push('  * Author: '+packageJSON.author);
arr.push("  * License MIT @ https://github.com/nandy007/aui-loader");
arr.push('  */');
arr.push(content);

fs.writeFileSync('./dist/'+fileName, arr.join('\n'));

console.log('文件打包完毕，请查看dist文件夹下的'+fileName);

