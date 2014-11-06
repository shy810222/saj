(function(){
var SAJLoader = function(){
  this.isDebug = false;
  this.className = null;
  this.extendsName = null;
  this.classConstructor = [];
  this.publicKeys = [];
  this.privateVariables = [];
  this.publicVariables = [];
  this.privateMethod = [];
  this.publicMethod = [];
};

SAJLoader.prototype.load = function(c){
  var isClass = false;
  var isExtends = false;
  var isPrivate = false;
  var isPublic = false;
  var isMethod = false;
  //console.log(c.replace(/\n*/g, ''));
  var s = c.split(/(?:\{)([\w\W]+)(?:\})/);
  var t = s[0].replace(/ /g, '').split(/(class|extends)+/g);
  //console.log(t);
  var j = '';
  for(var i=1;i<s.length;i++){
    j += s[i];
  }
  s = t.concat(j.split(/(private|public)+/g));
  //console.log(s);
  //var s = c.replace(/\n*/g, '').split(/(private|public|class|extends)+/g);
  //a.match(/(?:\{)([\w\W]+)(?:\})/);
  for(i=0;i<s.length;i++){
    isMethod = /([\w]+)\(([a-zA-Z0-9,_ ]*)\)/.test(s[i]);
    if(isClass){
      this.className = s[i].match(/[\w]+/)[0];
      isClass = false;
    }else if(isExtends){
      this.extendsName = s[i].match(/[\w]+/)[0];
      isExtends = false;
    }else if(isPrivate && !isMethod){
      //console.log('[Private Variable]::', s[i]);
      this.setPrivateVariable(s[i]);
      isPrivate = false;
    }else if(isPublic && !isMethod){
      //console.log('[Public Variable]::', s[i]);
      this.setPublicVariable(s[i]);
      isPublic = false;
    }else if(isPrivate && isMethod){
      //console.log('[Private Method]::', s[i]);
      var funcStr = s[i].match(/([\w]+)\(([a-zA-Z0-9,_ ]*)\)\{([\w\W]*)(?:\};|\})/);
      this.setPrivateFunction(funcStr);
      isPrivate = false;
      isMethod = false;
    }else if(isPublic && isMethod){
      //console.log('[Public Method:'+i+']::', s[i]);
      var funcStr = s[i].match(/([\w]+)\(([a-zA-Z0-9,_ ]*)\)\{([\w\W]*)(?:\};|\})/);
      this.setPublicFunction(funcStr);
      isPublic = false;
      isMethod = false;
    }
    isClass = /class/.test(s[i]);
    isExtends = /extends/.test(s[i]);
    isPrivate = /private/.test(s[i]);
    isPublic = /public/.test(s[i]);
  }

  this.validateFunction(this.classConstructor);
  this.validateFunction(this.privateMethod);
  this.validateFunction(this.publicMethod);
  console.log('-------------------------------------------');
  console.log('[this.className]::', this.className);
  console.log('[this.extendsName]::', this.extendsName);
  console.log('[this.classConstructor]::', this.classConstructor);
  console.log('[this.publicKeys]::', this.publicKeys);
  console.log('[this.privateVariables]::', this.privateVariables);
  console.log('[this.publicVariables]::', this.publicVariables);
  console.log('[this.privateMethod]::', this.privateMethod);
  console.log('[this.publicMethod]::', this.publicMethod);
  console.log('-------------------------------------------');
  this.registrationFunction();
  loadLength++;
};

SAJLoader.prototype.setPrivateVariable = function(s){
  this.privateVariables.push('var '+s.trim());
};

SAJLoader.prototype.setPublicVariable = function(s){
  this.publicKeys.push(s.match(/([a-zA-Z0-9,_]+)[= ]/)[1]);
  this.publicVariables.push('this.'+s.trim());
};

SAJLoader.prototype.setPrivateFunction = function(s){
  var funcData = {
    name: 'var '+s[1],
    parameters: s[2].split(/[, ]+/),
    func: s[3]
  }
  if(s[1] === this.className){
    this.classConstructor.push(funcData);
  }else{
    this.privateMethod.push(funcData);
  }
};

SAJLoader.prototype.setPublicFunction = function(s){
  var funcData = {
    name: 'this.'+s[1],
    parameters: s[2].split(/[, ]+/),
    func: s[3]
  }
  if(s[1] === this.className){
    this.classConstructor.push(funcData);
  }else{
    this.publicKeys.push(s[1]);
    this.publicMethod.push(funcData);
  }
};

SAJLoader.prototype.validateFunction = function(f){
  //console.log(f);
  for(var o=0;o<f.length;o++){
    var fs = '';
    var lines = f[o].func.split('\n');
    for(var i=0;i<this.publicKeys.length;i++){
      var t = new RegExp('var '+this.publicKeys[i]+'+[ =]', 'g');
      var is = false;
      for(var l=0;l<lines.length;l++){
        if(!is){ is = t.test(lines[l]); }
        if(!is){
          lines[l] = lines[l].replace(new RegExp(this.publicKeys[i], 'g'), 'self.'+this.publicKeys[i]);
        }
      }
      is = false;
    }
    //console.log(lines.join('\n'));
    f[o].func = lines.join('\n');
  }
};

SAJLoader.prototype.registrationFunction = function(){
  var c = 'var '+this.className+' = function(';
  for(var i=0;i<this.classConstructor.length;i++){
    var parameters = this.classConstructor[i].parameters;
    for(var p=0;p<parameters.length;p++){
      if(p !== 0) c += ', ';
      c += parameters[p];
    }
  }
  c += ') {\n';
  c += 'var self = this;\n';
  for(var i=0;i<this.privateVariables.length;i++){
    c += this.privateVariables[i]+'\n';
  }
  for(var i=0;i<this.publicVariables.length;i++){
    c += this.publicVariables[i]+'\n';
  }
  for(var i=0;i<this.privateMethod.length;i++){
    c += this.privateMethod[i].name +' = function(';
    var parameters = this.privateMethod[i].parameters
    for(var p=0;p<parameters.length;p++){
      if(p !== 0) c += ', ';
      c += parameters[p];
    }
    c += ') {\n';
    c += this.privateMethod[i].func;
    c += '};\n';
  }
  for(var i=0;i<this.publicMethod.length;i++){
    c += this.publicMethod[i].name +' = function(';
    var parameters = this.publicMethod[i].parameters
    for(var p=0;p<parameters.length;p++){
      if(p !== 0) c += ', ';
      c += parameters[p];
    }
    c += ') {\n';
    c += this.publicMethod[i].func;
    c += '};\n';
  }
  for(var i=0;i<this.classConstructor.length;i++){
    c += this.classConstructor[i].func;
  }
  c += '\n};';
  console.log(c);
  var b = new Blob([c], {type : "text/javascript"});
  var DOMURL = window.URL || window.webkitURL || window;
  var url = DOMURL.createObjectURL(b);
  var script = document.createElement('script');
  script.src = url;
  document.querySelector('head').appendChild(script);
};
window.SAJLoader = SAJLoader;
})();