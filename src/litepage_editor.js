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
            this.filterStyle = opt.filterStyle;
        }

        this.event = new Event();
    };

    var converNodeTag = function(oldNode, newNodeTag){
        var newNode = document.createElement(newNodeTag);

        for(var i = 0; i < oldNode.attributes.length; i ++){
            var attr = oldNode.attributes[i];

            var attrValue = oldNode.getAttribute(attr.name);

            newNode.setAttribute(attr.name, attrValue);
        }

        return newNode;
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

    var styleNodeTagNames = ['sub', 'sup', 'u', 'strong', 'b', 'i','em', 'del'];
    var styleAttrTagNames = ['font', 'span'];

    // 相同的标签 替换为后面的
    var labelSameMap = {
        b: 'strong',
        i: 'em'
    };

    var labelMap = {
        bold: 'strong',
        subscript: 'sub', 
        superscript: 'sup',
        'underline': 'u',
        'italic': 'em',
        'strikethrough': 'del'
    };

    var styleMap = {
        forecolor: ['color'],
        lineheight: ['line-height'],
        fontsize: ['font-size'],
        fontfamily: ['font-family'],
        justify: ['text-align']

    };

    var blockStyle = ['line-height', 'text-align', 'vertical-align'];

    var inlineStyle = ['color', 'font-family', 'font-size'];

    var styleTagNames = styleNodeTagNames.concat(styleAttrTagNames); 

    // 树操作对象
    var Tree = {
        // 标准化树 使样式节点只在叶子节点上
        // span也要去除
        normalizeTree: function(tree, donotTrimSpan){
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
                    // 这里的span 或着stong不能直接重复不增加
                    // 可能stong上会有样式 不重复增加会导致直接删除 样式也没了
                    if(styleTagNames.indexOf(node.tagName.toLowerCase()) > -1){
                        // inhrintStyles存在此style 不重复增加
                        var exists = 0;
                        for(var i = 0; i < inhrintStyles.length; i ++){
                            var converedTagName = inhrintStyles[i].tagName.toLowerCase();
                            converedTagName = labelSameMap[converedTagName] || converedTagName;

                            if(converedTagName === (labelSameMap[node.tagName.toLowerCase()] || node.tagName.toLowerCase())){
                                exists = 1;
                                break;
                            }
                        }

                        if(1 || ! exists){
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

            //console.log(styleNodes);
            for(var i = 0; i < leafNodes.length; i ++){
                var leafNode = leafNodes[i];
                //console.log(leafNode.inhrintStyles, leafNode.node.nodeValue || leafNode.node.outerHTML);
            }

            // 删除样式节点
            // 如果样式节点上带有style coverTo一个span节点
            for(var i = 0; i < styleNodes.length; i ++){
                var styleNode = styleNodes[i];

                var childNodes = styleNode.childNodes;

                var fragment = document.createDocumentFragment();
                var child;
                while(child = childNodes[0]){
                    fragment.appendChild(child);
                }

                styleNode.parentNode.replaceChild(fragment, styleNode);
                /*
                if(styleNode.style.length){
                    var spanEl = converNodeTag(styleNode, 'span');

                    spanEl.appendChild(fragment);

                    styleNode.parentNode.replaceChild(spanEl, styleNode);

                    console.log("styleNode replace span", styleNode.outerHTML);

                }else{
                }
                */
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
                    if(! donotTrimSpan && styleAttrTagNames.indexOf(styleNode.tagName.toLowerCase()) > - 1 && ! styleNode.attributes.length){
                    }else{
                        el = styleNode.cloneNode();

                        if(labelSameMap[el.tagName.toLowerCase()]){
                            el = converNodeTag(el, labelSameMap[el.tagName.toLowerCase()]);
                        }

                        currParent.appendChild(el);

                        currParent = el;
                    }
                }

                var leafNodeParent = leafNode.node.parentNode;
                var tempNode = document.createElement("span");
                leafNodeParent.replaceChild(tempNode, leafNode.node);

                currParent.appendChild(leafNode.node);

                leafNodeParent.replaceChild(frag, tempNode);
            }
        },

       
        // startNode endNode 不要求是leafNode textNode
        getSelectedNodes: function(rootNode, startNode, offsetStart, endNode, offsetEnd){
        /*
            if(startNode.nodeType !== startNode.TEXT_NODE){
                console.warn('start node is not textNode', startNode);
            }

            if(endNode.nodeType !== endNode.TEXT_NODE){
                console.warn('end node is not textNode', endNode);
            }
            */
            // 如果startNode是textNode且是-1 offset要重置
            if(startNode.nodeType === startNode.TEXT_NODE && offsetStart < 0){
                offsetStart = 0;
            }

            if(endNode.nodeType === endNode.TEXT_NODE && offsetEnd < 0){
                offsetEnd = endNode.nodeValue.length;
            }

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

                Tree.normalizeTree(p, 1);
            };


            /*
            if(startNode === endNode){
                var span = replaceTextNodeWithSpan(startNode, offsetStart, offsetEnd);
                nodes.push(span.childNodes[0]);

                normalize(span);

                return nodes;
            }
            */


/*
            // 这里不必要每次都要创建span
            if(offsetStart === 0 && startNode.parentNode.length === 1){
                nodes.push(startNode);
            }else{
                var span = replaceTextNodeWithSpan(startNode, offsetStart, startNode.nodeValue.length);

                // 这时有可能 span childNodes是空的
                // 原因是 比如range.endContainer 是af range.endOffset是2
                if(span.childNodes.length){
                }else{
                    var textNode = startNode.ownerDocument.createTextNode('');
                    span.appendChild(textNode);
                }

                nodes.push(span.childNodes[0]);


                
                startNode = span.childNodes[0];

                // 修剪完之后 虽然span没有被删掉 
                // 但已经是clone的span了，子元素不在它下了
                // 所以要先取 再normalize
                normalize(span);

            }

            if(offsetEnd === endNode.nodeValue.length && endNode.parentNode.childNodes.length === 1){
                nodes.push(endNode);
            }else{
                var span = replaceTextNodeWithSpan(endNode, 0, offsetEnd);

                // 这时有可能 span childNodes是空的
                // 原因是 比如range.startContainer 是af range.startOffset是2
                if(span.childNodes.length){
                }else{
                    var textNode = endNode.ownerDocument.createTextNode('');
                    span.appendChild(textNode);
                }


                nodes.push(span.childNodes[0]);


                endNode = span.childNodes[0];

                normalize(span);
            }
            */

            var scan = function(node){
                if(breakAll){
                    return;
                }

                if(node === startNode){
                    //console.log('is start node, push', node.outerHTML || node.nodeValue);

                    startPush = 1;
                }

                if(isLeafNode(node)){
                    if(startPush){
                        if(node.nodeValue === ""){
                        }else{
                            //console.log('is text node, push', node.outerHTML || node.nodeValue);

                            nodes.push(node);
                        }
                    }
                }else{
                    for(var i = 0; i < node.childNodes.length; i ++){
                        scan(node.childNodes[i]);

                        if(node.childNodes[i] === endNode){
                            breakAll = 1;

                            //console.log('is end node, break All', node.outerHTML || node.nodeValue);
                            return;
                        }
                    }
                        
                }
            };

            scan(rootNode);

            // 如果rootNode为空
            if(! nodes.length){
                console.log('select none textNodes');
                return [];

            // 只选中了一个textNodes
            }else{
                var startTextNode = nodes[0];

                var endTextNode = nodes[nodes.length - 1];

                // 这个表示是element全部被选中
                // 如果选中的textNode和开始的text不同 说明全部包含在selection里面
                if(offsetStart < 0 || startTextNode !== startNode){
                }else{
                    if(offsetStart === 0 && startTextNode.parentNode.childNodes.length === 1 && styleNodeTagNames.indexOf(startTextNode.parentNode.tagName) < 0){
                    }else{
                        if(endNode === startNode){
                            var span = replaceTextNodeWithSpan(startTextNode, offsetStart, offsetEnd);
                        }else{
                            var span = replaceTextNodeWithSpan(startTextNode, offsetStart, startTextNode.nodeValue.length);
                        }

                        startTextNode = span.childNodes[0];

                        nodes[0] = startTextNode;

                        normalize(span);
                    }
                }

                if(offsetEnd < 0 || endTextNode !== endNode || startNode === endNode){
                }else{
                    if(offsetEnd === endTextNode.nodeValue.length && endTextNode.parentNode.childNodes.length === 1 &&  styleNodeTagNames.indexOf(endTextNode.parentNode.tagName) < 0){
                    }else{
                        var span = replaceTextNodeWithSpan(endTextNode, 0, offsetEnd);

                        endTextNode = span.childNodes[0];

                        nodes[nodes.length - 1] = endTextNode;

                        normalize(span);
                    }
                }
            }

            return nodes;
        },

        setNodesStyle: function(selectedNodes, name, value){
            selectedNodes.map(function(item){
                item.parentNode.style[name] = value;
            });
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

        getNodesStyle: function(selectedNodes, name){
            var result = [];
            var _this = this;
            selectedNodes.map(function(item){
               var nodeStyle =  window.getComputedStyle(item.parentNode).getPropertyValue(name);

               result.push(nodeStyle);
            });

            return result;
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

                    if(p.style.length){
                       var spanEl = converNodeTag(p, 'span');

                        spanEl.appendChild(frag);

                        p.parentNode.replaceChild(spanEl, p);

                    }else{

                        p.parentNode.replaceChild(frag, p);
                    }
                }else{
                }
            });
        },

        setBlockElStyle: function(selectedNodes, style, value){
            selectedNodes.map(function(item){
                // find block parent
                var p = item;

                while(p = p.parentNode){
                    var display = window.getComputedStyle(p).getPropertyValue('display');

                    if(display === "block" || display === "inline-block"){
                        break;
                    }
                }

                p.style[style] = value;
            });
        },

        getBlockElStyle: function(selectedNodes, style){
            var result = [];
            selectedNodes.map(function(item){
                // find block parent
                var p = item;

                while(p = p.parentNode){
                    var styles = window.getComputedStyle(p)
                    var display = styles.getPropertyValue('display');

                    if(display === "block" || display === "inline-block"){

                        result.push(styles.getPropertyValue(style));
                        break;
                    }
                }


            });

            return result;

        },

        getBlockEl: function(selectedNodes){
        }
    };


    editor.prototype = {
        updateRange: function(nodes, focus){
            var startNode;
            var endNode;
            var range = this.range;

            range.collapse();

            startNode = nodes[0];
            endNode = nodes[nodes.length - 1];

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

            this.head.innerHTML += "<style type='text/css'>html,body{width: 100%;height: 100%;overflow:hidden;}</style>";

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
             var findTextNodes = function(node, pos){
                if(node.nodeType === node.TEXT_NODE && node.nodeValue.length){
                    breakAll = 1;
                    return node;
                }

                if(pos === 'first'){
                    for(var i = 0; i < node.childNodes.length; i ++){
                        var child = node.childNodes[i];

                        var childText = findTextNodes(child, pos);

                        if(childText){
                            return childText;
                        }else{
                        }
                    }
                }else{
                    for(var i = node.childNodes.length - 1; i > -1; i --){
                        var child = node.childNodes[i];

                        var childText = findTextNodes(child, pos);

                        if(childText){
                            return childText;
                        }else{
                        }
                    }
                }
             };

             var findExtendTextNodes = function(node, pos){
                    
                var textNode = findTextNodes(node);
                if(textNode){
                }else{
                    var nextNode;
                    var sibling = node.sibling;
                    if(sibling){
                        nextNode = sibling;
                    }else{
                        nextNode = node.parentNode.sibling;
                    }
                }
             };

             var findClosetTextNode = function(node){
             };
             */

             if(range){
                var startContainer = range.startContainer;
                var endContainer = range.endContainer;
                var startOffset = range.startOffset;
                var endOffset = range.endOffset;

                if(startContainer.nodeType === startContainer.TEXT_NODE){
                }else{
                    startContainer = startContainer.childNodes[startOffset];

                    startOffset = -1;
                }

                if(endContainer.nodeType === endContainer.TEXT_NODE){
                }else{
                    endContainer = endContainer.childNodes[endOffset - 1];

                    endOffset = -1;

                }

                Tree.normalizeTree(range.commonAncestorContainer);
                var nodes = Tree.getSelectedNodes(range.commonAncestorContainer, startContainer, startOffset, endContainer, endOffset);

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
            if(this.range.collapsed){
            }else{
                if(labelMap[name]){
                    return this.queryLabelCommandValue(name);
                }else if(styleMap[name]){
                    return this.queryStyleCommand(styleMap[name][0]);
                }
            }
        },

        queryCommandState: function(name){
            return this.queryCommandValue(name);
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

        execLabelCommand: function(label, value){
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
            if(labelMap[name]){
                this.execLabelCommand(name, value);
            }else if(styleMap[name]){
                this.execStyleCommand(styleMap[name][0], value);
            }else if(name === "selectall"){
                this.selectAll();

                return;
            }

            this.event.trigger("contentChange");
        
        },

        queryStyleCommand: function(name){
            var nodes;
            if(this.nodesMade){
                nodes = this.selectedNodes;
            }else{
                nodes = this.getRangeNodes(this.range);
                this.selectedNodes = nodes;

                this.nodesMade = 1;
            }

            if(inlineStyle.indexOf(name) > -1){
                var r = Tree.getNodesStyle(nodes, name);
            }else if(blockStyle.indexOf(name) > -1){
                var r = Tree.getBlockElStyle(nodes, name);
            }

            this.updateRange(nodes);

            return r[0];

        },

        execStyleCommand: function(name, value){
            var nodes;
            //if(this.nodesMade){
            //    nodes = this.selectedNodes;
            //}else{
                nodes = this.getRangeNodes(this.range);
                this.selectedNodes = nodes;

                this.nodesMade = 1;
            //}

            if(inlineStyle.indexOf(name) > -1){
                Tree.setNodesStyle(nodes, name, value);
            }else if(blockStyle.indexOf(name) > -1){
                Tree.setBlockElStyle(nodes, name, value);
            }

            this.updateRange(nodes);
        },

        bindEvent: function(){
            var _this = this;
            this.body.addEventListener("input", function(e){
                _this.event.trigger("contentChange", {});
            });

            this.document.addEventListener("contextmenu", function(e){
                e.preventDefault();
                return false;
            });

            this.body.addEventListener("mousedown", function(e){
                _this.donotTriggerSelectiongChange = 0;
            });

            var mouseupHandler = function(){
                _this.document.removeEventListener('mouseup', mouseupHandler);
                window.removeEventListener("mouseup", mouseupHandler);

                if(! _this.donotTriggerSelectiongChange){
                    _this.event.trigger("selectionchange", {});
                }
            };

            this.document.addEventListener("mousedown", function(e){
                _this.document.removeEventListener("mouseup", mouseupHandler);
                _this.document.addEventListener("mouseup", mouseupHandler);

                window.removeEventListener("mouseup", mouseupHandler);
                window.addEventListener("mouseup", mouseupHandler);
            });

            var selectAllKeyDownHandler = function(){
                _this.document.removeEventListener("keyup", selectAllKeyDownHandler);
                document.removeEventListener("keyup", selectAllKeyDownHandler);

                _this.event.trigger('selectionchange');
            };

            this.document.addEventListener("keydown", function(e){
                var keyCode = e.keyCode;

                if(keyCode === 65 && e.ctrlKey){
                    _this.document.addEventListener("keyup", selectAllKeyDownHandler);
                    document.addEventListener("keyup", selectAllKeyDownHandler);
                }
            });

            this.document.addEventListener("paste", function(e){
                 var clipData = e.clipboardData;

                if(! clipData.items || ! clipData.items.length){
                    return;
                }

                if(! _this.filterStyle){
                    return;
                }


                var html = clipData.getData('text/html');

                if(html){
                    _this.insertHtml(_this._filterHtml(html));

                    e.preventDefault();
                }
/*

                var result;
                if(clipData.getData("text/litepage")){
                    if(pastedData && pastedData.type === "pageData"){
                        pastePage();
                    }else{
                        pasteObject();
                    }
                }else{
                    var item = clipData.items[0];
                    */
            });

        },

        setContent: function(html){
            this.body.innerHTML = html;

            if(this.body.childNodes[0]){
                if(this.body.childNodes[0].getAttribute('data-name') === 'body'){
                    var style = this.body.childNodes[0].getAttribute("style");

                    this.body.innerHTML = this.body.childNodes[0].innerHTML + "<p><br /></p>";

                    this.body.setAttribute("style", style);
                }else{
                    this.body.innerHTML += "<p><br /></p>";
                }
            }
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

        selectAll: function(focus){
            if(this.range){
                this.range.collapse();
            }else{
                this.range = this.getRange();
            }

            this.range.selectNode(this.body);

            this.nodesMade = 0;

            if(focus){
                this.focus();
            }
        },

        _filterHtml: function(html){
            var _this = this;
          if(html){
              var div = document.createElement('div');
              div.innerHTML = html;

                var removeChildNodes = [];

                var scan = function(node){
                    for(var i = 0; i < node.childNodes.length; i ++){
                        var child = node.childNodes[i];

                        if(child.nodeType === child.COMMENT_NODE){
                            removeChildNodes.push(child);

                            continue;
                        }

                        for(var j = 0; j < _this.filterStyle.length; j ++){
                            var styleName = _this.filterStyle[j];

                            if(child.style){
                                child.style[styleName] = '';
                            }
                        }

                        scan(child);
                    }
                };

                scan(div);

                var r;
                while(r = removeChildNodes.shift()){
                    r.parentNode.removeChild(r);
                }

                return div.innerHTML;
            }else{
                return '';
            }
        },

        getContent: function(){
            var html = this.body.innerHTML;

            var content;
            if(this.body.style.length){
                var style = this.body.getAttribute('style');

                content = '<div data-name="body" style="' + style + '">' + html + '</div>';
            }else{
                content = '<div data-name="body">' + html + '</div>';
            }

            return content;
        },

        addListener: function(eventName, func){
            this.event.addEventListener(eventName, func);
        },
        insertHtml: function(html){
            this.document.execCommand('insertHtml', false, html);
        }
        
    };

    var E = {
        Editor: editor
    };

    window.LE = E;
})();
