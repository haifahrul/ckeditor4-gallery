/**
 * The gallery dialog definition.
 * Copyright (c) 2003-2013, Cricri042. All rights reserved.
 * Targeted for "Viewer JS" <https://github.com/fengyuanchen/viewerjs>
 */

/**
 * Debug : var_dump
 *
 * @var: Var
 * @level: Level max
 *
 */

function removeDomainFromUrl(string) {
    "use strict";
    return string.replace(/^https?:\/\/[^\/]+/i, '');
}

var IMG_PARAM = { URL: 0, TITLE: 1, ALT: 2, WIDTH: 3, HEIGHT: 4 },
    pluginPath = removeDomainFromUrl(CKEDITOR.plugins.get('gallery').path),
    BASE_PATH = removeDomainFromUrl(CKEDITOR.basePath),
    // JQUERY_SCRIPT = "https://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js",
    JQUERY_SCRIPT = pluginPath + "vendor/jquery.min.js",
    VIEWER_JS = pluginPath + 'vendor/viewer/viewer.min.js',
    VIEWER_CSS = pluginPath + "vendor/viewer/viewer.min.css",
    GALLERY_CSS = pluginPath + "styles/gallery.min.css";

function var_dump(_var, _level) {
    "use strict";
    var dumped_text = "";
    if (!_level) {
        _level = 0;
    }

    //The padding given at the beginning of the line.
    var level_padding = "";
    var j;
    for (j = 0; j < _level + 1; j += 1) {
        level_padding += "    ";
    }

    if (typeof (_var) == 'object') { //Array/Hashes/Objects
        var item;
        var value;

        for (item in _var) {
            if (_var.hasOwnProperty(item)) {
                value = _var[item];

                if (typeof (value) == 'object') { // If it is an array,
                    dumped_text += level_padding + "'" + item + "' ...\n";
                    dumped_text += var_dump(value, _level + 1);
                } else {
                    dumped_text += level_padding + "'" + item + "' => \"" + value + "\"\n";
                }
            }
        }

    } else { //Stings/Chars/Numbers etc.
        dumped_text = "===>" + _var + "<===(" + typeof (_var) + ")";
    }
    return dumped_text;
}

var listItem = function (node) {
    "use strict";
    return node.type == CKEDITOR.NODE_ELEMENT && node.is('li');
};

var ULItem = function (node) {
    "use strict";
    return node.type == CKEDITOR.NODE_ELEMENT && node.is('ul');
};

var iFrameItem = function (node) {
    "use strict";
    return node.type == CKEDITOR.NODE_ELEMENT && node.is('iframe');
};

Array.prototype.pushUnique = function (item) {
    "use strict";
    var i;
    for (i = 0; i < this.length; i += 1) {
        if (this[i][0] == item[0]) {
            return -1;
        }
    }
    this.push(item);
    return this.length - 1;
};

Array.prototype.updateVal = function (item, data) {
    "use strict";
    var i;
    for (i = 0; i < this.length; i += 1) {
        if (this[i][0] == item) {
            this[i] = [item, data];
            return true;
        }
    }
    this[i] = [item, data];
    return false;
};

Array.prototype.getVal = function (item) {
    "use strict";
    var i;
    for (i = 0; i < this.length; i += 1) {
        if (this[i][0] == item) {
            return this[i][1];
        }
    }
    return null;
};


// Our dialog definition.
CKEDITOR.dialog.add('galleryDialog', function (editor) {
    "use strict";
    var lang = editor.lang.gallery;

    //----------------------------------------------------------------------------------------------------
    // COMBO STUFF
    //----------------------------------------------------------------------------------------------------
    // Add a new option to a CHKBOX object (combo or list).
    function addOption(combo, optionText, optionValue, documentObject, index) {
        combo = getSelect(combo);
        var oOption;
        if (documentObject) {
            oOption = documentObject.createElement("OPTION");
        } else {
            oOption = document.createElement("OPTION");
        }

        if (combo && oOption && oOption.getName() == 'option') {
            if (CKEDITOR.env.ie) {
                if (!isNaN(parseInt(index, 10))) {
                    combo.$.options.add(oOption.$, index);
                } else {
                    combo.$.options.add(oOption.$);
                }

                oOption.$.innerHTML = optionText.length > 0 ? optionText : '';
                oOption.$.value = optionValue;
            } else {
                if (index !== null && index < combo.getChildCount()) {
                    combo.getChild(index < 0 ? 0 : index).insertBeforeMe(oOption);
                } else {
                    combo.append(oOption);
                }

                oOption.setText(optionText.length > 0 ? optionText : '');
                oOption.setValue(optionValue);
            }
        } else {
            return false;
        }
        return oOption;
    }

    // Remove all selected options from a CHKBOX object.
    function removeSelectedOptions(combo) {
        combo = getSelect(combo);
        // Save the selected index
        var iSelectedIndex = getSelectedIndex(combo);
        // Remove all selected options.
        var i;
        for (i = combo.getChildren().count() - 1; i >= 0; i -= 1) {
            if (combo.getChild(i).$.selected) {
                combo.getChild(i).remove();
            }
        }

        // Reset the selection based on the original selected index.
        setSelectedIndex(combo, iSelectedIndex);
    }

    //Modify option  from a CHKBOX object.
    function modifyOption(combo, index, title, value) {
        combo = getSelect(combo);
        if (index < 0) {
            return false;
        }
        var child = combo.getChild(index);
        child.setText(title);
        child.setValue(value);
        return child;
    }

    function removeAllOptions(combo) {
        combo = getSelect(combo);
        while (combo.getChild(0) && combo.getChild(0).remove()) { /*jsl:pass*/
        }
    }

    // Moves the selected option by a number of steps (also negative).
    function changeOptionPosition(combo, steps, documentObject, dialog) {
        combo = getSelect(combo);
        var iActualIndex = getSelectedIndex(combo);
        if (iActualIndex < 0) {
            return false;
        }

        var iFinalIndex = iActualIndex + steps;
        iFinalIndex = (iFinalIndex < 0) ? 0 : iFinalIndex;
        iFinalIndex = (iFinalIndex >= combo.getChildCount()) ? combo.getChildCount() - 1 : iFinalIndex;

        if (iActualIndex == iFinalIndex) {
            return false;
        }

        var re = /(^IMG_\d+)/;
        // Modify sText in final index
        var oOption = combo.getChild(iFinalIndex),
            sText = oOption.getText(),
            sValue = oOption.getValue();
        sText = sText.replace(re, "IMG_" + iActualIndex);
        modifyOption(combo, iFinalIndex, sText, sValue);

        // do the move
        oOption = combo.getChild(iActualIndex);
        sText = oOption.getText();
        sValue = oOption.getValue();

        oOption.remove();

        //		alert(sText+ " / "+ sValue);
        //		var result = re.exec(sText);
        sText = sText.replace(re, "IMG_" + iFinalIndex);
        //		alert(sText);
        oOption = addOption(combo, sText, sValue, (!documentObject) ? null : documentObject, iFinalIndex);
        setSelectedIndex(combo, iFinalIndex);

        // update dialog.imagesList
        var valueActual = dialog.imagesList[iActualIndex];
        var valueFinal = dialog.imagesList[iFinalIndex];
        dialog.imagesList[iActualIndex] = valueFinal;
        dialog.imagesList[iFinalIndex] = valueActual;

        return oOption;
    }

    function getSelectedIndex(combo) {
        combo = getSelect(combo);
        return combo ? combo.$.selectedIndex : -1;
    }

    function setSelectedIndex(combo, index) {
        combo = getSelect(combo);
        if (index < 0) {
            return null;
        }

        var count = combo.getChildren().count();
        combo.$.selectedIndex = (index >= count) ? (count - 1) : index;
        return combo;
    }

    function getOptions(combo) {
        combo = getSelect(combo);
        return combo ? combo.getChildren() : false;
    }

    function getSelect(obj) {
        if (obj && obj.domId && obj.getInputElement().$) {
            return obj.getInputElement();
        } else if (obj && obj.$) {
            return obj;
        }
        return false;
    }

    function unselectAll(dialog) {
        var editBtn = dialog.getContentElement('gallery-content-id', 'editselectedbtn');
        var deleteBtn = dialog.getContentElement('gallery-content-id', 'rm-selected-btn');
        editBtn = getSelect(editBtn);
        editBtn.hide();
        deleteBtn = getSelect(deleteBtn);
        deleteBtn.hide();
        var comboList = dialog.getContentElement('gallery-content-id', 'img-items-id');
        comboList = getSelect(comboList);
        var i;
        for (i = comboList.getChildren().count() - 1; i >= 0; i -= 1) {
            comboList.getChild(i).$.selected = false;
        }
    }

    function unselectIfNotUnique(combo) {
        var dialog = combo.getDialog();
        var selectefItem = null;
        combo = getSelect(combo);
        var cnt = 0;
        var editBtn = dialog.getContentElement('gallery-content-id', 'editselectedbtn');
        var deleteBtn = dialog.getContentElement('gallery-content-id', 'rm-selected-btn');
        var i, child;
        for (i = combo.getChildren().count() - 1; i >= 0; i -= 1) {
            child = combo.getChild(i);
            if (child.$.selected) {
                cnt++;
                selectefItem = child;
            }
        }
        if (cnt > 1) {
            unselectAll(dialog);
            return null;
        } else if (cnt == 1) {
            editBtn = getSelect(editBtn);
            editBtn.show();
            deleteBtn = getSelect(deleteBtn);
            deleteBtn.show();
            displaySelected(dialog);
            return selectefItem;
        }
        return null;
    }

    function displaySelected(dialog) {
        if (dialog.openCloseStep == true) {
            return;
        }
        var previewCombo = dialog.getContentElement('gallery-content-id', 'frame-preview-id');
        if (previewCombo.isVisible()) {
            previewGallery(dialog);
        } else {
            // editeSelected(dialog);
        }
    }

    function selectFirstIfNotUnique(combo) {
        var dialog = combo.getDialog();
        combo = getSelect(combo);
        var firstSelectedInd = 0;
        var i, child, selectefItem;
        for (i = 0; i < combo.getChildren().count(); i += 1) {
            child = combo.getChild(i);
            if (child.$.selected) {
                selectefItem = child;
                firstSelectedInd = i;
                break;
            }
        }
        setSelectedIndex(combo, firstSelectedInd);
        displaySelected(dialog);
    }

    function getSlectedIndex(dialog) {
        var combo = dialog.getContentElement('gallery-content-id', 'img-items-id');
        return getSelectedIndex(combo);
    }

    //----------------------------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------------------------

    function removePlaceHolderImg(dialog) {
        var urlPlaceHolder = BASE_PATH + 'plugins/gallery/images/placeholder.png';
        if ((dialog.imagesList.length == 1) && (dialog.imagesList[0][IMG_PARAM.URL] == urlPlaceHolder)) {
            // Remove the place Holder Image
            var combo = dialog.getContentElement('gallery-content-id', 'img-items-id');
            combo = getSelect(combo);
            var i = 0;
            // Remove image from image Array
            dialog.imagesList.splice(i, 1);
            // Remove image from combo image list
            combo.getChild(i).remove();
        }
    }

    function updateImgList(dialog) {
        removePlaceHolderImg(dialog);
        var preview = dialog.previewImage;
        var url = preview.$.src;
        // var ratio = preview.$.width / preview.$.height;
        // var w = 50;
        // var h = 50;
        // if (ratio > 1) {
        //     h = h / ratio;
        // } else {
        //     w = w * ratio;
        // }
        var oOption;
        var combo = dialog.getContentElement('gallery-content-id', 'img-items-id');
        // var ind = dialog.imagesList.pushUnique([url, '', '', w.toFixed(0), h.toFixed(0)]);
        var ind = dialog.imagesList.pushUnique([url]); // REVIEW:
        if (ind >= 0) {
            oOption = addOption(combo, 'IMG_' + ind + ' : ' + url.substring(url.lastIndexOf('/') + 1), url, dialog.getParentEditor().document);
            // select index 0
            setSelectedIndex(combo, ind);
            // Update dialog
            displaySelected(dialog);
        }
    }

    // function editeSelected(dialog) {
    //     var combo = dialog.getContentElement('gallery-content-id', 'img-items-id');
    //     var iSelectedIndex = getSelectedIndex(combo);
    //     var value = dialog.imagesList[iSelectedIndex];
    //
    //     combo = dialog.getContentElement('gallery-content-id', 'img-title-id');
    //     combo = getSelect(combo);
    //     combo.setValue(value[1]);
    //     combo = dialog.getContentElement('gallery-content-id', 'img-desc-id');
    //     combo = getSelect(combo);
    //     combo.setValue(value[2]);
    //     combo = dialog.getContentElement('gallery-content-id', 'img-preview-id');
    //     combo = getSelect(combo);
    //     var imgHtml = '<div style="text-align:center;"> <img src="' + value[0] +
    //         '" title="' + value[1] +
    //         '" alt="' + value[2] +
    //         '" style=" max-height: 200px;  max-width: 350px;' + '"> </div>';
    //     combo.setHtml(imgHtml);
    //     var previewCombo = dialog.getContentElement('gallery-content-id', 'frame-preview-id');
    //     var imgCombo = dialog.getContentElement('gallery-content-id', 'img-params-id');
    //     previewCombo = getSelect(previewCombo);
    //     previewCombo.hide();
    //     imgCombo = getSelect(imgCombo);
    //     imgCombo.show();
    // }

    function removeSelected(dialog) {
        var combo = dialog.getContentElement('gallery-content-id', 'img-items-id');
        combo = getSelect(combo);
        var someRemoved = false;
        // Remove all selected options.
        var i;
        for (i = combo.getChildren().count() - 1; i >= 0; i--) {
            if (combo.getChild(i).$.selected) {
                // Remove image from image Array
                dialog.imagesList.splice(i, 1);
                // Remove image from combo image list
                combo.getChild(i).remove();
                someRemoved = true;
            }
        }
        if (someRemoved) {
            if (dialog.imagesList.length == 0) {
                var url = BASE_PATH + 'plugins/gallery/images/placeholder.png';
                var oOption = addOption(combo, 'IMG_0' + ' : ' + url.substring(url.lastIndexOf('/') + 1), url, dialog.getParentEditor().document);
                dialog.imagesList.pushUnique([url, lang.imgTitle, lang.imgDesc, '50', '50']);
            }
            // select index 0
            setSelectedIndex(combo, 0);
            // Update dialog
            displaySelected(dialog);
        }
    }

    function upDownSelected(dialog, offset) {
        var combo = dialog.getContentElement('gallery-content-id', 'img-items-id');
        combo = getSelect(combo);
        var iSelectedIndex = getSelectedIndex(combo);
        if (combo.getChildren().count() == 1) {
            return;
        }
        if ((offset == -1) && (iSelectedIndex == 0)) {
            return;
        }
        if ((offset == 1) && (iSelectedIndex == combo.getChildren().count() - 1)) {
            return;
        }
        //alert(iSelectedIndex+" / "+combo.getChildren().count() + " / "+ offset);
        changeOptionPosition(combo, offset, dialog.getParentEditor().document, dialog);

        updateFramePreview(dialog);
    }

    // To automatically get the dimensions of the poster image
    var onImgLoadEvent = function () {
        // Image is ready.
        var preview = this.previewImage;
        preview.removeListener('load', onImgLoadEvent);
        preview.removeListener('error', onImgLoadErrorEvent);
        preview.removeListener('abort', onImgLoadErrorEvent);
        updateImgList(this);
    };

    var onImgLoadErrorEvent = function () {
        // Error. Image is not loaded.
        var preview = this.previewImage;
        preview.removeListener('load', onImgLoadEvent);
        preview.removeListener('error', onImgLoadErrorEvent);
        preview.removeListener('abort', onImgLoadErrorEvent);
    };

    function updateTitle(dialog, val) {
        dialog.imagesList[getSlectedIndex(dialog)][IMG_PARAM.TITLE] = val;
        // editeSelected(dialog);
    }

    function updateDescription(dialog, val) {
        dialog.imagesList[getSlectedIndex(dialog)][IMG_PARAM.ALT] = val;
        // editeSelected(dialog);
    }

    function previewGallery(dialog) {
        var previewCombo = dialog.getContentElement('gallery-content-id', 'frame-preview-id');
        // var imgCombo = dialog.getContentElement('gallery-content-id', 'img-params-id');
        // imgCombo = getSelect(imgCombo);
        // imgCombo.hide();
        previewCombo = getSelect(previewCombo);
        previewCombo.show();
        updateFramePreview(dialog);
    }

    function feedFrame(frame, data) {
        frame.open();
        frame.writeln(data);
        frame.close();
    }

    // 	function unprotectRealComments( html )
    // 	{
    // 		return html.replace( /<!--\{cke_protected\}\{C\}([\s\S]+?)-->/g,
    // 			function( match, data )
    // 			{
    // 				return decodeURIComponent( data );
    // 			});
    // 	};
    //
    // 	function unprotectSource( html, editor )
    // 	{
    // 		return html.replace( /<!--\{cke_protected\}([\s\S]+?)-->/g, function( match, data )
    // 			{
    // 				return decodeURIComponent( data );
    // 			});
    // 	}

    function updateFramePreview(dialog) {
        var width = 100;
        var height = 300;
        if (dialog.params.getVal('showthumbid') == true) {
            height -= 120;
        } else if (dialog.params.getVal('showcontrolid') == true) {
            height -= 30;
        }
        if (dialog.imagesList.length == 0) {
            return;
        }
        var combo = dialog.getContentElement('gallery-content-id', 'img-items-id');
        var iSelectedIndex = getSelectedIndex(combo);
        if (iSelectedIndex < 0) {
            iSelectedIndex = 0;
        }

        combo = dialog.getContentElement('gallery-content-id', 'frame-preview-id');

        var strVar = "";
        var jqueryStr = '<script src="' + JQUERY_SCRIPT + '" type="text/javascript"></script>';
        strVar += "<head>";
        if (editor.config.galleryDoNotLoadJquery && (editor.config.galleryDoNotLoadJquery == true)) {
            jqueryStr = '';
        }
        strVar += jqueryStr;

        strVar += "<script type=\"text\/javascript\" src=\"" + VIEWER_JS + "\"><\/script>";
        strVar += "<link rel=\"stylesheet\" type=\"text\/css\" href=\"" + VIEWER_CSS + "\" \/>";
        strVar += "<link rel=\"stylesheet\" type=\"text\/css\" href=\"" + GALLERY_CSS + "\" \/>";
        strVar += "<script type=\"text\/javascript\">";
        strVar += createScriptViewerRun(dialog, iSelectedIndex, width, height);
        strVar += "<\/script>";
        strVar += "<\/head>";
        strVar += "<body>";

        var domViewer = createDOMViewerRun(dialog);
        strVar += domViewer.getOuterHtml();

        strVar += "<\/body>";
        strVar += "";

        combo = getSelect(combo);
        var theFrame = combo.getFirst(iFrameItem);
        if (theFrame) {
            theFrame.remove();
        }
        var ifr = null;

        // var w = width + 60;
        var h = height;

        if (dialog.params.getVal('showthumbid') == true) {
            h += 120;
        } else if (dialog.params.getVal('showcontrolid') == true) {
            h += 30;
        }
        var iframe = CKEDITOR.dom.element.createFromHtml('<iframe' +
            ' style="width:' + width + '%;height:' + h + 'px;background:azure; "' +
            ' class="cke_pasteframe"' +
            ' frameborder="10" ' +
            ' allowTransparency="false"' +
            //				' src="' + 'data:text/html;charset=utf-8,' +  strVar + '"' +
            ' role="region"' +
            ' scrolling="no"' +
            '></iframe>');

        iframe.setAttribute('name', 'preview'); // Modifed: totoFrame
        iframe.setAttribute('id', 'preview'); // Modifed: totoFrame
        iframe.on('load', function (event) {
            if (ifr != null) {
                return;
            }
            ifr = this.$;
            var iframedoc;
            if (ifr.contentDocument) {
                iframedoc = ifr.contentDocument;
            } else if (ifr.contentWindow) {
                iframedoc = ifr.contentWindow.document;
            }

            if (iframedoc) {
                // Put the content in the iframe
                feedFrame(iframedoc, strVar);
            } else {
                //just in case of browsers that don't support the above 3 properties.
                //fortunately we don't come across such case so far.
                alert('Cannot inject dynamic contents into iframe.');
            }
        });
        combo.append(iframe);
    }

    function initImgListFromDOM(dialog, galleryContainer) {
        var i, image, src;
        var imgW, imgH;
        var ratio, w, h, ind;
        var arr = galleryContainer.$.getElementsByTagName("img");
        var combo = dialog.getContentElement('gallery-content-id', 'img-items-id');
        for (i = 0; i < arr.length; i += 1) {
            image = arr[i];
            src = image.src;
            // IE Seems sometime to return 0 !!, So natural Width and Height seems OK
            // If not just pput 50, Not as good but not so bad !!
            imgW = image.width;
            if (imgW == 0) {
                imgW = image.naturalWidth;
            }
            if (imgW == 0) {
                imgW = 50;
                imgH = 50;
            } else {
                imgH = image.height;
                if (imgH == 0) {
                    imgH = image.naturalHeight;
                }
                if (imgH == 0) {
                    imgW = 50;
                    imgH = 50;
                }
            }
            ratio = imgW / imgH;
            w = 50;
            h = 50;
            if (ratio > 1) {
                h = h / ratio;
            } else {
                w = w * ratio;
            }
            ind = dialog.imagesList.pushUnique([src, image.title, image.alt, w, h]);
            var oOption;
            if (ind >= 0) {
                oOption = addOption(combo, 'IMG_' + ind + ' : ' + src.substring(src.lastIndexOf('/') + 1), src, dialog.getParentEditor().document);
            }
        }
        // select index 0
        setSelectedIndex(combo, 0);
        // Update dialog
        displaySelected(dialog);
    }

    function initImgListFromFresh(dialog) {
        var combo = dialog.getContentElement('gallery-content-id', 'img-items-id');
        var url = BASE_PATH + 'plugins/gallery/images/placeholder.png';
        var oOption = addOption(combo, 'IMG_0' + ' : ' + url.substring(url.lastIndexOf('/') + 1), url, dialog.getParentEditor().document);
        dialog.imagesList.pushUnique([url, lang.imgTitle, lang.imgDesc, '100', '100']);
        // select index 0
        setSelectedIndex(combo, 0);
        // Update dialog
        displaySelected(dialog);
    }


    function commitGallery(dialog) {
        dialog.galleryDOM.setAttribute('data-' + this.id, this.getValue());
    }

    function loadValue() {
        var dialog = this.getDialog();
        if (dialog.newGalleryMode) {
            // New fresh Gallery so let's put dom data attributes from dialog default values
            dialog.galleryDOM.setAttribute('data-' + this.id, this.getValue());
            switch (this.type) {
                case 'checkbox':
                    break;
                case 'text':
                    break;
                case 'select':
                    break;
                default:
                    break;
            }
        } else {
            // Loaded Gallery, so update Dialog values from DOM data attributes

            switch (this.type) {
                case 'checkbox':
                    this.setValue(dialog.galleryDOM.getAttribute('data-' + this.id) == 'true');
                    break;
                case 'text':
                    this.setValue(dialog.galleryDOM.getAttribute('data-' + this.id));
                    break;
                case 'select':
                    this.setValue(dialog.galleryDOM.getAttribute('data-' + this.id));
                    break;
                default:
                    break;
            }
        }
    }

    function commitValue() {
        var dialog = this.getDialog();
        dialog.params.updateVal(this.id, this.getValue());
        switch (this.type) {
            case 'checkbox':
                break;
            case 'text':
                break;
            case 'select':
                break;
            default:
                break;
        }
        displaySelected(dialog);
    }

    function cleanAll(dialog) {
        if (dialog.previewImage) {
            dialog.previewImage.removeListener('load', onImgLoadEvent);
            dialog.previewImage.removeListener('error', onImgLoadErrorEvent);
            dialog.previewImage.removeListener('abort', onImgLoadErrorEvent);
            dialog.previewImage.remove();
            dialog.previewImage = null;		// Dialog is closed.
        }
        dialog.imagesList = null;
        dialog.params = null;
        dialog.galleryDOM = null;
        var combo = dialog.getContentElement('gallery-content-id', 'img-items-id');
        removeAllOptions(combo);
        dialog.openCloseStep = false;

    }

    function randomChars(len) {
        var chars = '';
        while (chars.length < len) {
            chars += Math.random().toString(36).substring(2);
        }
        // Remove unnecessary additional characters.
        return chars.substring(0, len);
    }

    var numbering = function (id) {
        //return CKEDITOR.tools.getNextId() + '_' + id;
        return 'cke_' + randomChars(8) + '_' + id;
    };

    function getImagesContainerBlock(dialog, dom) {
        var obj = dom.getElementsByTag("ul");
        if (obj == null) {
            return null;
        }
        if (obj.count() == 1) {
            return obj.getItem(0);
        }
        return null;
    }

    function createScriptViewerRun(dialog, iSelectedIndex, width, height) {
        // var galleryid = dialog.params.getVal('galleryid'),
        var strVar = '(function($) {';
        strVar += "$(function() {";
        strVar += createScriptViewerInit(dialog);
        strVar += "});";
        strVar += "})(jQuery);";

        return strVar;
    }

    function createScriptViewerInit(dialog) {
        const viewerOptions = "{ inline: false" +
            ",button: " + dialog.params.getVal('viewerButton') +
            ",interval: " + dialog.params.getVal('viewerInterval') +
            // ",ready() { galleries.full() }" +
            "}";

        var galleryid = dialog.params.getVal('galleryid');
        return "const galleries = new Viewer(document.getElementById('" + galleryid + "_images'), " + viewerOptions + ");";
    }

    function createDOMViewerRun(dialog) {
        var id = dialog.params.getVal('galleryid');
        // var galleryId = 'viewer-gallery_' + id; // REVIEW: Under review
        var displayThumbs = 'display: block;';
        var displayControls = 'display: block;';
        if (dialog.params.getVal('showthumbid') == false) {
            displayThumbs = 'display: none;';
        }
        if (dialog.params.getVal('showcontrolid') == false) {
            displayControls = 'visibility: hidden;';
        }
        var galleryDOM = editor.document.createElement('div');
        galleryDOM.setAttribute('id', id);
        galleryDOM.setAttribute('class', 'galleryPlugin');
        galleryDOM.setAttribute('contenteditable', 'false');

        var ulObj = galleryDOM.append('ul');
        ulObj.setAttribute('id', id + '_images');
        ulObj.setAttribute('class', 'ckeditor-gallery-images clearfix');
        // ulObj.setAttribute('style', 'display:none');

        feedUlWithImages(dialog, ulObj);
        return galleryDOM;
    }

    function feedUlWithImages(dialog, ulObj) {
        var i, liObj, newImgDOM;
        for (i = 0; i < dialog.imagesList.length; i += 1) {
            liObj = ulObj.append('li');
            liObj.setAttribute('contenteditable', 'false');

            newImgDOM = liObj.append('img');
            newImgDOM.setAttribute('src', removeDomainFromUrl(dialog.imagesList[i][IMG_PARAM.URL]));
            newImgDOM.setAttribute('title', dialog.imagesList[i][IMG_PARAM.TITLE]);
            newImgDOM.setAttribute('alt', dialog.imagesList[i][IMG_PARAM.ALT]);
            newImgDOM.setAttribute('contenteditable', 'false');

            // REVIEW:
            // newImgDOM.setAttribute('width', dialog.imagesList[i][IMG_PARAM.WIDTH]);
            // newImgDOM.setAttribute('height', dialog.imagesList[i][IMG_PARAM.HEIGHT]);
        }
    }

    function ClickOkBtn(dialog) {
        var extraStyles = {}, extraAttributes = {};

        dialog.openCloseStep = true;

        // Invoke the commit methods of all dialog elements, so the dialog.params array get Updated.
        dialog.commitContent(dialog);

        // Create a new DOM
        var galleryDOM = createDOMViewerRun(dialog);

        // Add data tags to dom
        var i;
        for (i = 0; i < dialog.params.length; i += 1) {
            galleryDOM.data(dialog.params[i][0], dialog.params[i][1]);
        }
        if (!(editor.config.galleryDoNotLoadJquery && (editor.config.galleryDoNotLoadJquery == true))) {
            var scriptjQuery = CKEDITOR.document.createElement('script', {
                attributes: {
                    type: 'text/javascript',
                    src: JQUERY_SCRIPT
                }
            });
            galleryDOM.append(scriptjQuery);
        }

        // Add javascript for "viewerjs"
        // Be sure the path is correct and file is available !!
        var scriptViewerJs = CKEDITOR.document.createElement('script', {
            attributes: {
                type: 'text/javascript',
                src: VIEWER_JS
            }
        });
        galleryDOM.append(scriptViewerJs);

        // Dynamically add CSS for "viwer init"
        var scriptViewerInit = CKEDITOR.document.createElement('script', {
            attributes: {
                type: 'text/javascript'
            }
        });
        scriptViewerInit.setText(`(function($) { ${createScriptViewerInit(dialog)} })(jQuery);`);
        galleryDOM.append(scriptViewerInit);

        // Dynamically add CSS for "viewerjs"
        // Be sure the path is correct and file is available !!
        var scriptViewerCss = CKEDITOR.document.createElement('script', {
            attributes: {
                type: 'text/javascript'
            }
        });
        scriptViewerCss.setText("(function($) { $('head').append('<link rel=\"stylesheet\" href=\"" + VIEWER_CSS + "\" type=\"text/css\" />'); })(jQuery);");
        galleryDOM.append(scriptViewerCss);

        // Dynamically add CSS for "gallery plugin"
        // Be sure the path is correct and file is available !!
        var scriptGalleryCss = CKEDITOR.document.createElement('script', {
            attributes: {
                type: 'text/javascript'
            }
        });
        scriptGalleryCss.setText("(function($) { $('head').append('<link rel=\"stylesheet\" href=\"" + GALLERY_CSS + "\" type=\"text/css\" />'); })(jQuery);");
        galleryDOM.append(scriptGalleryCss);

        if (dialog.imagesList.length) {
            extraStyles.backgroundImage = 'url("' + dialog.imagesList[0][IMG_PARAM.URL] + '")';
        }
        extraStyles.backgroundSize = 'contain';
        extraStyles.backgroundRepeat = 'no-repeat';
        extraStyles.backgroundPosition = 'center';
        extraStyles.display = 'block';
        extraStyles.width = '64px';
        extraStyles.height = '64px';
        extraStyles.border = '1px solid black';
        // Create a new Fake Image
        var newFakeImage = editor.createFakeElement(galleryDOM, 'cke_gallery', 'gallery', false);
        newFakeImage.setAttributes(extraAttributes);
        newFakeImage.setStyles(extraStyles);

        if (dialog.fakeImage) {
            newFakeImage.replace(dialog.fakeImage);
            editor.getSelection().selectElement(newFakeImage);
        } else {
            editor.insertElement(newFakeImage);
        }

        cleanAll(dialog);
        dialog.hide();
        return true;
    }

    // CKEDITOR DIALOG
    return {
        // Basic properties of the dialog window: title, minimum size.
        title: lang.dialogTitle,
        width: 500,
        height: 600,
        resizable: CKEDITOR.DIALOG_RESIZE_NONE,
        buttons: [
            CKEDITOR.dialog.okButton(editor, {
                id: 'my-ok-btn',
                type: 'button',
                label: 'OK',
                title: lang.validModif,
                accessKey: 'C',
                disabled: false,
                onClick: function () {
                    // code on click
                    ClickOkBtn(this.getDialog());
                }
            }),
            CKEDITOR.dialog.cancelButton,
        ],
        // Dialog window contents definition.
        contents: [
            {
                // Definition of the Basic Settings dialog (page).
                id: 'gallery-content-id',
                label: 'Basic Settings',
                align: 'center',
                // The tab contents.
                elements: [
                    // { // For Text on image
                    //     type: 'text',
                    //     id: 'id',
                    //     label: lang.imgTitle,
                    //     style: 'display:none;',
                    //     onLoad: function () {
                    //         this.getInputElement().setAttribute('readOnly', true);
                    //     }
                    // },
                    { // Short description
                        type: 'text',
                        id: 'txt-url-id',
                        style: 'display:none;',
                        label: lang.imgList,
                        onChange: function () {
                            var dialog = this.getDialog(),
                                newUrl = this.getValue();
                            if (newUrl.length > 0) { //Prevent from load before onShow
                                var preview = dialog.previewImage;
                                preview.on('load', onImgLoadEvent, dialog);
                                preview.on('error', onImgLoadErrorEvent, dialog);
                                preview.on('abort', onImgLoadErrorEvent, dialog);
                                preview.setAttribute('src', newUrl);
                            }
                        }
                    },
                    {
                        type: 'button',
                        id: 'browse',
                        hidden: 'true',
                        style: 'display:inline-block;',
                        filebrowser:
                        {
                            action: 'Browse',
                            target: 'gallery-content-id:txt-url-id',
                            url: editor.config.filebrowserImageBrowseUrl || editor.config.filebrowserBrowseUrl
                        },
                        label: lang.imgAdd
                    },
                    {
                        type: 'vbox',
                        align: 'center',
                        children: [
                            {
                                type: 'html',
                                id: 'frame-preview-id',
                                align: 'center',
                                style: 'width:500px;height:320px',
                                html: ''
                            },
                            {
                                type: 'hbox',
                                align: 'center',
                                height: 150,
                                widths: ['85%', '15%'],
                                children: [
                                    {
                                        type: 'select',
                                        id: 'img-items-id',
                                        label: lang.picturesList,
                                        multiple: false,
                                        items: [],
                                        width: '100%',
                                        style: 'height:125px;',
                                        // onChange: function (api) {
                                        //     //unselectIfNotUnique(this);
                                        //     selectFirstIfNotUnique(this);
                                        // }
                                    },
                                    {
                                        type: 'vbox',
                                        style: 'padding-top: 15px;',
                                        children: [
                                            {
                                                type: 'button',
                                                id: 'rm-selected-btn',
                                                // style: 'margin-left: 15px;',
                                                label: lang.imgDelete,
                                                onClick: function () {
                                                    removeSelected(this.getDialog());
                                                }
                                            },
                                            // {
                                            //     type: 'button',
                                            //     id: 'edit-selected-btn',
                                            //     style: 'margin-left:25px;',
                                            //     //style : 'display:none;',
                                            //     label: lang.imgEdit,
                                            //     onClick: function () {
                                            //         editeSelected(this.getDialog());
                                            //     }
                                            // },
                                            {
                                                type: 'hbox',
                                                children: [
                                                    {
                                                        type: 'button',
                                                        id: 'up-seleced-btn',
                                                        label: lang.imgUp,
                                                        onClick: function () {
                                                            upDownSelected(this.getDialog(), -1);
                                                        }
                                                    },
                                                    {
                                                        type: 'button',
                                                        id: 'down-selected-btn',
                                                        style: 'margin-top: 0;',
                                                        label: lang.imgDown,
                                                        onClick: function () {
                                                            upDownSelected(this.getDialog(), 1);
                                                        }
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                ]
                            },
                            {
                                type: 'hbox',
                                align: 'center',
                                children: [
                                    {
                                        type: 'vbox',
                                        children: [
                                            {
                                                type: 'checkbox',
                                                id: 'viewerButton',
                                                label: lang.viewerButton,
                                                'default': 'checked',
                                                onChange: commitValue,
                                                commit: commitValue,
                                                setup: loadValue
                                            },
                                            {
                                                type: 'checkbox',
                                                id: 'viewerLoading',
                                                label: lang.viewerLoading,
                                                'default': 'checked',
                                                onChange: commitValue,
                                                commit: commitValue,
                                                setup: loadValue
                                            },
                                            {
                                                type: 'checkbox',
                                                id: 'viewerMovable',
                                                label: lang.viewerMovable,
                                                'default': 'checked',
                                                onChange: commitValue,
                                                commit: commitValue,
                                                setup: loadValue
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                type: 'hbox',
                                children: [
                                    {
                                        type: 'text',
                                        id: 'viewerInterval',
                                        label: lang.viewerInterval,
                                        style: 'width:100px;',
                                        maxLength: 4,
                                        'default': '5000',
                                        onChange: function (api) {
                                            var intRegex = /^\d+$/;
                                            if (intRegex.test(this.getValue()) == false) {
                                                this.setValue(5000);
                                            }
                                            this.getDialog().params.updateVal(this.id, this.getValue());
                                            displaySelected(this.getDialog());
                                        },
                                        commit: commitValue,
                                        setup: loadValue
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ],

        onLoad: function () {
        },
        // Invoked when the dialog is loaded.
        onShow: function () {
            this.dialog = this;
            this.galleryDOM = null;
            this.openCloseStep = true;
            this.fakeImage = null;
            var galleryDOM = null;
            this.imagesList = [];
            this.params = [];
            // To get dimensions of poster image
            this.previewImage = editor.document.createElement('img');
            this.okRefresh = true;

            var fakeImage = this.getSelectedElement();
            if (fakeImage && fakeImage.data('cke-real-element-type') && fakeImage.data('cke-real-element-type') == 'gallery') {
                this.fakeImage = fakeImage;
                galleryDOM = editor.restoreRealElement(fakeImage);
            }

            // Create a new <gallery> galleryDOM if it does not exist.
            if (!galleryDOM) {
                this.params.push(['galleryid', numbering('gallery')]);

                // Insert placeHolder image
                initImgListFromFresh(this);
                // Invoke the commit methods of all dialog elements, so the dialog.params array get Updated.
                this.commitContent(this);
            } else {
                this.galleryDOM = galleryDOM;
                // Get the  reference of the gallery Images Container
                var galleryContainer = getImagesContainerBlock(this, galleryDOM);
                if (galleryContainer == null) {
                    alert("BIG Problem galleryContainer !!");
                    return false;
                }
                var galleryid = galleryDOM.getAttribute('id');
                if (galleryid == null) {
                    alert("BIG Problem galleryid !!");
                    return false;
                }
                this.params.push(['galleryid', galleryid]);
                // a DOM has been found updatet images List and Dialog box from this DOM
                initImgListFromDOM(this, galleryContainer);
                // Init params Array from DOM
                // Copy all attributes to an array.
                var domDatas = galleryDOM.$.dataset;
                var param;
                for (param in domDatas) {
                    this.params.push([param, domDatas[param]]);
                }

                // Invoke the setup methods of all dialog elements, to set dialog elements values with DOM input data.
                this.setupContent(this, true);
                updateFramePreview(this);
                this.newGalleryMode = false;
            }
            this.openCloseStep = false;
            previewGallery(this);
        },

        // This method is invoked once a user clicks the OK button, confirming the dialog.
        // I just will return false, as the real OK Button has been redefined
        //  -This was the only way I found to avoid dialog popup to close when hitting the keyboard "ENTER" Key !!
        onOk: function () {
            //			var okr = this.okRefresh;
            //			if (this.okRefresh == true) {
            //				this.okRefresh = false;
            //				this.commitContent(this);
            //				myVar = setTimeout(
            //						function(obj){
            //									obj.okRefresh = true;
            //									},500, this);
            //			}
            return false;
        },

        onHide: function () {
            cleanAll(this);
        }
    };
});
