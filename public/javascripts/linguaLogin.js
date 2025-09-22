const appendict = {
    "TH": {

        "errorValidate": {
            "loginFalse": "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
            "loginSuccess": "เข้าสู่ระบบสำเร็จ",
            "fill": "กรุณากรอกให้ครบถ้วน"
        }

    },
    "EN": {

        "errorValidate": {
            "loginFalse": "User Id or Password is Incorrect",
            "loginSuccess": "Login Successfully",
            "fill": "Please fill in the information."
        }

    }
}

const languages = {

    "TH":{
    
        "signin":{
            "lang-Login-Title": "FULL STACK DEVELOPER TEST",
            "lang-Login-UserId": "รหัสผู้ใช้ :",
            "lang-Login-UserId-Placeholder": "รหัสผู้ใช้",
            "lang-Login-Password": "รหัสผ่าน :",
            "lang-Login-Password-Placeholder": "รหัสผ่าน",
            "lang-Login-Button": "เข้าสู่ระบบ",
            "lang-Login-Forgot-Password": "ลืมรหัสผ่าน?",
            "lang-Login-Change-Language": "Change language? Click this icon > ",
            
            "lang-Login-Button-Google": "เข้าสู่ระบบด้วย Google",
            "lang-Login-Button-GitHub": "เข้าสู่ระบบด้วย GitHub",
            "lang-Login-Button-Facebook": "เข้าสู่ระบบด้วย Facebook",

            "lang-Login-Not-Found-User": "ท่านกรอกรหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
            "lang-Login-Something-Wrong-Title": "มีบางอย่างผิดพลาด",
            "lang-Login-Something-Wrong": "กรุณาลองใหม่อีกครั้งในภายหลัง หรือ ติดต่อฝ่ายสนับสนุน",
            "lang-Login-Rate-Limit-Title": "ตรวจพบการใช้งานผิดปกติ",
            "lang-Login-Rate-Limit": "กรุณาลองใหม่อีกครั้งในภายหลัง",
            "lang-Login-Comfirm": "ยืนยัน",
            "lang-Login-Close": "ปิด",
            "lang-Login-Cancel": "ยกเลิก",
        },

        "timeout":{
            "lang-Timeout-Title": "เซสชั่นหมดอายุ",
            "lang-Timeout-Text": "โปรดลงชื่อเข้าใช้งานใหม่อีกครั้ง",
        },

    },

    "EN":{

        "signin":{
            "lang-Login-Title": "FULL STACK DEVELOPER TEST",
            "lang-Login-UserId": "User ID :",
            "lang-Login-UserId-Placeholder": "User ID",
            "lang-Login-Password": "Password :",
            "lang-Login-Password-Placeholder": "Password",
            "lang-Login-Button": "LOGIN",
            "lang-Login-Forgot-Password": "Forgot your password?",
            "lang-Login-Change-Language": "เปลี่ยนภาษา? กดที่รูปเพื่อเปลี่ยน > ",

            "lang-Login-Button-Google": "Login with Google",
            "lang-Login-Button-GitHub": "Login with GitHub",
            "lang-Login-Button-Facebook": "Login with Facebook",

            "lang-Login-Not-Found-User": "You have entered an invalid user ID, password.",
            "lang-Login-Something-Wrong-Title": "Something Wrong",
            "lang-Login-Something-Wrong": "Please try again later or contact the Support.",
            "lang-Login-Rate-Limit-Title": "Abnormal usage detected",
            "lang-Login-Rate-Limit": "Please try again later",
            "lang-Login-Comfirm": "Comfirm",
            "lang-Login-Close": "Close",
            "lang-Login-Cancel": "Cancel",
        },

        "timeout": {
            "lang-Timeout-Title": "Session Expired",
            "lang-Timeout-Text": "Please sign in again",
        }

    }

}


function choosenAppendict(language, type, key) {
    return appendict[language][type][key]
}

function choosenLang(language, Path, key) {
    return languages[language][Path][key]
}

function changeSelectOptionAppendict(language) {
    for (let key in appendict[language]) {
        if (document.querySelector('[appendict-type]') && document.querySelector('[appendict]')) {
            let type, set;
            for (let n = 0; n < $(document).find('[appendict-type]').length; n++) {
                type = document.querySelectorAll('[appendict-type]')[n].attributes['appendict-type'].nodeValue
                set = document.querySelectorAll('[appendict]')[n].attributes['appendict'].nodeValue
                $(document).find('[appendict-type]')[n].textContent = appendict[language][type][set]
                $(document).find('[appendict-type]')[n].textContent = appendict[language][type][set]
            }
        }
    }
}

function changeAppendict(language) {
    for (let key in appendict[language]) {
        if (document.querySelector('[appendict-type]') && document.querySelector('[appendict]')) {
            let type, set;
            const oppositeLang = language == 'EN' ? 'TH' : 'EN';
            for (let n = 0; n < $(document).find('[appendict-type]').length; n++) {
                type = document.querySelectorAll('[appendict-type]')[n].attributes['appendict-type'].nodeValue
                set = document.querySelectorAll('[appendict]')[n].attributes['appendict'].nodeValue
                $(document).find('[appendict-type]')[n].textContent = appendict[language][type][set]

                if (document.querySelectorAll('[appendict]')[n].attributes['data-subtext']) {
                    document.querySelectorAll('[appendict]')[n].attributes['data-subtext'].nodeValue = appendict[oppositeLang][type][set]
                }
            }
        }
    }
}

function changeLanguage(language, Path) {
    for (let key in languages[language][Path]) {

        if ($('.' + key) != undefined && $('.' + key) != null) {
            for (let n = 0; n < $('.' + key).length; n++) {
                if ($('.' + key)[n].type == 'button') {
                    $('.' + key)[n].value  = languages[language][Path][key]
                }
                else if ($('.' + key)[n].type == 'text' || $('.' + key)[n].type == 'password' || $('.' + key)[n].type == 'textarea') {
                    $('.' + key)[n].placeholder  = languages[language][Path][key]
                }
                else if ($('.' + key)[n].type == undefined || $('.' + key)[n].type == "") {
                    $('.' + key)[n].textContent  = languages[language][Path][key]
                }
            }
        }

    }
}