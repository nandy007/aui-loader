# 关于

aui-loader是用于agile-ui框架内的aui-component的加载器

可以在webpack中自动化构建开发的工具，也可以在amd规范的requirejs中使用

agile-ui介绍和使用请查看https://github.com/nandy007/agile-ui

aui-loader可以将任意符合如下格式的aui后缀文件加载为webpack的模块：


```html

	<ui>
	<!-- some html fragment -->
	</ui>
	
	<script>
	/*
	function Component(){
	}
	Component.prototype = {
	};
	Component.tag = 'componentName';
	module.exports = Component;
	*/
	</script>
	
	<style type="blank|less|sass">
	
	</style>

```

## 在webpack中使用

在webpack中使用时使用agile-cli已经内置调用，不需自己引入，只需要在webpack中配置即可


## 在requirejs中使用

在requirejs环境下使用，请拷贝dist文件夹在的aui.js文件到任意目录，且必须配置requirejs如下：

```javascript

require.config({
	urlArgs: "r=" + (new Date()).getTime(),
    paths: {
    	'less': 'less',// 使用less时必须
    	'agile-ce': 'agile.ce.native.min',// 必须，https://github.com/nandy007/agile-ce
    	'agile-ui': 'agile.ui',// 必须，https://github.com/nandy007/agile-ui
    	'aui': '改名后的aui.js文件'//如果不改名则不需要配置，一旦改名请务必确保配置为aui
    }
});

```

如果style中使用其他css预处理，可以在首次引入aui-loader的时候使用addStyleHandler(name, handler(o, cb))函数加载。

其中：
1. name为预处理的语言，也即style的type属性值；

2. handler为处理函数，此函数会固定接受到两个参数，o为style标签的内容，cb为渲染处理后的结果回调，需要回调时固定传一个参数，即最终的style内容的回调


比如：

```javascript
require(['aui'], function(loader){
	loader.addStyleHandler('sass', function(o, cb){
		// this指向的是requirejs的plugin的load回调函数的参数数组
		// 处理o，及原始的style标签的内容
		var renderContent = *****;
		cb(renderContent);
	});
});

```