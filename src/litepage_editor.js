;(function(){
    //删除几个元素   arr为数组下标 
    Array.prototype.del = function(arr){

        //对数组重新排序
        //Sort array
        arr.sort(function(a, b){
            return a - b;
        });

        //复制数组，防止污染
        //Clone array in case of being modified
        var b = this.concat([]);
        for(var i = arr.length - 1; i >= 0; i --){
            b.splice(arr[i], 1);
        }

        return b;
    };

    var editor = function(opt){
        if(opt){
            this.cssLink = opt.cssLink;
        }

        this.event = new Event();
    };

    var Event = function(){
        this.map = {};
    };

    Event.prototype = {
        addEventListener: function(name, func){

            if(this.map[name]){
            }else{
                this.map[name] = [];
            }

            this.map[name].push(func);
        },

        trigger: function(name, e){
            if(this.map[name]){
                var eventList = this.map[name];

                eventList.map(function(item){
                    item.call(item, e);
                });
            }
        }
    };

    var statusCommandMap = {
        'bold': ['normal', 'bold'],
        'underline': ['none', 'underline'],
        'italic': ['normal', 'italic'],
        'strikethrough': ['none', 'line-through'],
        'subscript': ['baseline', 'sub'],
        'superscript': ['baseline', 'super']
    };

    // 非继承属性又影响子元素 要检查父的
    var checkParentStyle = ['underline'];

    var styleNodeTagNames = ['sub', 'sup', 'u', 'strong'];
    var styleAttrTagNames = ['font', 'span'];

    var labelMap = {
        bold: 'strong',
        subscript: 'sub', 
        superscript: 'sup',
        'underline': 'u'
    };

    var styleTagNames = styleNodeTagNames.concat(styleAttrTagNames); 

    // 树操作对象
    var Tree = {
        // 标准化树 使样式节点只在叶子节点上
        // span也要去除
        normalizeTree: function(tree){
            var styleNodes = [];
            var leafNodes = [];
            var scan = function(node, inhrintStyles){
                // 已经是叶子节点了
                if(node.nodeType === node.TEXT_NODE){

                   if(inhrintStyles.length){
                       leafNodes.push({
                            inhrintStyles: inhrintStyles.concat([]),
                            node: node
                       });
                   }

                // 非叶子节点
                }else{
                    // 如果是style节点
                    // 标记这是要删除的style节点，
                    if(styleTagNames.indexOf(node.tagName.toLowerCase()) > -1){
                        // inhrintStyles存在此style 不重复增加
                        var exists = 0;
                        for(var i = 0; i < inhrintStyles.length; i ++){
                            if(inhrintStyles[i].tagName === node.tagName){
                                exists = 1;
                                break;
                            }
                        }

                        if(! exists){
                            inhrintStyles = inhrintStyles.concat(node);
                        }

                        styleNodes.push(node);
                    }

                    for(var i = 0; i < node.childNodes.length; i ++){
                        scan(node.childNodes[i], inhrintStyles);
                    }

                }
            };

            scan(tree, []);

            console.log(styleNodes);
            for(var i = 0; i < leafNodes.length; i ++){
                var leafNode = leafNodes[i];
                console.log(leafNode.inhrintStyles, leafNode.node.nodeValue || leafNode.node.outerHTML);
            }

            // 删除样式节点
            for(var i = 0; i < styleNodes.length; i ++){
                var styleNode = styleNodes[i];

                var childNodes = styleNode.childNodes;

                var fragment = document.createDocumentFragment();
                var child;
                while(child = childNodes[0]){
                    fragment.appendChild(child);
                }

                styleNode.parentNode.replaceChild(fragment, styleNode);
            }

            // 对叶子结点进行样式插入
            for(var i = 0; i < leafNodes.length; i ++){
                var leafNode = leafNodes[i];

                if(leafNode.node.nodeValue === ""){
                    leafNode.node.parentNode.removeChild(leafNode.node);
                    continue;
                }

                var node;
                var styleNode;
                var frag = document.createDocumentFragment();
                var currParent = frag;
                while(styleNode = leafNode.inhrintStyles.shift()){
                    // 去除无用atribute属性
                    //if(styleAttrTagNames.indexOf(styleNode.tagName.toLowerCase()) > - 1 && ! styleNode.attributes.length){
                    //}else{
                        el = styleNode.cloneNode();

                        currParent.appendChild(el);

                        currParent = el;
                    //}
                }

                var leafNodeParent = leafNode.node.parentNode;
                var tempNode = document.createElement("span");
                leafNodeParent.replaceChild(tempNode, leafNode.node);

                currParent.appendChild(leafNode.node);

                leafNodeParent.replaceChild(frag, tempNode);
            }
        },
        
        // startNode endNode 要求是leafNode textNode
        getSelectedNodes: function(rootNode, startNode, offsetStart, endNode, offsetEnd){

            var isLeafNode = function(node){
                return node.nodeType === node.TEXT_NODE;
            }

            var startPush = 0;
            var nodes = [];
            var breakAll = 0;

            var replaceTextNodeWithSpan = function(textNode, offsetx, offsety){
                var range = rootNode.ownerDocument.createRange();

                range.setStart(textNode, offsetx);
                range.setEnd(textNode, offsety);

                 var spanNode = document.createElement('span');
                range.surroundContents(spanNode);

                range.insertNode(spanNode);

                return spanNode;
            };

            var normalize = function(spanNode){
                // get topParent
                var p = spanNode;
                while((p = p.parentNode) && p.tagName){
                    if(styleTagNames.indexOf(p.tagName.toLowerCase()) < 0){
                        break;
                    }
                }

                Tree.normalizeTree(p);
            };

            if(startNode === endNode){
                var span = replaceTextNodeWithSpan(startNode, offsetStart, offsetEnd);
                nodes.push(span.childNodes[0]);

                normalize(span);

                return nodes;
            }


            // 这里不必要每次都要创建span
            if(offsetStart === 0){
                nodes.push(startNode);
            }else{
                var span = replaceTextNodeWithSpan(startNode, offsetStart, startNode.nodeValue.length);
                nodes.push(span.childNodes[0]);

                normalize(span);

                startNode = span.childNodes[0];
            }

            if(offsetEnd === endNode.nodeValue.length){
                nodes.push(endNode);
            }else{
                var span = replaceTextNodeWithSpan(endNode, 0, offsetEnd);
                normalize(span);

                nodes.push(span.childNodes[0]);

                endNode = span.childNodes[0];
            }

            var scan = function(node){
                if(breakAll){
                    return;
                }

                if(isLeafNode(node)){
                    if(node === startNode){
                        startPush = 1;

                    }else if(node === endNode){
                        breakAll = 1;

                    }else{
                        if(startPush){
                            if(node.nodeValue === ""){
                            }else{
                                nodes.push(node);
                            }
                        }
                    }
                }else{
                    for(var i = 0; i < node.childNodes.length; i ++){
                        scan(node.childNodes[i]);
                    }
                        
                }
            };

            scan(rootNode);
            return nodes;
        },

        setNodesStyle: function(selectedNodes, name, value){
            selectedNodes.map(function(item){
                item.parentNode.style[name] = value;
            });
        },

        getNodesStyle: function(selectedNodes, name){
        },

        // 检查元素上面是不是有某个标签
        getNodesHasLable: function(selectedNodes, labelName){
            var result = [];
            selectedNodes.map(function(item){
                var p = item.parentNode;

                var flag = 0;;

                do{
                    if(p.tagName.toLowerCase() === labelName){
                        flag = 1;
                        break;
                    }
                }while((p = p.parentNode) && p.tagName)

                result.push(flag);
            });

            return result;
        },

        setNodesUnderLabel: function(selectedNodes, labelName){
            selectedNodes.map(function(item){
                var p = item.parentNode;

                var hasLabel = 0;
                do{
                    if(p.childNodes.length > 1){
                        break;
                    }

                    if(p.tagName.toLowerCase() === labelName){
                        hasLabel = 1;
                        break;
                    }
                }while(p = p.parentNode);

                if(hasLabel){
                }else{
                    var label = document.createElement(labelName);

                    item.parentNode.replaceChild(label, item);

                    label.appendChild(item);
                }
            });
        },

        removeNodesUnderLabel: function(selectedNodes, labelName){
            selectedNodes.map(function(item){
                var p = item.parentNode;

                var hasLabel = 0;
                // 向上检查是不是已经有label, 有了， 如是childNodes>1进行normalize
                do{
                    if(p.tagName.toLowerCase() === labelName){
                        hasLabel = 1;
                        break;
                    }
                }while((p = p.parentNode) && p.tagName);

                if(hasLabel){
                    var child;
                    var frag = p.ownerDocument.createDocumentFragment();
                    while(child = p.childNodes[0]){
                        frag.appendChild(child);
                    }

                    p.parentNode.replaceChild(frag, p);
                }else{
                }
            });
        },

        setBlockElStyle: function(selectedNodes, style, value){
        },

        getBlockElStyle: function(selectedNodes, style){
        },

        getBlockEl: function(selectedNodes){
        }
    };


    // test
    //document.getElementById("testScanCopy").innerHTML = document.getElementById("testScan").innerHTML;
    //Tree.normalizeTree(document.getElementById("testScan"));

    //window.Tree = Tree;

    // test getSelectNodes
    /*
    document.addEventListener("mouseup", function(e){
        var range = window.getSelection();

        if(range.rangeCount){
            range = range.getRangeAt(0);

            var startContainer = range.startContainer;
            var endContainer = range.endContainer;
            var startOffset = range.startOffset;
            var endOffset = range.endOffset;

            if(startContainer.nodeType === startContainer.TEXT_NODE){
            }else{
                startContainer = startContainer[startOffset].childNodes[0];

                startOffset = 0;
            }

            if(endContainer.nodeType === endContainer.TEXT_NODE){
            }else{
                endContainer = endContainer[endOffset].childNodes[0];

                endOffset = endContainer.nodeValue.length;
            }

            //Tree.normalizeTree(range.commonAncestorContainer);
            var nodes = Tree.getSelectedNodes(range.commonAncestorContainer, startContainer, startOffset, endContainer, endOffset);

            Tree.setNodesStyle(nodes, 'font-size', (~~ (Math.random() * 10 + 10)) + 'px');

            console.log(nodes);
            nodes.map(function(item){
                console.log(item.tagName || 'text', 'selectedNode');
                console.log(item.nodeValue || item.outerHTML, 'selectedNode');
            });
        }
    });
    */

    editor.prototype = {
        updateRange: function(nodes){
            var startNode;
            var endNode;
            var range = this.range;

            range.collapse();

            if(nodes.length === 1){
                startNode = nodes[0];
                endNode = nodes[0];
            }else if(nodes.length > 1){
                startNode = nodes[0];
                endNode = nodes[1];
            }


            range.setStart(startNode, 0);
            range.setEndAfter(endNode);

            
            var selection = this.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);


            this.focus();


        },
        render: function(selector){
            var el;
            if(typeof selector === "string"){
                el = document.querySelector(selector);
            }else{
                el = selector;
            }

            var iframe = document.createElement("iframe");
            iframe.setAttribute("frameborder", '0');

            iframe.style.width = "100%";
            iframe.style.height = "100%";

            el.appendChild(iframe);

            this.iframe = iframe;
            this.window = iframe.contentWindow;
            this.document = this.window.document;
            this.body = this.document.body;
            this.head = this.document.head;


            this.body.setAttribute("contenteditable", 'true');

            var cssLink = this.cssLink;

            this.head.innerHTML += "<style type='text/css'>html,body{width: 100%;height: 100%;}</style>";

            if(cssLink){
                this.head.innerHTML += '<link media="all" rel="stylesheet" href="' + cssLink + '" type="text/css" />';
            }

            this.bindEvent();

            var _this = this;
            this.event.addEventListener("selectionchange", function(e){
                _this.onselectionchange();
            });

        },

        onselectionchange: function(){
            this.range = this.getRange();
            //var nodes = this.getRangeNodes(this.range);

            //this.selectedNodes = nodes;

            this.nodesMade = 0;
        },


        getRangeNodes: function(range){
        /*
            // 搜寻过程
            // 从common节点开始遍历
            // 根结点优先的遍历原则
            // 如果发现一个子节点是startNode
            // 就开始 准备插入队列
            // 如果某节点不是endNode，检查其子节点如果不包含结束节点，不需要向下遍历 直接插入，如果包含 遍历子结点 找到最小的单元
            // <div>
            //  <div>
            //      <div>
            //          aaa aaa
            //      </div>
            //      <p>
            //         dsfasdf
            //      </p>
            //  </div>
            //  <p>
            //      <div>
            //          <div>
            //              bbbcc
            //          </div>
            //
            //          <p>
            //             sdfsadf
            //             </p>
            //             jsdfas
        //          </div>
    //          </p>
    //          </div>

            var replaceRangeWithSpan = function(range){
                var spanNode = document.createElement('span');
                range.surroundContents(spanNode);

                range.insertNode(spanNode);

                return spanNode;
            };

            
            var startContainer = range.startContainer;
            var endContainer = range.endContainer;

            var startOffset = range.startOffset;
            var endOffset = range.endOffset;

            var parentNode = range.commonAncestorContainer;

            // 如果startContainer是元素 那么endOffset代表子元素
            // 这时候处理成
            // startContainer是元素  endOffset为-1

            var _startContainer = startContainer;
            var _endContainer= endContainer;
            var _startOffset = startOffset;
            var _endOffset = endOffset;

            // 如果开始是元素 则直接使用开始子节点
            if(startContainer.nodeType === startContainer.ELEMENT_NODE){
                _startContainer = startContainer.childNodes[startOffset];
                _startOffset = -1;
            }

            if(endContainer.nodeType === endContainer.ELEMENT_NODE){
                _endContainer= endContainer.childNodes[endOffset - 1];
                _endOffset = -1;
            }

            //console.log(startContainer, endContainer, startOffset, endOffset, 'container');

            //console.log(_startContainer, _endContainer, 'p container');

            var startPush = 0;
            var nodes = [];
            var breakAll = 0;
            var startContainerIndex, endContainerIndex;
            var checkChildNodeContains = function(node){
                if(breakAll){
                    return;
                }

                // 先检查本节点
                if(node === _startContainer){
                    startPush = 1;

                    //console.log(node.outHTML || node.data, 'is startContainer, push');

                    // 对本节点进行wrap span处理
                    nodes.push(node);

                    startContainerIndex = nodes.length - 1;

                    return;
                }

                if(node === _endContainer){
                    // 对本节点进行wrap span处理
                    nodes.push(node);
                    endContainerIndex = nodes.length - 1;

                    breakAll = 1;

                    //console.log(node.outerHTML || node.data, 'is endContainer, push');

                    return;
                }

                if(startPush){
                    if(node.contains(_endContainer)){
                        //console.log(node.outerHTML || node.data, 'startpush:1, contains');

                        for(var i = 0; i < node.childNodes.length; i ++){
                            checkChildNodeContains(node.childNodes[i]);
                        }
                    }else{
                        //console.log(node.outerHTML || node.data, 'startpush:1, nocontain, push');

                        nodes.push(node);
                    }
                }else{
                    //console.log(node.outerHTML || node.data, 'startpush 0');

                    for(var i = 0; i < node.childNodes.length; i ++){
                        checkChildNodeContains(node.childNodes[i]);
                    }
                }
            };

            var insertAfter = function(newNode, oldNode){
                if(oldNode.parentNode.lastChild === oldNode){
                    oldNode.parentNode.appendChild(newNode);
                }else{
                    oldNode.parentNode.insertBefore(newNode, oldNode.nextSibling);
                }
            };

            if(_startContainer === _endContainer){
                var spanNode = document.createElement('span');
                range.insertNode(spanNode);

                range.surroundContents(spanNode);

                nodes.push(spanNode); 
            }else{
                checkChildNodeContains(parentNode);


                // 处理startContainer
                // 如果压进去的是元素 则不管了
                if(typeof startContainerIndex !== "undefined"){
                    if(nodes[startContainerIndex].nodeType === startContainer.ELEMENT_NODE){

                    // 是文本 要包裹span
                    }else{
                        // 说明被替换过了
                        if(_startOffset === -1){
                            _startOffset = 0;
                        }

                        var _sc = nodes[startContainerIndex];

                        var span = document.createElement("span");

                        var str = _sc.nodeValue.substr(_startOffset); 
                        span.innerHTML = str;

                        _sc.nodeValue = _sc.nodeValue.substring(0, _startOffset);
                        insertAfter(span, _sc);

                        nodes[startContainerIndex] = span;
                    }
                }

                // 处理startContainer
                if(typeof endContainerIndex !== "undefined"){
                    if(nodes[endContainerIndex].nodeType === endContainer.ELEMENT_NODE){
                    }else{
                            var span = document.createElement("span");
                            var _ec = nodes[endContainerIndex];

                            if(_endOffset === -1){
                                _endOffset = _ec.nodeValue.length;
                            }

                            var str = _ec.nodeValue.substring(0, endOffset); 
                            span.innerHTML = str;

                            _ec.nodeValue = _ec.nodeValue.substr(endOffset);
                            _ec.parentNode.insertBefore(span, _ec);

                            nodes[endContainerIndex] = span;
                     }
                }



            }

            //console.log(nodes, 'nodes');

            nodes = this.processNode(nodes);

            return nodes;
            */
             if(range){
                var startContainer = range.startContainer;
                var endContainer = range.endContainer;
                var startOffset = range.startOffset;
                var endOffset = range.endOffset;

                if(startContainer.nodeType === startContainer.TEXT_NODE){
                }else{
                    startContainer = startContainer.childNodes[startOffset];

                    startOffset = 0;
                }

                if(endContainer.nodeType === endContainer.TEXT_NODE){
                }else{
                    endContainer = endContainer.childNodes[endOffset - 1];

                    endOffset = endContainer.nodeValue.length;

                }

                Tree.normalizeTree(range.commonAncestorContainer);
                var nodes = Tree.getSelectedNodes(range.commonAncestorContainer, startContainer, startOffset, endContainer, endOffset);

                /*
                Tree.setNodesStyle(nodes, 'font-size', (~~ (Math.random() * 10 + 10)) + 'px');

                console.log(nodes);
                nodes.map(function(item){
                    console.log(item.tagName || 'text', 'selectedNode');
                    console.log(item.nodeValue || item.outerHTML, 'selectedNode');
                });
                */
                return nodes;
            }
        },

        getComputedStyle: function(node, styleName){
            var checkNode = function(node){
                if(! node || ! node.style){
                    return;
                }

                if(node.style[styleName]){
                    return node.style[styleName];
                }else{
                    return checkNode(node.parentNode);
                }
            };

            return checkNode(node, styleName);
                
        },

        queryCommandValue: function(name){
            var nodes;

            //this.donotTriggerSelectiongChange = 1;

            if(this.nodesMade){
                nodes = this.selectedNodes;
            }else{
                nodes = this.getRangeNodes(this.range);
                this.selectedNodes = nodes;

                this.nodesMade = 1;
            }

            var _this = this;

            var styles = this.getStyle(name);

            var styleName = styles.styleName;
            var styleValue = styles.styleValue;

            var state;
            nodes.map(function(item, index){
                if(item.nodeType === item.TEXT_NODE && item.nodeValue === ""){
                }else{
                    if(item.childNodes.length){
                        //state = window.getComputedStyle(item, styleName).getPropertyValue(styleName);
                        //
                        state = _this.getComputedStyle(item, styleName);
                    }
                }
            });

            return state;
        },

        queryCommandState: function(name){
            var value = this.queryCommandValue(name);

            if(statusCommandMap[name]){
                return statusCommandMap[name].indexOf(value) || 0;
            }else{
                return 1;
            }

            
        },

        // 这里保证所有的node被span包裹 且去掉无用的空span
        processNode: function(nodes){
            var delArr = [];
            for(var i = 0; i < nodes.length; i ++){
                var node = nodes[i];
                if(node.nodeType === node.TEXT_NODE){
                     if(node.nodeValue === ""){
                        node.parentNode.removeChild(node);

                        delArr.push(i);
                     }else{
                         var spanNode = document.createElement('span');
                         var range = this.document.createRange();

                         range.selectNodeContents(node);

                         range.insertNode(spanNode);

                         range.surroundContents(spanNode);

                         nodes[i] = spanNode;  
                     }
                }else if(node.tagName.toLowerCase() === "span" && node.childNodes.length === 0){
                    //node.parentNode.removeChild(node);

                    //delArr.push(i);
                }
            }

            return nodes.del(delArr);

        },

        setStyle: function(node, style, value){
            var removeStyle = function(node){
                var childNodes = [];
                if(node.childNodes.length){
                    childNodes = [].slice.call(node.childNodes, 0);
                }


                for(var i = 0; i < childNodes.length; i ++){
                    var child = childNodes[i];
                    if(child.nodeType === 1){
                        removeStyle(child);

                        child.style[style] = "";
                        
                        //console.log(child.outerHTML, 'outerHTML');

                        if(! child.style.length && child.tagName.toLowerCase() === "span"){
                            var childChild;
                            var frage = document.createDocumentFragment();
                            while(childChild = child.childNodes[0]){
                                frage.appendChild(childChild);
                            }

                            child.parentNode.insertBefore(frage, child);

                            child.parentNode.removeChild(child);

                        }
                    }
                }
            }

            // 向上检查是否可以使用父节点
            var flag = 1;

            var getNoEmptyChildLength = function(somenode){
                var nodeCount = 0;
                for(var i = 0; i < somenode.childNodes.length; i ++){
                    var child = somenode.childNodes[i];

                    if(child.nodeType === child.TEXT_NODE && child.nodeValue.trim().length === 0){
                    }else{
                        nodeCount ++;
                    }
                }

                return nodeCount;
            };

            var child = node;
            do{
                var parent = child.parentNode;
                // remove span
                if(child.tagName.toLowerCase() === "span"){
                    if(getNoEmptyChildLength(parent) === 1){
                        var innerHTML = child.innerHTML;

                        parent.removeChild(child);

                        parent.innerHTML = innerHTML;

                        child = parent;

                        node = child;
                    }else{
                        flag = 0;
                    }
                }else{
                    flag = 0;
                }

            }while(child && flag);

            removeStyle(node);

            if(! node.childNodes.length && node.tagName.toLowerCase() === "span"){
                node.parentNode.removeChild(node);

                // 为null的时候要求删除
                return null;
            }else{
                node.style[style] = value;
            }

            return node;
        },

        getStyle: function(execName, value){
            var styleName = execName, styleValue = value;

            var map = {
                'bold': 'font-weight',
                'fontsize': 'font-size',
                'fontfamily': 'font-family',
                'forecolor': 'color',
                'underline': 'text-decoration',
                'italic': 'font-style',
                'strikethrough': 'text-decoration',
                'subscript': 'vertical-align',
                'superscript': 'vertical-align',
                'lineheight': 'line-height'
            };

           var mapValue = {
                'bold': 'bold'
            };

     
            styleName = map[execName] || execName;
            styleValue = mapValue[execName] || value;


            /*
            if(execName === "bold"){
                styleName = "font-weight";
                styleValue = "bold";
            }else if(execName === "fontsize"){
                styleName = 'font-size';
            }
            */

            return {
                styleName: styleName,
                styleValue: styleValue
            };
        },

        execLabelCommand: function(label){
            if(labelMap[label]){
                label = labelMap[label];
            }



            var nodes;
            //if(this.nodesMade){
            //    nodes = this.selectedNodes;
            //}else{
                nodes = this.getRangeNodes(this.range);
                this.selectedNodes = nodes;

                this.nodesMade = 1;
            //}

            var labelStatus = this.queryLabelCommandValue(label);

            if(labelStatus){
                Tree.removeNodesUnderLabel(nodes, label);
            }else{
                Tree.setNodesUnderLabel(nodes, label);
            }

            this.updateRange(nodes);


        },

        queryLabelCommandValue: function(label){
           if(labelMap[label]){
                label = labelMap[label];
            }


            var nodes;
            if(this.nodesMade){
                nodes = this.selectedNodes;
            }else{
                nodes = this.getRangeNodes(this.range);
                this.selectedNodes = nodes;

                this.nodesMade = 1;
            }

            var r = Tree.getNodesHasLable(nodes, label);

            this.updateRange(nodes);

            var flag = 1;
            r.map(function(item){
                if(! item){
                    flag = 0;
                }
            });

            return flag;


        },

        removeLabelCommand: function(label){
            var nodes;
            if(this.nodesMade){
                nodes = this.selectedNodes;
            }else{
                nodes = this.getRangeNodes(this.range);
                this.selectedNodes = nodes;

                this.nodesMade = 1;
            }

            Tree.normalizeTree(this.body);

            Tree.removeNodesUnderLabel(nodes, label);

        },


        execCommand: function(name, value){
            // 进入编辑状态 这些操作都不出发selectionchange

            this.donotTriggerSelectiongChange = 1;

            var range = this.range;

            var nodes;
            if(this.nodesMade){
                nodes = this.selectedNodes;
            }else{
                nodes = this.getRangeNodes(this.range);
                this.selectedNodes = nodes;

                this.nodesMade = 1;
            }

            var _this = this;


            //console.log(fontSize, 'font-size');

            var styles = this.getStyle(name, value);

            var styleName = styles.styleName;
            var styleValue = styles.styleValue;

            /*
            if(statusCommandMap[name]){
                var status = ! this.queryCommandState(name) ? 1 : 0;

                styleValue = statusCommandMap[name][status];
            }*/

            //console.log(nodes, 'nodes');

            /*
            var delArr = [];
            nodes.map(function(item, index){
                //console.log(item.outerHTML, 'origin');
                var node = _this.setStyle(item, styleName, styleValue);
                //console.log(item.outerHTML, 'processed');

                if(node){
                    nodes[index] = node;
                }else{
                    delArr.push(index);
                }
            });
            */
            Tree.setNodesStyle(nodes, styleName, styleValue);

            //this.selectedNodes = nodes.del(delArr);

            //console.log(nodes, 'nodesafter');


            // trim nodes

            range.collapse();

            range.setStart(nodes[0], 0);
            range.setEndAfter(nodes[nodes.length - 1]);

            var selection = this.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            //this.body.focus();

            this.focus();

            // getChildNodes

        },

        bindEvent: function(){
            var _this = this;
            this.body.addEventListener("input", function(e){
                _this.event.trigger("contentChange", {});
            });

            this.body.addEventListener("mousedown", function(e){
                _this.donotTriggerSelectiongChange = 0;
            });

            this.document.addEventListener("selectionchange", function(e){
                //这里要考率 有些情况是不是触发selectionchange
                //只有用户真正在selectionchange的时候才出发
                // check与之对象看有没有change
                if(! _this.donotTriggerSelectiongChange){
                    _this.event.trigger("selectionchange", {});
                }
            });
        },

        setContent: function(html){
            this.body.innerHTML = html;
        },

        getSelection: function(){
            return this.window.getSelection();
        },

        getRange: function(){
            var selecton = this.window.getSelection();

            var range;

            //console.log(selecton.rangeCount);
            if(selecton.rangeCount){
                range = selecton.getRangeAt(0);
            }else{
                range = this.document.createRange();

                selecton.addRange(range);
            }

            return range;
        },

        // blur和focus都不会影响上次的range
        blur: function(){
            this.donotTriggerSelectiongChange = 1;

            var selection = this.window.getSelection();

            selection.removeAllRanges();

            this.body.blur();
        },

        focus: function(isEnd){

            if(isEnd){
                var range = this.getRange();
                var lastNode = this.body.lastChild;

                if(lastNode){
                    range.setStartAfter(lastNode);
                    range.setEndAfter(lastNode);

                    this.getSelection().removeAllRanges();
                    this.getSelection().addRange(range);
                }
            }else{
                if(this.range){
                    var selection = this.getSelection();

                    selection.removeAllRanges();
                    selection.addRange(this.range);
                }
            }

            //console.log('focus');

            this.body.focus();
        },

        getContent: function(){
            var html = this.body.innerHTML;

            return html;
        },

        addListener: function(eventName, func){
            this.event.addEventListener(eventName, func);
        }
    };

    var E = {
        Editor: editor
    };

    window.LE = E;
})();
