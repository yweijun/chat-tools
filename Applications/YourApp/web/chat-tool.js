function Chat() {
    this.dragable = false;  //是否可拖拽
    this.isShow = false;    // 是否显示
    this.div = document.createElement('div');   //整个聊天框节点
    this.listUlElement = document.createElement('ul');
    this.listDivElement = '';
    this.editElement = '';
    this.divId = '';    //聊天框id
    this.showBtnId = '';    //聊天框显示/隐藏按钮

    /* websocket连接信息 */
    this.host = '';
    this.port = '';
    this.socket = 'ws';
    this.ws = '';

    /* 聊天对象信息 */
    this.onlineArr = [];
    this.talkTo = '';   // 当前聊天对象
    this.myId = '';
}

Chat.prototype = {
    // 初始化
    init: function (initObj) {
        this.showBtnId = initObj.showBtnId ? initObj.showBtnId : '';
        this.divId = initObj.id ? initObj.id : '';
        this.host = initObj.host ? initObj.host : '';
        this.port = initObj.port ? initObj.port : '8080';
        this.http = initObj.http ? initObj.http : 'ws';

        let that = this;
        let showButton = document.getElementById(this.showBtnId);   // 显示/隐藏聊天框按钮
        this.createChatElement();
        that.chatDivShow();
        showButton.onclick = function () {
            that.isShow ? that.chatDivHide() : that.chatDivShow();
        };
        this.wsInit();
        // 登陆
        document.getElementById('login').onclick = function () {
            let username = document.getElementById('username').value;
            that.sendMsg('login', username);
        }

        let senBtn = this.div.getElementsByTagName('button')[0];
        senBtn.onclick = function () {
            that.send();
        }
    },
    createChatElement: function () {
        let that = this;
        this.div.classList.add('c-chat-div');
        this.div.innerHTML = "<div class='c-chat-head'>\n" +
            "        客服聊天\n" +
            "    </div>\n" +
            "    <div class='c-chat-list'>\n" +
            "\n" +
            "    </div>\n" +
            "    <div class='c-chat-content'>\n" +
            "        <div class='c-chat-content-main'>\n" +
            "\n" +
            "        </div>\n" +
            "        <div class='c-chat-content-bottom'>\n" +
            "            <div class='c-chat-tools'>\n" +
            "\n" +
            "            </div>\n" +
            "            <div class='c-chat-text'>\n" +
            "                <textarea class='c-chat-text-edit'></textarea>\n" +
            "            </div>\n" +
            "            <div class='c-chat-button'>\n" +
            "                <button>发送</button>\n" +
            "            </div>\n" +
            "        </div>\n" +
            "    </div>";
        document.getElementById(this.divId).appendChild(this.div);
        this.listDivElement = document.getElementsByClassName('c-chat-list')[0];
        this.editElement = this.div.getElementsByClassName('c-chat-text-edit')[0];

        // 回车监听事件
        function enterSend() {
            // ctrl+enter换行
            if (event.ctrlKey && event.keyCode == 13){
                insertAfterText(that.editElement, '\r');
                event.returnValue = false;
                return false;
            }
            // 回车发送
            if (event.keyCode == 13){
                that.send()
                event.returnValue = false;
                return false;
            }
        }
        this.editElement.onfocus = function () {
            document.addEventListener('keydown',enterSend)
        };
        this.editElement.onblur = function () {
            document.removeEventListener('keydown', enterSend);
        };
    },
    // 弹出聊天框
    chatDivShow: function () {
        let that = this;
        let startx = 0,starty=0,x=0,y=0;
        let chatDiv = document.getElementsByClassName('c-chat-div')[0];   //聊天框
        let chatDivHead = document.getElementsByClassName('c-chat-head')[0];  //头部
        this.div.style.transform = 'scale(1)';
        this.isShow = true;
        // 监听头部鼠标按下
        chatDivHead.addEventListener('mousedown', function (e) {
            that.dragable = true;
            that.div.style.transition = 'all 0s';
            startx = e.clientX;
            starty = e.clientY;
            y = chatDiv.offsetTop;
            x = chatDiv.offsetLeft;
            chatDiv.style.cursor = 'move';
        });
        // 监听头部鼠标抬起
        chatDivHead.addEventListener('mouseup', function () {
            that.dragable = false;
            that.div.style.transition = 'all 1s';
            chatDiv.style.cursor = 'initial';
        });
        // 鼠标移动
        document.onmousemove = function (e) {
            if(that.dragable === true){
                movex =e.clientX - startx;
                movey =e.clientY - starty;
                chatDiv.style.top =y + movey + 'px';
                chatDiv.style.left =x + movex + 'px';
            }
        }
    },
    // 隐藏聊天框
    chatDivHide: function () {
        this.isShow = false;
        this.div.style.transform = 'scale(0)';
    },
    // 聊天列表初始化
    chatListInit: function (list) {
        this.listDivElement.appendChild(this.listUlElement);
        if (!list || list.length === 0) {
            this.listUlElement.innerText = '暂无好友在线';
            return false;
        }
        for(let i=0;i<list.length;i++) {
            this.addNewDialog(list[i]);
        }
    },
    // 添加新聊天对象
    addNewDialog: function (data) {
        console.log(data);
        let that = this;
        let li = document.createElement('li');
        let headImg = document.createElement('img');
        let infoSpan = document.createElement('span');
        let closeBtn = document.createElement('a');
        let tipsSpan = document.createElement('span');  //新消息提醒
        closeBtn.classList.add('c-chat-close');
        headImg.style.cssText = "width:40px;height:40px;border:1px solid #ddd;border-radius:5px;";
        infoSpan.style.cssText = "margin-left:8px;";
        tipsSpan.style.cssText = "position:absolute;top:4px;left:45px;background-color:red;" +
            "width:32px;height:12px;line-height:12px;color:#fff;text-align:center;" +
            "display:none;border-radius:4px;font-size:10px;";
        tipsSpan.classList.add('c-chat-new-msg');

        infoSpan.innerText = data.id;     // 用户名
        headImg.src = '300.jpg';       // 用户头像
        tipsSpan.innerText = 'NEW';
        li.dataset.id = data.id;

        this.listUlElement.appendChild(li);
        li.appendChild(headImg);
        li.appendChild(infoSpan);
        li.appendChild(tipsSpan);
        li.appendChild(closeBtn);
        // 选中聊天对象
        li.onclick = function () {
            let allLI = that.listUlElement.getElementsByTagName('li');
            for(let i=0; i<allLI.length; i++){
                allLI[i].classList.remove('c-chat-list-li-select');
            }
            this.classList.add('c-chat-list-li-select');
            tipsSpan.style.display = 'none';
            that.talkTo = data.id;

            // 获取选中对象的聊天记录
            that.sendMsg('logs', data.id);
        };
        // 关闭某一聊天窗口
        closeBtn.onclick = function () {
            li.remove();
            // 从在线数组中删除
            for(let i=0;i<that.onlineArr.length;i++){
                if(that.onlineArr[i].id === data.id){
                    that.onlineArr.splice(i, 1);
                }
            }
        }
    },
    // 发送
    send: function () {
        let sendContent = this.editElement.value;   //聊天内容
        this.editElement.value = '';
        if (!sendContent) {
            return false;
        }
        if(!this.talkTo){
            alert('选择对象');
            return;
        }
        this.sendMsg('chat', sendContent, this.talkTo);
        this.createSingleLog(sendContent, 1);
    },
    // 单条聊天记录
    createSingleLog: function (data, direct) {
        let showContent = this.div.getElementsByClassName('c-chat-content-main')[0];
        let logDiv = document.createElement('div');
        let headImg = document.createElement('img');
        let contentSpan = document.createElement('span');
        headImg.style.cssText = "display:inline-block;width:40px;height:40px;border-radius:5px;min-width:40px;";
        contentSpan.style.cssText = "margin:0 10px;padding:10px;background-color:#ddd;" +
            "border-radius:10px;word-wrap:break-word;word-break:break-all;white-space:normal;";
        contentSpan.innerText = data;
        headImg.src = "300.jpg";
        showContent.appendChild(logDiv);
        logDiv.appendChild(headImg);
        // 聊天内容展示的左右区分
        if (direct) {
            logDiv.insertBefore(contentSpan, headImg);
            logDiv.style.cssText = "display:flex;justify-content: flex-end;align-items:flex-start;margin-top:10px;"
        } else {
            logDiv.appendChild(contentSpan);
            logDiv.style.cssText = "display:flex;justify-content: flex-start;align-items:flex-start;margin-top:10px;"
        }
        // 滚动条滑到最底部
        showContent.scrollTop = showContent.scrollHeight - showContent.clientHeight;
    },
    // 关闭某聊天窗
    closeDialog: function () {

    },
    // 拉取指定聊天对象的聊天记录
    getChatLogById: function (logs) {
        let showContent = this.div.getElementsByClassName('c-chat-content-main')[0];
        showContent.innerHTML = '';
        for(let i=0;i<logs.length;i++){
            if (logs[i].from === this.myId) {
                this.createSingleLog(logs[i].content, 1);
            } else {
                this.createSingleLog(logs[i].content);
            }
        }
    },
    // 连接ws
    wsInit: function () {
        let that = this;
        this.ws = new WebSocket(this.socket + "://" + this.host + ":" + this.port);
        // 连接
        this.ws.onopen = function () {
            console.log('连接');
        };
        //收到消息
        this.ws.onmessage = function (res) {
            let msg = JSON.parse(res.data);
            switch (msg.type){
                case 'ping':
                    break;
                case 'init':
                    console.log(msg);
                    break;
                case 'chat':
                    that.getMsg(msg.content);
                    break;
                case 'login':
                    that.myId = msg.content.m;
                    that.onlineArr = msg.content.online ? msg.content.online : [];
                    that.chatListInit(msg.content.online);
                    break;
                case 'newMember':
                    if(that.onlineArr.length <= 0){
                        that.onlineArr.push(msg.content);   //添加到在线数组
                        that.listUlElement.innerHTML = '';
                        that.addNewDialog(msg.content);
                    } else {
                        let tmp = true;
                        for(let i=0; i<that.onlineArr.length; i++) {
                            if(msg.content.id == that.onlineArr[i].id){
                                tmp = false;
                                break;
                            }
                        }
                        if (tmp) {
                            that.onlineArr.push(msg.content);   //添加到在线数组
                            that.addNewDialog(msg.content);
                        }
                    }
                    break;
                case 'logs':
                    that.getChatLogById(msg.content);
                    break;
            }
        };
        // 关闭连接
        this.ws.onclose = function () {
            console.log('关闭了');
        };
        // 连接出错
        this.ws.onerror = function () {
            console.log('出错了');
        }
    },
    //接受消息
    getMsg: function (msg) {
        console.log(msg);
        if (this.talkTo === msg.from){
            this.createSingleLog(msg.content);
            return;
        }
        let list = this.listUlElement.getElementsByTagName('li');
        for (let i=0;i<list.length;i++){
            if(list[i].dataset.id === msg.from){
                list[i].getElementsByClassName('c-chat-new-msg')[0].style.display = 'inline-block';
            }
        }
    },
    // 构造发送数据
    sendMsg: function (type, content, to, from) {
        let data = {
            to: to,
            content: content,
            token: 'token',
            type: type,
            from: from
        };
        this.ws.send(JSON.stringify(data));
    }
};

// 在光标后面插入
function insertAfterText(textDom, value) {
    let selectRange;
    if (document.selection) {
        // IE Support
        textDom.focus();
        selectRange = document.selection.createRange();
        selectRange.text = value;
        textDom.focus();
    }else if (textDom.selectionStart || textDom.selectionStart == '0') {
        // Firefox support
        let startPos = textDom.selectionStart;
        let endPos = textDom.selectionEnd;
        let scrollTop = textDom.scrollTop;
        textDom.value = textDom.value.substring(0, startPos) + value + textDom.value.substring(endPos, textDom.value.length);
        textDom.focus();
        textDom.selectionStart = startPos + value.length;
        textDom.selectionEnd = startPos + value.length;
        textDom.scrollTop = scrollTop;
    }
    else {
        textDom.value += value;
        textDom.focus();
    }
}