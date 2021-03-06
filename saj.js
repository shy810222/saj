/**
 * <h5>스크립트를 자바 스타일로 코딩하게 하는 라이브러리</h5>
 * <p>GitHub 주소 : https://github.com/shy810222/saj</p>
 * <h6>*주의 사항 및 미지원 사항*</h6>
 * <p>1. function 내부에서 private 및 public 예약어 사용금지</p>
 * <p>2. function 내부에 self로 변수 선언 금지</p>
 * <p>3. class의 이름을 window에 등록된 function 및 object의 이름과 중복되지 않게 해야함</p>
 *
 * @author 송호영
*/

/**
 * @Description extends를 위해 로드할 모든 스크립트 문자열을 순차적으로 불러오고 최종적으로 prototype을 지정해줌
 */
var SAJLoader = function(){
    this.count = 0; //로드된 function 수
    this.total = 0; //총 로드할 function의 수
    this.classList = []; //parsing이 완료된 function 문자열
    this.cb = null; //모든 function 로드 되고서 실행될 callback function
};

/**
 * @param Array l - 작성한 class 문자열 Array
 * @param Function b javascript로 등록되고 나서 실행될 callback function
 * @Description class 문자열에서 정보추출 및 javascript에 맞게 변형
 */
SAJLoader.prototype.load = function(l, b){
    this.cb = b;
    this.total = l.length;
    for(var a=0;a<l.length;a++){
        var c = l[a];
        var cls = new SAJClass();
        cls.load(this, c);
        this.classList.push(cls);
    }
}

/**
 * @Description 모든 function 등록 후 prototype 지정
 */
SAJLoader.prototype.setExtends = function(){
    var c = '';
    for(var i=0;i<this.classList.length;i++){
        var cls = this.classList[i];
        if(cls.extendsName != null && cls.extendsName != ''){
            c += cls.className+'.prototype = new '+cls.extendsName+'();\n';
        }
    }
    var b = new Blob([c], {type : "text/javascript"});
    var DOMURL = window.URL || window.webkitURL || window;
    var url = DOMURL.createObjectURL(b);
    var script = document.createElement('script');
    script.src = url;
    document.querySelector('head').appendChild(script);
    script.addEventListener('load', function(){
        if(this.cb != null && typeof this.cb === 'function') this.cb();
    });
}

/**
 * @Description 한개의 function(class)를 parsing하고 등록
 */
var SAJClass = function(){
    this.debug = false; //디버깅 모드
    this.className = null; //클래스 이름
    this.extendsName = null; //부모 클래스 이름
    this.classConstructor = []; //생성자 함수
    this.publicKeys = []; //public 멤버변수 이름 목록
    this.privateVariables = []; //private 멤버변수 목록
    this.publicVariables = []; //public 멤버변수 목록
    this.privateMethod = []; //private function 목록
    this.publicMethod = []; //public function 목록
    this.staticMethod = []; //static function 목록
}

/**
 * @param function l SAJClass를 호출한 SAJLoader
 * @param string c 작성한 class 문자열
 * @Description class 문자열에서 정보추출 및 javascript에 맞게 변형
 */
SAJClass.prototype.load = function(l, c){
    /* 파싱 중 각 구문 진입여부 초기화 시작 */
    var isClass = false; //클래스명 진입 여부
    var isExtends = false; //부모 클래스명 진입 여부
    var isPrivate = false; //private한 변수 혹은 function 진입여부
    var isPublic = false; //public한 변수 혹은 function 진입여부
    var isStatic = false; //static function 여부
    var isMethod = false; //function 진입여부
    /* 파싱 중 각 구문 진입여부 초기화 끝 */

    if(this.debug){//줄바꿈 제거
        console.log(c.replace(/\n*/g, ''));
    }

    /* 구문별 문자열 추출 시작 */
    var s = c.split(/(?:\{)([\w\W]+)(?:\})/); //클래스 및 부모 클래스 이름과 선언내용 분리
    var t = s[0].replace(/ /g, '').split(/(class|extends)+/g); //클래스 및 부모 클래스 이름 추출

    var j = '';
    for(var i=1;i<s.length;i++){
        j += s[i]; //변수 및 function 선언 내용 합치기
    }
    s = t.concat(j.split(/(private|public)+/g));//추출한 내용 합치기
    /* 구문별 문자열 추출 끝 */

    /* 구문별 설정 및 replace 시작 */
    for(i=0;i<s.length;i++){
        isMethod = /([\w]+)\(([a-zA-Z0-9,_ ]*)\)/.test(s[i]); //현재 구문이 function인지 확인
        isStatic = /([ ]+static[ ]+)/.test(s[i]); //static한 function인지 확인
        if(isClass){ //현재 구문이 클래스 이름일 때
            this.className = s[i].match(/[\w]+/)[0]; //클래스 이름 추출
            isClass = false; //클래스 이름 구문 종료
        }else if(isExtends){ //현재 구문이 부모 클래스 이름일 때
            this.extendsName = s[i].match(/[\w]+/)[0]; //부모 클래스 이름 추출
            isExtends = false; //부모 클래스 이름 구문 종료
        }else if(isPrivate && !isMethod){ //현재 구문이 private하고 function이 아닐 때
            this.setPrivateVariable(s[i]); //private 변수 담기
            isPrivate = false; //private 변수 구문 종료
        }else if(isPublic && !isMethod){ //현재 구문이 public하고 function이 아닐 때
            this.setPublicVariable(s[i]); //public 변수 담기
            isPublic = false; //public 변수 구문 종료
        }else if(isPrivate && isMethod && !isStatic){ //현재 구문이 private하고 function일 때
            var funcStr = s[i].match(/([\w]+)\(([a-zA-Z0-9,_ ]*)\)\{([\w\W]*)(?:\};|\})/); //function 이름, parameter, 내용 추출
            this.setPrivateFunction(funcStr); //private function 담기
            isPrivate = false; //private 구문 종료
            isMethod = false; //function 구문 종료
        }else if(isPublic && isMethod && !isStatic){ //현재 구문이 public하고 function일 때
            var funcStr = s[i].match(/([\w]+)\(([a-zA-Z0-9,_ ]*)\)\{([\w\W]*)(?:\};|\})/); //function 이름, parameter, 내용 추출
            this.setPublicFunction(funcStr); //public function 담기
            isPublic = false; //public 구문 종료
            isMethod = false; //function 구문 종료
        }else if(isMethod && isStatic){ //현재 구문이 static한 funnction일 때
            var funcStr = s[i].match(/([\w]+)\(([a-zA-Z0-9,_ ]*)\)\{([\w\W]*)(?:\};|\})/); //function 이름, parameter, 내용 추출
            this.setStaticFunction(funcStr); //public function 담기
            isPublic = false; //public 구문 종료
            isMethod = false; //function 구문 종료
        }

        isClass = /(class[ ]*)$/.test(s[i]); //현재 구문이 클래스명인지 확인
        isExtends = /(extends[ ]*)$/.test(s[i]); //현재 구문이 부모 클래스명인지 확인
        isPrivate = /private/.test(s[i]); //현재 구문이 private한 변수, 혹은 function인지 확인
        isPublic = /public/.test(s[i]); //현재 구문이 public한 변수, 혹은 function인지 확인
    }
    /* 구문별 설정 및 replace 끝 */

    /* 함수 내용 javascript 변환 시작 */
    this.validateFunction(this.classConstructor); //생성자 함수 javascript구문으로 변경
    this.validateFunction(this.privateMethod); //private 함수 javascript구문으로 변경
    this.validateFunction(this.publicMethod); //public 함수 javascript구문으로 변경
    /* 함수 내용 javascript 변환 끝 */

    if(this.debug){//파싱된 정보 검사
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
    }

    this.registrationFunction(l); //javascript 등록
};

/**
 * @param String s - class 내부의 private하게 선언된 변수 문자열
 * @Description private한 변수 문자열을 javascript에 맞게 변형
 */
SAJClass.prototype.setPrivateVariable = function(s){
    this.privateVariables.push('var '+s.trim());
};

/**
 * @param String s - class 내부의 public하게 선언된 변수 문자열
 * @Description public한 변수 문자열을 javascript에 맞게 변형
 */
SAJClass.prototype.setPublicVariable = function(s){
    this.publicKeys.push(s.match(/([a-zA-Z0-9,_]+)[= ]/)[1]); //public한 변수명은 내부 function의 validate를 위하여 따로 담기
    this.publicVariables.push('this.'+s.trim());
};

/**
 * @param String s[0] - function 전체 선언문
 * @param String s[1] - function명
 * @param String s[2] - parameter들
 * @param String s[3] - function 내부 선언문
 * @Description private한 function을 javascript에 맞게 변형
 */
SAJClass.prototype.setPrivateFunction = function(s){
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

/**
 * @param String s[0] - function 전체 선언문
 * @param String s[1] - function명
 * @param String s[2] - parameter들
 * @param String s[3] - function 내부 선언문
 * @Description public한 function을 javascript에 맞게 변형
 */
SAJClass.prototype.setPublicFunction = function(s){
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

/**
 * @param String s[0] - function 전체 선언문
 * @param String s[1] - function명
 * @param String s[2] - parameter들
 * @param String s[3] - function 내부 선언문
 * @Description static한 function을 javascript에 맞게 변형
 */
SAJClass.prototype.setStaticFunction = function(s){
    var funcData = {
        name: s[1],
        parameters: s[2].split(/[, ]+/),
        func: s[3]
    }
    this.staticMethod.push(funcData);
};

/**
 * @param Array f - function 정보 Object 목록
 * @Description public한 function을 javascript에 맞게 변형
 */
SAJClass.prototype.validateFunction = function(f){
    for(var o=0;o<f.length;o++){
        var fs = '';
        var lines = f[o].func.split('\n'); //function 선언문을 줄바꿈으로 분리
        for(var i=0;i<this.publicKeys.length;i++){
            var t1 = new RegExp('var '+this.publicKeys[i]+'+[ =]', 'g'); //구문에 public 변수명과 같은 이름으로 선언된 var 가 있는지 확인
            var t2 = new RegExp('[ (]'+this.publicKeys[i], 'g'); //구문에 .으로 호출되었는지 확인
            var isDeclare = false;
            for(var l=0;l<lines.length;l++){
                if(!isDeclare){//내부 선언이 되어 있는지 확인
                    isDeclare = t1.test(lines[l]);
                }
                if(!isDeclare){//내부 선언이 없다면
                    replaceStr = lines[l].match(t2); //전역변수인 문자열 추출
                    if(replaceStr != null){ //사용된 전역변수가 있다면
                        for(var r=0;r<replaceStr.length;r++){
                            //public한 변수명일 경우 self를 붙여줌 (this는 스코프변경에 의한 문제 발생여지가 있지 때문에 내부적으로 선언된 self 변수 사용!!)
                            var ts = replaceStr[r].replace(/\(/g, '\\('); //전역변수이름 중 (이 붙은 부분 \(로 변경
                            var s = ts.replace(new RegExp(this.publicKeys[i], 'g'), 'self.'+this.publicKeys[i]); //javascript의 전역변수로 수정
                            lines[l] = lines[l].replace(new RegExp(ts, 'g'), s.replace(/\\\(/g, '(')); //\(이 포함된 전역변수는 (으로 수정하여 한 라인의 문장에서 전역변수만 수정
                        }
                    }
                }
            }
            is = false;
        }
        f[o].func = lines.join('\n'); //function 선언문 다시 결합
    }
};

/**
 * @param Function cb javascript로 등록되고 나서 실행될 callback function
 * @Description parse 및 validate된 function 정보로 javascript 등록
 */
SAJClass.prototype.registrationFunction = function(l){

    /* function 명 설정 */
    var c = 'var '+this.className+' = function(';

    /* function parameter 설정 */
    for(var i=0;i<this.classConstructor.length;i++){
        var parameters = this.classConstructor[i].parameters;
        for(var p=0;p<parameters.length;p++){
            if(p !== 0) c += ', ';
            c += parameters[p];
        }
    }
    c += ') {\n';

    /* self 변수 자동 삽입 */
    c += 'var self = this;\n';

    /* private 변수 설정 */
    for(var i=0;i<this.privateVariables.length;i++){
        c += this.privateVariables[i]+'\n';
    }

    /* public 변수 설정 */
    for(var i=0;i<this.publicVariables.length;i++){
        c += this.publicVariables[i]+'\n';
    }

    /* private function 설정 */
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

    /* public function 설정 */
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

    /* 생성자 함수 구문 실행 영역에 설정 */
    for(var i=0;i<this.classConstructor.length;i++){
        c += this.classConstructor[i].func;
    }
    c += '\n};';

    /* static function 설정 */
    for(var i=0;i<this.staticMethod.length;i++){
        c += this.className+'.'+this.staticMethod[i].name +' = function(';
        var parameters = this.staticMethod[i].parameters
        for(var p=0;p<parameters.length;p++){
            if(p !== 0) c += ', ';
            c += parameters[p];
        }
        c += ') {\n';
        c += this.staticMethod[i].func;
        c += '};\n';
    }

    /* javascript로 바꾼 문자열 Blob데이터로 전환 및 script태그에 등록 */
    var b = new Blob([c], {type : "text/javascript"});
    var DOMURL = window.URL || window.webkitURL || window;
    var url = DOMURL.createObjectURL(b);
    var script = document.createElement('script');
    script.src = url;
    document.querySelector('head').appendChild(script);
    script.addEventListener('load', function(){
        l.count++;
        if(l.count == l.total) l.setExtends();
    });
};